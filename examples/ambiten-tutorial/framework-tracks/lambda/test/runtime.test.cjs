const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { spawn, execFile } = require("node:child_process");
const { once } = require("node:events");
const { mkdtemp, rm } = require("node:fs/promises");
const { createServer } = require("node:net");
const { tmpdir } = require("node:os");
const { join, resolve, dirname, basename } = require("node:path");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const { MongoClient } = require("mongodb");

let directory, mongod, database, handler, runtime, AmbitenContext, childEnv;
let mongoOutput = "";
let spawnError;
const project = resolve(__dirname, "..");
const temporaryRoot = resolve(tmpdir());

function event(tenantId, method = "GET", input, requestId = `request-${tenantId}`) {
  return {
    version: "2.0", rawPath: "/users", routeKey: `${method} /users`, rawQueryString: "",
    headers: { "x-tenant-id": tenantId, "x-request-id": requestId },
    requestContext: { requestId, http: { method, path: "/users" } },
    body: input === undefined ? undefined : JSON.stringify(input), isBase64Encoded: false
  };
}

async function untilReady(check) {
  const deadline = Date.now() + 45_000;
  let lastError;
  while (Date.now() < deadline) {
    if (spawnError) throw new Error("Install mongod or set MONGOD_BINARY to its executable path.", { cause: spawnError });
    if (mongod.exitCode !== null) throw new Error(mongoOutput);
    try { if (await check()) return; } catch (error) { lastError = error; }
    await delay(200);
  }
  throw new Error(`Temporary MongoDB did not become ready: ${lastError}\n${mongoOutput}`);
}

before(async () => {
  directory = await mkdtemp(join(temporaryRoot, "ambiten-lambda-test-"));
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));

  // This test never connects to an existing MongoDB or reads the user's .env.
  mongod = spawn(process.env.MONGOD_BINARY ?? "mongod", [
    "--bind_ip", "127.0.0.1", "--port", String(port), "--dbpath", directory,
    "--replSet", "lambdaTest", "--quiet"
  ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  mongod.on("error", error => { spawnError = error; });
  for (const stream of [mongod.stdout, mongod.stderr]) {
    stream.on("data", chunk => { mongoOutput = (mongoOutput + chunk).slice(-6000); });
  }
  database = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
  await untilReady(async () => { await database.connect(); return true; });
  await database.db("admin").command({
    replSetInitiate: { _id: "lambdaTest", members: [{ _id: 0, host: `127.0.0.1:${port}` }] }
  });
  await untilReady(async () => (await database.db("admin").command({ hello: 1 })).isWritablePrimary);

  childEnv = {
    ...process.env,
    MONGO_URI: `mongodb://127.0.0.1:${port}/?replicaSet=lambdaTest`,
    TENANT_A_DB: "lambda_test_a", TENANT_B_DB: "lambda_test_b",
    DOTENV_CONFIG_PATH: join(directory, "unused.env"), REDIS_URI: ""
  };
  Object.assign(process.env, childEnv);
  ({ handler } = require("../dist/handler"));
  runtime = require("../dist/runtime");
  ({ AmbitenContext } = require("@ambiten/core"));
  for (const [tenantId, dbName] of Object.entries(runtime.tenantDatabases)) {
    await database.db(dbName).collection("users").insertOne({ name: tenantId, email: `${tenantId}@example.com`, createdAt: new Date() });
    await database.db(dbName).createCollection("audit_logs");
  }
}, { timeout: 60_000 });

after(async () => {
  try { await runtime?.closeRuntime(); }
  finally {
    try { await database?.close(); }
    finally {
      if (mongod?.pid && mongod.exitCode === null && mongod.signalCode === null) {
        const exited = once(mongod, "exit");
        mongod.kill();
        await exited;
      }
      if (directory) {
        const target = resolve(directory);
        assert.equal(dirname(target), temporaryRoot);
        assert(basename(target).startsWith("ambiten-lambda-test-"));
        await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
    }
  }
});

test("concurrent cold invocations isolate tenants and reuse one client per tenant", async () => {
  const clients = new Map();
  await Promise.all(Array.from({ length: 16 }, async (_, index) => {
    const tenantId = index % 2 ? "tenant-a" : "tenant-b";
    const requestId = `concurrent-${index}`;
    const result = await handler(event(tenantId, "GET", undefined, requestId));
    assert.equal(result.statusCode, 200);
    const body = JSON.parse(result.body);
    assert.equal(body.tenantId, tenantId);
    assert.equal(body.requestId, requestId);
    assert.deepEqual(body.users.map(user => user.name), [tenantId]);
    const connection = await runtime.getTenantClient(tenantId);
    if (clients.has(tenantId)) assert.equal(connection, clients.get(tenantId));
    clients.set(tenantId, connection);
  }));
  assert.equal(clients.size, 2);
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("warm invocations keep fresh request identity and normalize header names", async () => {
  const first = event("tenant-a");
  first.headers = { "X-Tenant-ID": "tenant-a" };
  const a = JSON.parse((await handler(first)).body);
  const b = JSON.parse((await handler(first)).body);
  assert.match(a.requestId, /^[0-9a-f-]{36}$/);
  assert.notEqual(a.requestId, b.requestId);
  assert.notEqual(a.requestId, first.requestContext.requestId);
  assert.equal(a.tenantId, "tenant-a");
  const v1 = { path: "/users", httpMethod: "GET", headers: { "x-tenant-id": "tenant-b", "x-request-id": "v1" } };
  assert.equal(JSON.parse((await handler(v1)).body).requestId, "v1");
});

test("missing/unknown tenants and infrastructure overrides are rejected", async () => {
  await assert.rejects(() => handler(event(undefined)), /Tenant resolution failed/);
  await assert.rejects(() => handler(event("tenant-unknown")), /Invalid tenant ID/);
  for (const name of ["X-DB-Name", "x-collection-name"]) {
    const input = event("tenant-a");
    input.headers[name] = "other_tenant_data";
    await assert.rejects(() => handler(input), /server-owned/);
  }
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("explicit transaction shares the session across models and commits both writes", async () => {
  const { UserModel } = require("../dist/user.model");
  const { AuditLogModel } = require("../dist/audit-log.model");
  const sessions = [];
  const originals = [UserModel.create, AuditLogModel.create];
  for (const model of [UserModel, AuditLogModel]) {
    const original = model.create;
    model.create = async function (...args) {
      const ctx = AmbitenContext.get();
      assert.equal(ctx.tenantId, "tenant-a");
      assert.equal(ctx.session?.inTransaction(), true);
      sessions.push(ctx.session);
      return original.apply(this, args);
    };
  }
  try {
    const result = await handler(event("tenant-a", "POST", { name: "Committed", email: "commit@example.com" }));
    assert.equal(result.statusCode, 201);
    const body = JSON.parse(result.body);
    assert.equal(body.user.email, "commit@example.com");
    assert.equal(body.audit.userEmail, body.user.email);
    assert(sessions.length >= 2);
    assert.equal(new Set(sessions).size, 1);
    const db = database.db(runtime.tenantDatabases["tenant-a"]);
    assert.equal(await db.collection("users").countDocuments({ email: "commit@example.com" }), 1);
    assert.equal(await db.collection("audit_logs").countDocuments({ userEmail: "commit@example.com" }), 1);
    assert.equal(await database.db(runtime.tenantDatabases["tenant-b"]).collection("users").countDocuments({ email: "commit@example.com" }), 0);
  } finally {
    [UserModel.create, AuditLogModel.create] = originals;
  }
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("failure after both writes rolls back both collections and does not taint the next invocation", async () => {
  await assert.rejects(() => handler(event("tenant-b", "POST", {
    name: "Rollback", email: "rollback@example.com", simulateFailure: true
  })), /Intentional transaction failure/);
  const db = database.db(runtime.tenantDatabases["tenant-b"]);
  assert.equal(await db.collection("users").countDocuments({ email: "rollback@example.com" }), 0);
  assert.equal(await db.collection("audit_logs").countDocuments({ userEmail: "rollback@example.com" }), 0);
  const body = JSON.parse((await handler(event("tenant-a", "GET", undefined, "after-rollback"))).body);
  assert.equal(body.requestId, "after-rollback");
  assert.equal(body.tenantId, "tenant-a");
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("payload validation, base64 events, and unknown routes behave explicitly", async () => {
  await assert.rejects(() => handler(event("tenant-a", "POST", { email: "bad" })), /non-empty name/);
  const malformed = event("tenant-a", "POST");
  malformed.body = "not-json";
  await assert.rejects(() => handler(malformed), /JSON object/);
  const base64 = event("tenant-b", "POST", { name: "Encoded", email: "encoded@example.com" });
  base64.body = Buffer.from(base64.body).toString("base64");
  base64.isBase64Encoded = true;
  assert.equal((await handler(base64)).statusCode, 201);
  const unknown = event("tenant-a");
  unknown.rawPath = "/unknown";
  assert.equal((await handler(unknown)).statusCode, 404);
});

test("source and built local runners complete and close their connections", { timeout: 120_000 }, async () => {
  const run = async args => (await promisify(execFile)(process.execPath, args, {
    cwd: project, env: childEnv, windowsHide: true, timeout: 45_000
  })).stdout;
  const source = await run(["--import", "tsx", "src/invoke.ts", "read"]);
  assert.equal((source.match(/"statusCode": 200/g) ?? []).length, 2);
  const created = await run(["dist/invoke.js", "create"]);
  assert.equal((created.match(/"statusCode": 201/g) ?? []).length, 2);
  const beforeCounts = await Promise.all(Object.values(runtime.tenantDatabases).map(name => database.db(name).collection("users").countDocuments()));
  const rollback = await run(["dist/invoke.js", "rollback"]);
  assert.equal((rollback.match(/"expectedError": "Intentional transaction failure\."/g) ?? []).length, 2);
  const afterCounts = await Promise.all(Object.values(runtime.tenantDatabases).map(name => database.db(name).collection("users").countDocuments()));
  assert.deepEqual(afterCounts, beforeCounts);
});
