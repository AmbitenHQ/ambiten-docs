const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { mkdtemp, rm } = require("node:fs/promises");
const { createServer } = require("node:net");
const { tmpdir } = require("node:os");
const { join, resolve, dirname, basename } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const { MongoClient } = require("mongodb");

let directory, mongod, database, runtime, AmbitenContext, childEnv, UserModel, AuditLogModel;
const servers = {};
let mongoOutput = "";
let spawnError;
const project = resolve(__dirname, "..");
const temporaryRoot = resolve(tmpdir());
const query = "{ first: runtime { tenantId requestId applicationName } users { _id name email } second: runtime { tenantId requestId } }";
const create = "mutation($input: CreateUserInput!) { createUser(input: $input) { _id name email } }";
const audited = "mutation($input: CreateUserInput!, $fail: Boolean!) { createUserWithAudit(input: $input, simulateFailure: $fail) { _id name email } }";

async function request(url, tenantId, document = query, variables, extraHeaders = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(tenantId ? { "x-tenant-id": tenantId } : {}), ...extraHeaders },
    body: JSON.stringify({ query: document, variables }),
    signal: AbortSignal.timeout(30_000)
  });
  return { status: response.status, body: await response.json() };
}

function data(result) {
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.errors, undefined, JSON.stringify(result.body.errors));
  return result.body.data;
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
  directory = await mkdtemp(join(temporaryRoot, "ambiten-graphql-test-"));
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));

  // Never connect to an existing database or load the developer's .env.
  mongod = spawn(process.env.MONGOD_BINARY ?? "mongod", [
    "--bind_ip", "127.0.0.1", "--port", String(port), "--dbpath", directory,
    "--replSet", "graphqlTest", "--quiet"
  ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  mongod.on("error", error => { spawnError = error; });
  for (const stream of [mongod.stdout, mongod.stderr]) {
    stream.on("data", chunk => { mongoOutput = (mongoOutput + chunk).slice(-6000); });
  }
  database = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
  await untilReady(async () => { await database.connect(); return true; });
  await database.db("admin").command({
    replSetInitiate: { _id: "graphqlTest", members: [{ _id: 0, host: `127.0.0.1:${port}` }] }
  });
  await untilReady(async () => (await database.db("admin").command({ hello: 1 })).isWritablePrimary);

  childEnv = {
    ...process.env,
    MONGO_URI: `mongodb://127.0.0.1:${port}/?replicaSet=graphqlTest`,
    TENANT_A_DB: "graphql_test_a", TENANT_B_DB: "graphql_test_b",
    DOTENV_CONFIG_PATH: join(directory, "unused.env"), REDIS_URI: "",
    APOLLO_PORT: "0", YOGA_PORT: "0"
  };
  Object.assign(process.env, childEnv);
  runtime = require("../dist/shared/runtime");
  ({ AmbitenContext } = require("@ambiten/core"));
  ({ UserModel } = require("../dist/shared/user.model"));
  ({ AuditLogModel } = require("../dist/shared/audit-log.model"));
  for (const [tenantId, dbName] of Object.entries(runtime.tenantDatabases)) {
    await database.db(dbName).collection("users").insertOne({ name: tenantId, email: `${tenantId}@example.com`, createdAt: new Date() });
    await database.db(dbName).createCollection("audit_logs");
  }
  servers.apollo = await require("../dist/apollo").startApollo(0);
  servers.yoga = await require("../dist/yoga").startYoga(0);
}, { timeout: 120_000 });

after(async () => {
  try {
    const stopped = await Promise.allSettled(Object.values(servers).map(server => server.stop()));
    for (const result of stopped) if (result.status === "rejected") console.error(result.reason);
    await runtime?.closeRuntime();
    assert(stopped.every(result => result.status === "fulfilled"), "An HTTP server did not drain.");
  } finally {
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
        assert(basename(target).startsWith("ambiten-graphql-test-"));
        await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
    }
  }
});

test("published 1.0.2 factories scope construction, not later resolver execution", async () => {
  const { graphql, buildSchema } = require("graphql");
  const { createApolloContextFactory, createYogaContextFactory } = require("@ambiten/adapter-graphql");
  const schema = buildSchema("type Query { active: Boolean! }");
  const factories = [
    [createApolloContextFactory, { req: { headers: { "x-tenant-id": "tenant-a" } } }],
    [createYogaContextFactory, { request: new Request("http://localhost/graphql", { headers: { "x-tenant-id": "tenant-a" } }) }]
  ];
  for (const [factory, input] of factories) {
    const contextValue = await factory({ tenancy: { header: "x-tenant-id" } })(input);
    assert.equal(contextValue.tenantId, "tenant-a");
    assert.equal(AmbitenContext.hasActiveContext(), false);
    const result = await graphql({
      schema, source: "{ active }", contextValue,
      rootValue: { active: () => AmbitenContext.hasActiveContext() }
    });
    assert.equal(result.data.active, false);
  }
});

test("concurrent requests across both hosts preserve scope through awaited model calls", async () => {
  const original = UserModel.find;
  const seen = [];
  UserModel.find = async function (...args) {
    assert.equal(AmbitenContext.hasActiveContext(), true);
    const before = AmbitenContext.get();
    await delay(5);
    assert.equal(AmbitenContext.get(), before);
    assert.equal(before.session, undefined);
    seen.push(before.requestId);
    return original.apply(this, args);
  };
  try {
    const results = await Promise.allSettled(Array.from({ length: 20 }, async (_, index) => {
      const host = index % 2 ? "apollo" : "yoga";
      const tenantId = index % 3 ? "tenant-a" : "tenant-b";
      const requestId = `concurrent-${index}`;
      const result = data(await request(servers[host].url, tenantId, query, undefined, { "x-request-id": requestId }));
      assert.equal(result.first.tenantId, tenantId);
      assert.equal(result.first.requestId, requestId);
      assert.equal(result.first.applicationName, "ambiten-graphql-track");
      assert.deepEqual(result.second, { tenantId, requestId });
      assert.deepEqual(result.users.map(user => user.name), [tenantId]);
      assert.match(result.users[0]._id, /^[0-9a-f]{24}$/);
    }));
    for (const result of results) if (result.status === "rejected") throw result.reason;
    assert.equal(new Set(seen).size, 20);
  } finally { UserModel.find = original; }
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

for (const host of ["apollo", "yoga"]) {
  test(`${host}: warm operations get fresh IDs and preserve ordinary GraphQL context`, async () => {
    const first = data(await request(servers[host].url, "tenant-a"));
    const second = data(await request(servers[host].url, undefined, query, undefined, { "X-Tenant-ID": "tenant-b" }));
    assert.match(first.first.requestId, /^[0-9a-f-]{36}$/);
    assert.notEqual(first.first.requestId, second.first.requestId);
    assert.equal(second.first.tenantId, "tenant-b");
    assert.equal(second.first.requestId, second.second.requestId);
    assert.equal(second.first.applicationName, "ambiten-graphql-track");
    assert.equal(await runtime.getTenantClient("tenant-a"), await runtime.getTenantClient("tenant-a"));
  });

  test(`${host}: missing/unknown tenants and infrastructure overrides fail closed`, async () => {
    for (const [tenant, headers] of [
      [undefined, {}], ["unknown", {}],
      ["tenant-a", { "X-DB-Name": "graphql_test_b" }],
      ["tenant-a", { "X-Collection-Name": "audit_logs" }]
    ]) {
      const result = await request(servers[host].url, tenant, query, undefined, headers);
      assert(result.body.errors?.length, JSON.stringify(result));
      assert(!result.body.data);
    }
    assert.equal(AmbitenContext.hasActiveContext(), false);
  });

  test(`${host}: ordinary create is visible from the other server only for its tenant`, async () => {
    const email = `${host}-plain@example.com`;
    const result = data(await request(servers[host].url, "tenant-a", create, { input: { name: "GraphQL User", email } }));
    assert.match(result.createUser._id, /^[0-9a-f]{24}$/);
    const other = host === "apollo" ? "yoga" : "apollo";
    const a = data(await request(servers[other].url, "tenant-a"));
    const b = data(await request(servers[other].url, "tenant-b"));
    assert(a.users.some(user => user.email === email));
    assert(!b.users.some(user => user.email === email));
    assert.equal(await database.db(runtime.tenantDatabases["tenant-a"]).collection("audit_logs").countDocuments({ userId: result.createUser._id }), 0);
  });

  test(`${host}: user and audit share a session and commit together`, async () => {
    const email = `${host}-commit@example.com`;
    const sessions = [];
    const originals = [UserModel.create, AuditLogModel.create];
    for (const model of [UserModel, AuditLogModel]) {
      const original = model.create;
      model.create = async function (...args) {
        await delay(1);
        const ctx = AmbitenContext.get();
        assert.equal(ctx.tenantId, "tenant-b");
        assert.equal(ctx.session?.inTransaction(), true);
        sessions.push(ctx.session);
        return original.apply(this, args);
      };
    }
    try {
      const result = data(await request(servers[host].url, "tenant-b", audited, {
        input: { name: "Committed", email }, fail: false
      }));
      assert(sessions.length >= 2);
      assert.equal(new Set(sessions).size, 1);
      const db = database.db(runtime.tenantDatabases["tenant-b"]);
      assert.equal(await db.collection("users").countDocuments({ email }), 1);
      assert.equal(await db.collection("audit_logs").countDocuments({ userId: result.createUserWithAudit._id, action: "USER_CREATED" }), 1);
      assert.equal(await database.db(runtime.tenantDatabases["tenant-a"]).collection("users").countDocuments({ email }), 0);
    } finally { [UserModel.create, AuditLogModel.create] = originals; }
    assert.equal(AmbitenContext.hasActiveContext(), false);
  });

  test(`${host}: failure after both writes rolls back and the next operation is clean`, async () => {
    const db = database.db(runtime.tenantDatabases["tenant-b"]);
    const beforeAudits = await db.collection("audit_logs").countDocuments();
    const email = `${host}-rollback@example.com`;
    const result = await request(servers[host].url, "tenant-b", audited, {
      input: { name: "Rollback", email }, fail: true
    });
    assert.equal(result.body.errors?.[0].extensions.code, "DEMO_ROLLBACK");
    assert.equal(result.body.data, null);
    assert.equal(await db.collection("users").countDocuments({ email }), 0);
    assert.equal(await db.collection("audit_logs").countDocuments(), beforeAudits);
    const next = data(await request(servers[host].url, "tenant-a", query, undefined, { "x-request-id": "after-rollback" }));
    assert.equal(next.first.requestId, "after-rollback");
    assert.equal(next.first.tenantId, "tenant-a");
    assert.equal(AmbitenContext.hasActiveContext(), false);
  });

  test(`${host}: input validation and GraphQL validation reject invalid mutations`, async () => {
    const result = await request(servers[host].url, "tenant-a", create, { input: { name: " ", email: "invalid" } });
    assert.equal(result.body.errors?.[0].extensions.code, "BAD_USER_INPUT");
    const invalid = await request(servers[host].url, "tenant-a", "{ missingField }");
    assert(invalid.body.errors?.length);
    assert(!invalid.body.data);
  });
}

test("shared schema refuses execution without the captured boundary", async () => {
  const { graphql } = require("graphql");
  const { schema } = require("../dist/shared/schema");
  const result = await graphql({ schema, source: "{ runtime { tenantId } }", contextValue: {} });
  assert.match(result.errors?.[0].message ?? "", /Missing Ambiten resolver execution boundary/);
  assert.equal(result.data, null);
});

test("source and compiled CLI launchers serve the same operation", { timeout: 180_000 }, async () => {
  for (const host of ["apollo", "yoga"]) {
    for (const source of [true, false]) {
      const args = source ? ["--import", "tsx", `src/${host}.ts`] : [`dist/${host}.js`];
      const child = spawn(process.execPath, args, { cwd: project, env: childEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      let output = "", error;
      child.on("error", value => { error = value; });
      for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { output = (output + chunk).slice(-6000); });
      try {
        const deadline = Date.now() + 40_000;
        let url;
        while (Date.now() < deadline && !url) {
          if (error) throw error;
          if (child.exitCode !== null) throw new Error(output);
          url = output.match(/ready at (http:\/\/[^\s]+)/)?.[1];
          if (!url) await delay(100);
        }
        assert(url, `Launcher did not become ready: ${output}`);
        assert.equal(data(await request(url, "tenant-a")).first.tenantId, "tenant-a");
      } finally {
        if (child.pid && child.exitCode === null && child.signalCode === null) {
          const exited = once(child, "exit");
          child.kill();
          await exited;
        }
      }
    }
  }
});
