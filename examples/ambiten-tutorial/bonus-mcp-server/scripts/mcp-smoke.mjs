import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { get as httpGet } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { MongoClient } from "mongodb";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// Never uses .env or a running database: every run owns a temporary MongoDB.
const project = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = resolve(tmpdir());
const databasePath = await mkdtemp(join(temporaryRoot, "ambiten-bonus-mcp-"));
const children = [];
let database;
const mcpClients = [];

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


async function connect(origin, extraHeaders = {}) {
  const client = new Client({ name: "ambiten-smoke-test", version: "1.0.0" });
  mcpClients.push(client);
  await client.connect(new StreamableHTTPClientTransport(new URL(origin + "/mcp"), {
    requestInit: { headers: extraHeaders }
  }));
  return client;
}

// Node fetch may replace a supplied Host header. Use the HTTP client to send
// the exact wire headers whose rejection we are testing.
function statusWithHeaders(url, headers) {
  return new Promise((resolve, reject) => {
    const request = httpGet(url, { headers }, response => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    request.setTimeout(5000, () => request.destroy(new Error("HTTP probe timed out")));
    request.once("error", reject);
  });
}

async function main() {
  const mongoPort = await freePort();
  const uri = "mongodb://127.0.0.1:" + mongoPort;
  const mongo = launch(process.env.MONGOD_BINARY ?? "mongod", [
    "--bind_ip", "127.0.0.1", "--port", String(mongoPort),
    "--dbpath", databasePath, "--quiet"
  ]);
  database = new MongoClient(uri, { serverSelectionTimeoutMS: 1000 });
  await untilReady(async () => { await database.connect(); return true; }, mongo);
  const env = {
    ...process.env, MONGO_URI: uri, DB_NAME: "ambiten_tutorial", PORT: "3000",
    REDIS_URI: "", MCP_TENANT_ID: "tenant-a",
    DOTENV_CONFIG_PATH: join(databasePath, "no-environment-file.env")
  };
  const tenantA = database.db("ambiten_tutorial_tenant_a").collection("users");
  const tenantB = database.db("ambiten_tutorial_tenant_b").collection("users");
  await tenantA.insertMany([
    { name: "Active A", email: "active-a@example.com", isDeleted: false },
    { name: "Hidden A", email: "hidden-a@example.com", isDeleted: true }
  ]);
  await tenantB.insertOne({ name: "Active B", email: "active-b@example.com", isDeleted: false });

  for (const [entry, tenant, initialEmail] of [
    ["src/mcp.ts", "tenant-a", "active-a@example.com"],
    ["dist/mcp.js", "tenant-b", "active-b@example.com"]
  ]) {
    const port = await freePort();
    const origin = "http://127.0.0.1:" + port;
    const appEnv = { ...env, MCP_PORT: String(port), MCP_TENANT_ID: tenant };
    const app = launch(process.execPath, ["--import", "tsx", entry], appEnv);
    await untilReady(async () => (await fetch(origin + "/health", { signal: AbortSignal.timeout(1000) })).ok, app);
    assert.deepEqual(await (await fetch(origin + "/health")).json(), { status: "ok", service: "ambiten-mcp" });
    assert.equal((await (await fetch(origin + "/ready")).json()).runtime.tenants.connected, 0);

    for (const headers of [{ host: "attacker.example" }, { origin: "https://attacker.example" }, { origin: "null" }]) {
      assert.equal(await statusWithHeaders(origin + "/mcp", headers), 403, JSON.stringify(headers));
    }
    for (const header of ["x-tenant-id", "x-db-name", "x-collection-name"]) {
      assert.equal((await fetch(origin + "/mcp", { headers: { [header]: "tenant-other" } })).status, 400);
    }

    const mcp = await connect(origin, { "x-request-id": "untrusted-request-id" });
    const discovered = (await mcp.listTools()).tools;
    assert.deepEqual(discovered.map(tool => tool.name).sort(), ["workspace_create_user", "workspace_list_users"]);
    const listing = discovered.find(tool => tool.name === "workspace_list_users");
    const creation = discovered.find(tool => tool.name === "workspace_create_user");
    assert.deepEqual(Object.keys(listing.inputSchema.properties), []);
    assert.deepEqual(Object.keys(creation.inputSchema.properties).sort(), ["email", "name"]);
    assert.equal(creation.inputSchema.additionalProperties, false);
    assert.equal(listing.annotations.readOnlyHint, true);
    assert.equal(creation.annotations.readOnlyHint, false);
    assert.equal(creation.annotations.idempotentHint, false);
    const first = await mcp.callTool({ name: "workspace_list_users", arguments: {} });
    assert.ok(!first.isError);
    assert.equal(first.structuredContent.tenantId, tenant);
    assert.equal(first.structuredContent.count, 1);
    assert.equal(first.structuredContent.users[0].email, initialEmail);
    assert.match(first.structuredContent.users[0]._id, /^[0-9a-f]{24}$/);

    const created = await mcp.callTool({
      name: "workspace_create_user",
      arguments: { name: "  Agent Created User  ", email: "  AGENT@EXAMPLE.COM  " }
    });
    assert.ok(!created.isError);
    assert.equal(created.structuredContent.tenantId, tenant);
    assert.equal(created.structuredContent.user.name, "Agent Created User");
    assert.equal(created.structuredContent.user.email, "agent@example.com");
    assert.match(created.structuredContent.user._id, /^[0-9a-f]{24}$/);
    assert.ok(Number.isFinite(Date.parse(created.structuredContent.user.createdAt)));
    const collection = tenant === "tenant-a" ? tenantA : tenantB;
    const saved = await collection.findOne({ email: "agent@example.com" });
    assert.equal(saved.isDeleted, false);
    assert.ok(saved.createdAt instanceof Date);
    const beforeInvalid = await collection.countDocuments();
    for (const args of [
      { name: " ", email: "valid@example.com" },
      { name: "Invalid email", email: "invalid" },
      { name: "Wrong type", email: 42 },
      { email: "missing-name@example.com" },
      { name: "Override", email: "valid@example.com", tenantId: "tenant-other" }
    ]) {
      const invalid = await mcp.callTool({ name: "workspace_create_user", arguments: args });
      assert.equal(invalid.isError, true, JSON.stringify(invalid));
    }
    const override = await mcp.callTool({ name: "workspace_list_users", arguments: { tenantId: "tenant-other" } });
    assert.equal(override.isError, true);
    assert.equal(await collection.countDocuments(), beforeInvalid);

    const parallel = await Promise.all(Array.from({ length: 8 }, () =>
      mcp.callTool({ name: "workspace_list_users", arguments: {} })));
    for (const result of parallel) {
      assert.equal(result.structuredContent.tenantId, tenant);
      assert.equal(result.structuredContent.count, 2);
      assert.ok(!result.structuredContent.users.some(user => user.email.startsWith("hidden")));
    }
    assert.equal((await (await fetch(origin + "/ready")).json()).runtime.tenants.connected, 1);
    await delay(100);
    const executions = [...app.output.matchAll(/\[mcp execution\] \{([\s\S]*?)\}/g)].map(match => match[1]);
    assert.equal(executions.length, 10, app.output);
    const ids = executions.map(text => text.match(/requestId: '(mcp-[^']+)'/)[1]);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(executions.every(text => text.includes("signals: 1")));
    assert.ok(!app.output.includes("untrusted-request-id"));
    console.log("PASS: " + entry + " discovery, CRUD policy, serialization, validation, tenant isolation, concurrent IDs, host/origin protection");

    const collision = await finishProcess(launch(process.execPath, ["--import", "tsx", "dist/mcp.js"], appEnv));
    assert.equal(collision.child.exitCode, 1, collision.output);
    assert.match(collision.output, /EADDRINUSE/);
    assert.match(collision.output, /Disconnected from MongoDB/);
    await mcp.close();
  }

  assert.equal(await tenantA.countDocuments({ email: "active-b@example.com" }), 0);
  assert.equal(await tenantB.countDocuments({ email: "active-a@example.com" }), 0);
  for (const [overrides, expected] of [
    [{ MCP_TENANT_ID: "" }, /MCP_TENANT_ID is required/],
    [{ MCP_TENANT_ID: "unknown" }, /Unknown MCP_TENANT_ID/],
    ...["0", "65536", "3.5", "invalid"].map(value => [{ MCP_PORT: value }, /Invalid MCP_PORT/])
  ]) {
    const invalid = await finishProcess(launch(process.execPath, ["--import", "tsx", "dist/mcp.js"], {
      ...env, MCP_PORT: String(await freePort()), ...overrides
    }));
    assert.equal(invalid.child.exitCode, 1, invalid.output);
    assert.match(invalid.output, expected);
  }
  console.log("PASS: MCP configuration validation, unknown tenants, and listen-failure cleanup");

  for (const scenario of ["execution-errors", "drain-SIGINT", "drain-SIGTERM"]) {
    const probe = await finishProcess(launch(process.execPath,
      ["--import", "tsx", "scripts/mcp-checks.mjs", scenario],
      { ...env, MCP_PORT: String(await freePort()) }));
    assert.equal(probe.child.exitCode, 0, probe.output);
    assert.ok(probe.output.includes("PASS: MCP " + scenario), probe.output);
    console.log("PASS: MCP " + scenario);
  }
}

let exitCode = 0;
try {
  await main();
} catch (error) {
  exitCode = 1;
  console.error(error);
  for (const state of children) console.error(state.output.slice(-3000));
} finally {
  for (const client of mcpClients) await client.close().catch(() => {});
  await database?.close();
  for (const { child } of children.reverse()) {
    if (child.exitCode === null && child.signalCode === null && child.pid) {
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
    }
  }
  assert.equal(dirname(resolve(databasePath)), temporaryRoot);
  assert.ok(basename(databasePath).startsWith("ambiten-bonus-mcp-"));
  await rm(databasePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  console.log("Removed this run's temporary MCP database; existing databases were not used.");
}
process.exit(exitCode);
