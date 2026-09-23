require("reflect-metadata");

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { setTimeout: delay } = require("node:timers/promises");
const { Controller, Get, Module } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { AmbitenContext } = require("@ambiten/core");
const { defer } = require("rxjs");
const { AppModule } = require("../dist/app.module");

// These diagnostic routes exist only in the test application.
let activeSubscriptions = 0;
let peakSubscriptions = 0;

class BoundaryProbeController {
  observable() {
    return defer(async () => {
      activeSubscriptions++;
      peakSubscriptions = Math.max(peakSubscriptions, activeSubscriptions);
      try {
        assert.equal(AmbitenContext.hasActiveContext(), true);
        const initial = AmbitenContext.get();
        await delay(20);
        const current = AmbitenContext.get();
        assert.equal(current, initial);
        return { tenantId: current.tenantId, requestId: current.requestId };
      } finally {
        activeSubscriptions--;
      }
    });
  }

  failure() {
    return defer(async () => {
      await delay(5);
      assert.equal(AmbitenContext.hasActiveContext(), true);
      throw new Error("Deliberate boundary test failure");
    });
  }
}

Controller("boundary-test")(BoundaryProbeController);
Get("observable")(
  BoundaryProbeController.prototype,
  "observable",
  Object.getOwnPropertyDescriptor(BoundaryProbeController.prototype, "observable")
);
Get("failure")(
  BoundaryProbeController.prototype,
  "failure",
  Object.getOwnPropertyDescriptor(BoundaryProbeController.prototype, "failure")
);

class BoundaryTestModule {}
Module({ imports: [AppModule], controllers: [BoundaryProbeController] })(BoundaryTestModule);

let app;
let baseUrl;

before(async () => {
  app = await NestFactory.create(BoundaryTestModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});

after(async () => {
  await app?.close();
});

async function request(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers,
    signal: AbortSignal.timeout(10_000)
  });
  return { status: response.status, body: await response.json() };
}

test("controller reads adapter context without a database connection", async () => {
  const result = await request("/context", {
    "x-tenant-id": "tenant-a",
    "x-request-id": "context-a"
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { tenantId: "tenant-a", requestId: "context-a" });
});

test("injected singleton service retains context after awaited work", async () => {
  const result = await request("/users/runtime", {
    "x-tenant-id": "tenant-b",
    "x-request-id": "service-b"
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { tenantId: "tenant-b", requestId: "service-b" });
});

test("overlapping controllers, services, and cold Observables stay isolated", async () => {
  const routes = ["/context", "/users/runtime", "/boundary-test/observable"];
  await Promise.all(Array.from({ length: 36 }, async (_, index) => {
    const tenantId = `tenant-${Math.floor(index / 3) % 3}`;
    const requestId = `concurrent-${index}`;
    const result = await request(routes[index % routes.length], {
      "x-tenant-id": tenantId,
      "x-request-id": requestId
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { tenantId, requestId });
  }));
  assert(peakSubscriptions > 1, "Observable subscriptions must actually overlap");
  assert.equal(activeSubscriptions, 0);
  assert.equal(AmbitenContext.hasActiveContext(), false);
});

test("missing tenant is rejected without silently using a fallback", async () => {
  for (const path of ["/context", "/users/runtime"]) {
    const result = await request(path, { "x-request-id": "missing-tenant" });
    // The uncustomized published adapter throws an ordinary Error.
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { statusCode: 500, message: "Internal server error" });
  }
});

test("request IDs and database names are not invented or retained", async () => {
  const result = await request("/context", { "x-tenant-id": "tenant-c" });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { tenantId: "tenant-c" });
});

test("a failed execution does not contaminate the next request", async () => {
  const failed = await request("/boundary-test/failure", {
    "x-tenant-id": "tenant-failed",
    "x-request-id": "failed-request"
  });
  assert.equal(failed.status, 500);
  const next = await request("/users/runtime", {
    "x-tenant-id": "tenant-next",
    "x-request-id": "next-request"
  });
  assert.equal(next.status, 200);
  assert.deepEqual(next.body, { tenantId: "tenant-next", requestId: "next-request" });
  assert.equal(AmbitenContext.hasActiveContext(), false);
});
