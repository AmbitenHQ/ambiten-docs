import assert from "node:assert/strict";
import { setImmediate as nextTurn } from "node:timers/promises";
import { MultiTenantManager, AmbitenContext } from "@ambiten/core";
import { client } from "../dist/core/db.js";
import * as runtime from "../dist/runtime/runtime.js";

// Each scenario runs in a separate process against the smoke test's database.
const scenario = process.argv[2];
let api;
let releaseRequest;

async function main() {
  assert.equal(await runtime.checkRuntimeReadiness(), false);

  if (scenario === "startup-race") {
    let releaseConnect;
    const gate = new Promise(resolve => { releaseConnect = resolve; });
    const originalConnect = client.connect.bind(client);
    client.connect = async () => { await gate; return originalConnect(); };
    const initializing = runtime.initializeRuntime();
    const rejected = assert.rejects(initializing, /shutdown began during initialization/);
    const closing = runtime.shutdownRuntime();
    assert.equal(runtime.shutdownRuntime(), closing);
    releaseConnect();
    await rejected;
    await closing;
    assert.equal(runtime.getRuntimeStatus().initialized, false);
    assert.equal(runtime.getRuntimeStatus().tenants.registered, 0);
    assert.equal(await runtime.checkRuntimeReadiness(), false);
    return;
  }

  let connectCalls = 0;
  const originalConnect = client.connect.bind(client);
  client.connect = async () => { connectCalls++; return originalConnect(); };
  const first = runtime.initializeRuntime();
  assert.equal(runtime.initializeRuntime(), first);
  await Promise.all([first, runtime.initializeRuntime()]);
  assert.equal(connectCalls, 1);
  assert.equal(AmbitenContext.hasActiveContext(), false);
  assert.deepEqual(runtime.getRuntimeStatus(), {
    initialized: true, shuttingDown: false, tenants: { registered: 2, connected: 0 }
  });
  assert.equal(await runtime.checkRuntimeReadiness(), true);

  let baseCloseCalls = 0;
  const originalClose = client.close.bind(client);
  client.close = async () => { baseCloseCalls++; return originalClose(); };

  if (scenario === "cleanup-failure") {
    const closeCalls = [];
    for (const id of ["tenant-a", "tenant-b"]) {
      const tenantClient = await MultiTenantManager.getClient(id);
      const close = tenantClient.close.bind(tenantClient);
      tenantClient.close = async () => {
        closeCalls.push(id);
        await close();
        if (id === "tenant-a") throw new Error("Simulated tenant close failure");
      };
    }
    const closing = runtime.shutdownRuntime();
    assert.equal(runtime.shutdownRuntime(), closing);
    await assert.rejects(closing, AggregateError);
    assert.deepEqual(closeCalls.sort(), ["tenant-a", "tenant-b"]);
    assert.equal(baseCloseCalls, 1);
    assert.equal(runtime.getRuntimeStatus().initialized, false);
    assert.equal(runtime.getRuntimeStatus().tenants.registered, 0);
    await assert.rejects(runtime.shutdownRuntime(), AggregateError);
    assert.equal(baseCloseCalls, 1);
    return;
  }

  if (scenario.startsWith("http-drain-")) {
    const signal = scenario.slice("http-drain-".length);
    const originalListeners = {
      SIGINT: process.listenerCount("SIGINT"),
      SIGTERM: process.listenerCount("SIGTERM")
    };
    const { startApi } = await import("../dist/index.js");
    api = await startApi();
    const origin = `http://127.0.0.1:${api.server.address().port}`;
    assert.equal((await fetch(`${origin}/ready`)).status, 200);
    const originalDb = client.db.bind(client);
    client.db = async () => { throw new Error("Simulated database outage"); };
    try {
      const readiness = await fetch(`${origin}/ready`);
      assert.equal(readiness.status, 503);
      assert.equal((await readiness.json()).ready, false);
      assert.equal((await fetch(`${origin}/health`)).status, 200);
    } finally {
      client.db = originalDb;
    }

    let requestStarted;
    const started = new Promise(resolve => { requestStarted = resolve; });
    const release = new Promise(resolve => { releaseRequest = resolve; });
    // Only the test fixture adds this route; it is absent from the application.
    api.app.get("/__smoke__/slow", async (_req, res) => {
      requestStarted();
      await release;
      res.json({ completed: true });
    });
    const pending = fetch(`${origin}/__smoke__/slow`, { headers: { "x-tenant-id": "tenant-a" } });
    await started;
    // Windows cannot deliver Unix signals through child.kill; emit the registered
    // Node signal event to exercise the same handler and HTTP drain code there.
    process.emit(signal);
    const closing = api.shutdown("repeated cleanup");
    assert.equal(api.shutdown("another cleanup"), closing);
    await nextTurn();
    assert.equal(runtime.getRuntimeStatus().shuttingDown, true);
    assert.equal(await runtime.checkRuntimeReadiness(), false);
    assert.equal(baseCloseCalls, 0, "Infrastructure closed while HTTP work was in flight");
    releaseRequest();
    assert.deepEqual(await (await pending).json(), { completed: true });
    await closing;
    assert.equal(api.server.listening, false);
    assert.equal(process.listenerCount("SIGINT"), originalListeners.SIGINT);
    assert.equal(process.listenerCount("SIGTERM"), originalListeners.SIGTERM);
  } else {
    assert.equal(scenario, "readiness-and-idempotence");
    const originalDb = client.db.bind(client);
    client.db = async () => { throw new Error("Simulated database outage"); };
    assert.equal(await runtime.checkRuntimeReadiness(), false);
    client.db = async () => ({ command: async () => runtime.beginRuntimeShutdown() });
    assert.equal(await runtime.checkRuntimeReadiness(), false, "Readiness ignored shutdown during ping");
    client.db = originalDb;
    const closing = runtime.shutdownRuntime();
    assert.equal(runtime.shutdownRuntime(), closing);
    await closing;
  }

  assert.equal(baseCloseCalls, 1);
  assert.equal(await runtime.checkRuntimeReadiness(), false);
  assert.deepEqual(runtime.getRuntimeStatus(), {
    initialized: false, shuttingDown: true, tenants: { registered: 0, connected: 0 }
  });
  await assert.rejects(runtime.initializeRuntime(), /shutdown has begun/);
  await runtime.shutdownRuntime();
  assert.equal(baseCloseCalls, 1);
}

try {
  await main();
  console.log(`PASS: runtime ${scenario}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  releaseRequest?.();
  await api?.shutdown("test cleanup").catch(() => {});
  await runtime.shutdownRuntime().catch(() => {});
}
