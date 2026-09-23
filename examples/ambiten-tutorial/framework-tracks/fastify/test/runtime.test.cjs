const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { setTimeout: delay } = require("node:timers/promises");
const { resolve, join } = require("node:path");
const { readFileSync, readdirSync } = require("node:fs");

process.env.DOTENV_CONFIG_PATH = join(__dirname, "unused.env");
process.env.REDIS_URI = "";
const Fastify = require("fastify");
const { AmbitenContext, MultiTenantManager } = require("@ambiten/core");
const { createFastifyAdapter } = require("@ambiten/adapter-fastify");
const { buildApp } = require("../dist/app");

let app, origin;
const project = resolve(__dirname, "..");

async function get(path, headers = {}) {
  const response = await fetch(origin + path, { headers, signal: AbortSignal.timeout(15_000) });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  app = buildApp();
  origin = await app.listen({ host: "127.0.0.1", port: 0 });
});
after(async () => { await app?.close(); });

test("published adapter alone preserves context through the awaited handler", async () => {
  const probe = Fastify();
  try {
    await createFastifyAdapter().install(probe, { tenancy: { header: "x-tenant-id" } });
    probe.get("/probe", async () => {
      await delay(1);
      return { active: AmbitenContext.hasActiveContext(), context: AmbitenContext.get() };
    });
    const response = await probe.inject({ url: "/probe", headers: { "x-tenant-id": "tenant-a" } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { active: true, context: { tenantId: "tenant-a" } });
    assert.equal(AmbitenContext.hasActiveContext(), false);
  } finally { await probe.close(); }
});

test("health stays outside the protected plugin and needs no tenant", async () => {
  assert.deepEqual(await get("/health"), { status: 200, body: { status: "ok" } });
  assert.equal((await get("/health", { "x-tenant-id": "unknown" })).status, 200);
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("context retains tenant and explicit request ID after awaited work", async () => {
  const result = await get("/context", { "x-tenant-id": "tenant-a", "x-request-id": "fastify-a-001" });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { tenantId: "tenant-a", requestId: "fastify-a-001" });
  assert.equal(Object.hasOwn(result.body, "dbName"), false);
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("header casing is handled by the adapter; absent optional IDs stay absent", async () => {
  const a = await get("/context", { "X-Tenant-ID": "tenant-b" });
  const b = await get("/context", { "x-tenant-id": "tenant-b" });
  assert.equal(a.status, 200);
  assert.deepEqual(a.body, { tenantId: "tenant-b" });
  assert.deepEqual(b.body, { tenantId: "tenant-b" });
});

test("overlapping requests keep their own tenant and request identity", async () => {
  const results = await Promise.allSettled(Array.from({ length: 40 }, async (_, index) => {
    const tenantId = index % 2 ? "tenant-a" : "tenant-b";
    const requestId = `parallel-${index}`;
    const response = await get("/context", { "x-tenant-id": tenantId, "x-request-id": requestId });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { tenantId, requestId });
  }));
  for (const result of results) if (result.status === "rejected") throw result.reason;
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("missing and unregistered tenants are rejected before the context handler", async () => {
  for (const headers of [
    {}, { "x-tenant-id": "unknown" }
  ]) {
    const result = await get("/context", headers);
    // The adapter / validation callback throws plain Errors in this first checkpoint.
    assert.equal(result.status, 500);
    assert.equal(typeof result.body.error, "string");
    assert.match(result.body.message, /Tenant resolution failed|Tenant with ID "unknown" not found/);
    assert(!result.body.tenantId);
  }
  assert.equal((await get("/health")).status, 200);
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("public adapter preserves handler this, bodies, async errors, and HEAD routes", async () => {
  const probe = Fastify();
  let executions = 0;
  try {
    probe.register(async api => {
      api.decorate("marker", "child-scope");
      await createFastifyAdapter().install(api, { tenancy: { header: "x-tenant-id" } });
      api.post("/echo", async function (request) {
        const before = AmbitenContext.get();
        await delay(2);
        assert.equal(AmbitenContext.get(), before);
        return { marker: this.marker, body: request.body, tenantId: before.tenantId };
      });
      api.get("/error", async () => {
        await delay(2);
        assert.equal(AmbitenContext.get().tenantId, "tenant-a");
        throw new Error("Intentional test failure.");
      });
      api.get("/head", async () => {
        executions++;
        assert.equal(AmbitenContext.get().tenantId, "tenant-b");
        return { ok: true };
      });
    });
    const headers = { "x-tenant-id": "tenant-a" };
    const echo = await probe.inject({ method: "POST", url: "/echo", headers, payload: { value: "parsed" } });
    assert.equal(echo.statusCode, 200);
    assert.deepEqual(echo.json(), { marker: "child-scope", body: { value: "parsed" }, tenantId: "tenant-a" });
    assert.equal((await probe.inject({ url: "/error", headers })).statusCode, 500);
    const head = await probe.inject({ method: "HEAD", url: "/head", headers: { "x-tenant-id": "tenant-b" } });
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, "");
    assert.equal(executions, 1);
    assert.equal(AmbitenContext.hasActiveContext(), false);
  } finally { await probe.close(); }
});

test("tenant validation uses the public registry without connecting to MongoDB", async () => {
  assert.equal((await MultiTenantManager.resolveTenant("tenant-a")).tenantId, "tenant-a");
  assert.equal(await MultiTenantManager.resolveTenant("unknown"), undefined);
  assert.equal(MultiTenantManager.getStats().connectedTenants, 0);
});

test("consumer source has no adapter implementation or internal dependencies", () => {
  const manifest = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
  assert.equal(manifest.dependencies["@ambiten/adapter-fastify"], "1.0.4");
  assert.equal(manifest.dependencies["@ambiten/adapter-runtime"], undefined);
  assert.equal(manifest.dependencies["@ambiten/adapter-types"], undefined);
  const sourceRoot = join(project, "src");
  for (const file of readdirSync(sourceRoot, { recursive: true }).filter(file => file.endsWith(".ts"))) {
    const source = readFileSync(join(sourceRoot, file), "utf8");
    assert.doesNotMatch(source, /adapter-runtime|adapter-types|AsyncLocalStorage|runWithAdapterContext|AmbitenRequestLike|onRoute|AmbitenContext\.run\(/);
  }
});

test("port configuration validates input and allows test port zero", () => {
  const { readPort } = require("../dist/main");
  assert.equal(readPort("3000"), 3000);
  assert.equal(readPort("0"), 0);
  for (const value of ["abc", "-1", "65536", "12.5"]) assert.throws(() => readPort(value), /PORT must/);
});

test("source and built launchers serve real HTTP requests", { timeout: 100_000 }, async () => {
  for (const args of [["--import", "tsx", "src/main.ts"], ["dist/main.js"]]) {
    const child = spawn(process.execPath, args, {
      cwd: project,
      env: { ...process.env, PORT: "0", DOTENV_CONFIG_PATH: join(__dirname, "unused.env") },
      windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "", spawnError;
    child.on("error", error => { spawnError = error; });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { output = (output + chunk).slice(-6000); });
    try {
      const deadline = Date.now() + 40_000;
      let url;
      while (Date.now() < deadline && !url) {
        if (spawnError) throw spawnError;
        if (child.exitCode !== null) throw new Error(output);
        url = output.match(/Fastify ready at (http:\/\/[^\s]+)/)?.[1];
        if (!url) await delay(100);
      }
      assert(url, `Launcher did not become ready: ${output}`);
      const response = await fetch(url + "/context", {
        headers: { "x-tenant-id": "tenant-a", "x-request-id": "cli-test" },
        signal: AbortSignal.timeout(15_000)
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { tenantId: "tenant-a", requestId: "cli-test" });
    } finally {
      if (child.pid && child.exitCode === null && child.signalCode === null) {
        const stopped = once(child, "exit");
        child.kill();
        await stopped;
      }
    }
  }
});
