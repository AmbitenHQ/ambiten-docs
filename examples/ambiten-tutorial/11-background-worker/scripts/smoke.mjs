import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { MongoClient } from "mongodb";

// Never uses .env or a running database: every run owns a temporary replica set.
const project = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = resolve(tmpdir());
const databasePath = await mkdtemp(join(temporaryRoot, "ambiten-tutorial-11-"));
const children = [];
let database;
let applicationClient;
let closeTenants;

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function launch(command, args, env = process.env) {
  const child = spawn(command, args, {
    cwd: project, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
  });
  const state = { child, output: "", error: undefined };
  child.on("error", error => { state.error = error; });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", data => { state.output = (state.output + data).slice(-12000); });
  }
  children.push(state);
  return state;
}

async function untilReady(check, state, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    if (state?.error) throw state.error;
    if (state && state.child.exitCode !== null) throw new Error(state.output);
    try { if (await check()) return; } catch (error) { lastError = error; }
    await delay(200);
  }
  throw new Error(`Readiness timed out: ${lastError ?? "not ready"}\n${state?.output ?? ""}`);
}

async function finishProcess(state) {
  await untilReady(() => state.error || state.child.exitCode !== null || state.child.signalCode !== null, undefined);
  if (state.error) throw state.error;
  return state;
}

function assertSummary(result, tenant, jobId, expectedCount) {
  assert.equal(result.jobId, jobId);
  assert.equal(result.tenantId, tenant);
  assert.equal(result.requestId, `job-${jobId}`);
  assert.equal(result.contextPreserved, true);
  assert.equal(result.userCount, expectedCount);
  assert.deepEqual(result.signals, [{
    status: "success", requestId: `job-${jobId}`, tenantId: tenant,
    operation: "find", collectionName: "users"
  }]);
}

async function main() {
  const mongoPort = await freePort();
  const apiPort = await freePort();
  const uri = `mongodb://127.0.0.1:${mongoPort}/?replicaSet=tutorial11`;
  const mongo = launch(process.env.MONGOD_BINARY ?? "mongod", [
    "--bind_ip", "127.0.0.1", "--port", String(mongoPort),
    "--dbpath", databasePath, "--replSet", "tutorial11", "--quiet"
  ]);
  database = new MongoClient(`mongodb://127.0.0.1:${mongoPort}/?directConnection=true`, {
    serverSelectionTimeoutMS: 1000
  });
  await untilReady(async () => { await database.connect(); return true; }, mongo);
  await database.db("admin").command({
    replSetInitiate: { _id: "tutorial11", members: [{ _id: 0, host: `127.0.0.1:${mongoPort}` }] }
  });
  await untilReady(async () => (await database.db("admin").command({ hello: 1 })).isWritablePrimary, mongo);

  const env = {
    ...process.env,
    MONGO_URI: uri,
    DB_NAME: "ambiten_tutorial",
    PORT: String(apiPort),
    REDIS_URI: "",
    DOTENV_CONFIG_PATH: join(databasePath, "no-environment-file.env")
  };
  const app = launch(process.execPath, ["--import", "tsx", "dist/index.js"], env);
  const origin = `http://127.0.0.1:${apiPort}`;
  await untilReady(async () => (await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1500) })).ok, app);

  async function request(path, tenant = "tenant-a", method = "GET", body, expected = 200, requestId = "smoke-a") {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-tenant-id": tenant, "x-request-id": requestId },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    const text = await response.text();
    assert.equal(response.status, expected, `${method} ${path}: ${text}`);
    return text ? JSON.parse(text) : undefined;
  }

  for (const tenant of ["tenant-a", "tenant-b"]) {
    const user = await request("/users", tenant, "POST", { name: tenant, email: "  SHARED@EXAMPLE.COM  " }, 201);
    assert.equal(user.email, "shared@example.com");
    assert.equal(user.isDeleted, false);
    assert.ok(user.createdAt);
    const infrastructure = await request("/tenant/infrastructure", tenant);
    assert.equal(infrastructure.resolvedDbName, `ambiten_tutorial_${tenant.replace("-", "_")}`);
    assert.equal(infrastructure.connected, true);
  }
  await Promise.all(Array.from({ length: 8 }, async (_, index) => {
    const tenant = index % 2 ? "tenant-b" : "tenant-a";
    const requestId = `concurrent-${index}`;
    const result = await request("/instrumentation/users", tenant, "GET", undefined, 200, requestId);
    assert.deepEqual(result.execution, { tenantId: tenant, requestId });
    assert.deepEqual(result.users.map(user => user.name), [tenant]);
    assert.deepEqual(result.signals, [{ status: "success", tenantId: tenant, requestId, operation: "find", collectionName: "users" }]);
  }));
  console.log("PASS: HTTP instrumentation, populated signals, and concurrent tenant/request isolation");

  await request("/users/shared@example.com", "tenant-a", "PATCH", { name: "Updated" });
  await request("/users/soft-delete/shared@example.com", "tenant-a", "DELETE");
  assert.equal((await request("/instrumentation/users")).users.length, 0);
  assert.equal((await request("/users/deleted")).users.length, 1);
  assert.equal((await request("/users/with-deleted")).users.length, 1);
  await request("/users/restore/shared@example.com", "tenant-a", "POST");
  assert.equal((await request("/instrumentation/users")).users[0].name, "Updated");
  await request("/users/shared@example.com", "tenant-a", "DELETE", undefined, 204);
  await request("/users/purge/shared@example.com", "tenant-a", "DELETE");
  assert.equal((await request("/users/with-deleted")).users.length, 0);
  assert.equal((await request("/instrumentation/users", "tenant-b")).users.length, 1);
  console.log("PASS: normalization, CRUD, soft delete, restore, purge, and tenant separation");

  const transaction = await request("/users/transactional", "tenant-b", "POST", { name: "Committed", email: "commit@example.com" }, 201);
  assert.equal(transaction.transaction.sessionActive, true);
  assert.equal(transaction.transaction.tenantId, "tenant-b");
  await request("/users/transactional", "tenant-b", "POST", { name: "Rolled back", email: "rollback@example.com", simulateFailure: true }, 500);
  const tenantDb = database.db("ambiten_tutorial_tenant_b");
  assert.equal(await tenantDb.collection("users").countDocuments({ email: "commit@example.com" }), 1);
  assert.equal(await tenantDb.collection("audit_logs").countDocuments({ userEmail: "commit@example.com" }), 1);
  assert.equal(await tenantDb.collection("users").countDocuments({ email: "rollback@example.com" }), 0);
  assert.equal(await tenantDb.collection("audit_logs").countDocuments({ userEmail: "rollback@example.com" }), 0);
  console.log("PASS: inherited transaction commit and rollback");

  // Distinct visible counts prove tenant routing; hidden records prove shared policy.
  await database.db("ambiten_tutorial_tenant_a").collection("users").insertMany([
    { name: "Worker A1", email: "a1@example.com", isDeleted: false },
    { name: "Worker A2", email: "a2@example.com", isDeleted: false },
    { name: "Worker A3", email: "a3@example.com", isDeleted: false },
    { name: "Hidden A", email: "hidden-a@example.com", isDeleted: true }
  ]);
  await tenantDb.collection("users").insertOne({ name: "Hidden B", email: "hidden-b@example.com", isDeleted: true });

  for (const entry of ["src/worker.ts", "dist/worker.js"]) {
    const worker = await finishProcess(launch(process.execPath, ["--import", "tsx", entry], env));
    assert.equal(worker.child.exitCode, 0, worker.output);
    const results = [...worker.output.matchAll(/^\{\r?\n  "jobId":[\s\S]*?^\}/gm)].map(match => JSON.parse(match[0]));
    assert.equal(results.length, 2, worker.output);
    assertSummary(results[0], "tenant-a", "tenant-a-users", 3);
    assertSummary(results[1], "tenant-b", "tenant-b-users", 2);
    console.log(`PASS: ${entry} job summaries, tenant counts, soft-delete policy, query signals, and clean exit`);
  }

  const unusedPort = await freePort();
  const failedStartup = await finishProcess(launch(process.execPath, ["--import", "tsx", "dist/worker.js"], {
    ...env, MONGO_URI: `mongodb://127.0.0.1:${unusedPort}`
  }));
  assert.equal(failedStartup.child.exitCode, 1, failedStartup.output);
  assert.match(failedStartup.output, /Worker failed:/);
  assert.ok(!failedStartup.output.includes("Processing tenant-"));
  console.log("PASS: failed worker startup cleans up and exits nonzero");

  // Exercise the helper's error path and restoration without adding a demo-failure HTTP route.
  Object.assign(process.env, env);
  const { AmbitenContext } = await import("@ambiten/core");
  const { withQueryObservation } = await import("../dist/instrumentation/query-observer.js");
  const { UserModel } = await import("../dist/models/user.model.js");
  const { client } = await import("../dist/core/db.js");
  const tenancy = await import("../dist/core/tenancy.js");
  applicationClient = client;
  closeTenants = tenancy.closeTutorialTenants;
  tenancy.registerTutorialTenants();
  await client.connect();
  const { configureUserLifecycle } = await import("../dist/policies/user-lifecycle.js");
  configureUserLifecycle();
  const { processJob, jobs } = await import("../dist/worker.js");
  const expectedCounts = { "tenant-a": 3, "tenant-b": 2 };
  for (const job of jobs) {
    assertSummary(await processJob(job), job.tenantId, job.id, expectedCounts[job.tenantId]);
    assert.equal(AmbitenContext.hasActiveContext(), false);
  }
  await Promise.all(Array.from({ length: 8 }, async (_, index) => {
    const job = { ...jobs[index % 2], id: `parallel-${index}` };
    assertSummary(await processJob(job), job.tenantId, job.id, expectedCounts[job.tenantId]);
  }));
  await assert.rejects(processJob({ id: "unknown", tenantId: "unregistered", type: "USER_SUMMARY" }), /tenant/i);
  await AmbitenContext.run({ tenantId: "request-tenant", requestId: "request-id" }, async () => {
    await assert.rejects(processJob(jobs[0]), /outside an existing execution context/);
    assert.equal(AmbitenContext.get().tenantId, "request-tenant");
    assert.equal(AmbitenContext.get().requestId, "request-id");
  });
  assert.equal(AmbitenContext.hasActiveContext(), false);
  console.log("PASS: concurrent worker scopes, context restoration, unknown tenants, and inherited-context rejection");

  const session = database.startSession();
  const parentObserver = { onQuery() {} };
  const expectedError = new Error("Intentional middleware rejection");
  UserModel.beforeFind(async () => { throw expectedError; });
  const captured = [];
  const originalError = console.error;
  try {
    console.error = (...args) => { captured.push(args); };
    await AmbitenContext.run({ tenantId: "tenant-a", requestId: "failure-check", session, observer: parentObserver }, async () => {
      await assert.rejects(withQueryObservation(async () => {
        assert.equal(AmbitenContext.get().session, session);
        return UserModel.find({});
      }), error => error === expectedError);
      assert.equal(AmbitenContext.get().observer, parentObserver);
      assert.equal(AmbitenContext.get().session, session);
    });
  } finally {
    console.error = originalError;
    await session.endSession();
  }
  assert.equal(AmbitenContext.hasActiveContext(), false);
  assert.deepEqual(captured, [["[ambiten query error]", {
    status: "error", tenantId: "tenant-a", requestId: "failure-check",
    operation: "find", collectionName: "users", error: expectedError.message
  }]]);
  console.log("PASS: query error observer, original rejection, session preservation, and parent context restoration");

  captured.length = 0;
  try {
    console.error = (...args) => { captured.push(args); };
    await assert.rejects(processJob({ ...jobs[0], id: "failed-job" }), error => error === expectedError);
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(captured, [["[ambiten query error]", {
    status: "error", tenantId: "tenant-a", requestId: "job-failed-job",
    operation: "find", collectionName: "users", error: expectedError.message
  }]]);
  assert.equal(AmbitenContext.hasActiveContext(), false);
  console.log("PASS: worker query failures preserve the original error and emit a job-correlated signal");
}

let exitCode = 0;
try {
  await main();
} catch (error) {
  exitCode = 1;
  console.error(error);
  for (const state of children) console.error(state.output.slice(-3000));
} finally {
  await closeTenants?.();
  await applicationClient?.close();
  await database?.close();
  for (const { child } of children.reverse()) {
    if (child.exitCode === null && child.signalCode === null && child.pid) {
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
    }
  }
  // Only this run's verified, dedicated temporary directory can be removed.
  assert.equal(dirname(resolve(databasePath)), temporaryRoot);
  assert.ok(basename(databasePath).startsWith("ambiten-tutorial-11-"));
  await rm(databasePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  console.log("Removed this run's temporary MongoDB data; existing databases were not used.");
}
// The published core imports background library timers; all test resources above are closed.
process.exit(exitCode);
