# Context

TenraContext is the execution backbone of Tenra’s runtime architecture.

It provides request-scoped ambient state across asynchronous execution boundaries, allowing models, middleware, providers, and runtime services to resolve tenant identity, transaction state, database scope, and execution metadata without forcing those values through every function call.

This capability is what allows Tenra to scale from simple CRUD applications into transaction-aware, multi-tenant systems while keeping application code operationally clean.

This page explains how Tenra carries execution state through the runtime. If you are looking for how models consume that state, see [Context Binding](/models/context-binding).

## Why context exists

In conventional architectures, infrastructure state often leaks directly into business logic:

```ts
await UserModel.create(data, {
  tenantId,
  session,
  dbName
});
```

As systems grow, this pattern becomes increasingly fragile. Tenant handling becomes inconsistent, transaction boundaries become difficult to preserve, nested services start forwarding infrastructure state manually, and application code gradually turns into coordination plumbing.

Tenra solves this by moving execution state into a runtime-managed boundary.

With TenraContext, the same operation becomes:

```ts
await UserModel.create(data);
```

The runtime already knows which tenant is active, which database should be resolved, whether a transaction session exists, and what metadata belongs to the request.

Infrastructure concerns stop flowing through the application layer and become part of the runtime itself.

## What `TenraContext` provides

TenraContext stores execution-scoped state that remains available throughout the lifecycle of a request or runtime operation.

Typical values include:

`tenantId`, `requestId`, `dbName`, `collectionName`, `session`, `loggerMeta`, and custom runtime metadata.

Those values may originate from an adapter boundary, a transaction helper, a background execution scope, or explicit runtime initialization.

Once the boundary is established, every runtime-aware component resolves state from the active context automatically.

## Execution model

Tenra’s context system is built on top of Node.js AsyncLocalStorage.

This allows execution state to propagate automatically across asynchronous calls while remaining isolated per request boundary.

In practice, this means:

- each request receives its own isolated runtime scope
- asynchronous execution retains the active context automatically
- models and middleware can resolve execution state without explicit parameter propagation

This elevates context from a convenience helper into a core architectural primitive.

## Runtime flow

<ContextBindingFlow />

At a high level:

At a high level, an adapter or runtime helper establishes the execution boundary, `TenraContext` stores runtime state, application logic executes inside that scope, and models plus providers resolve infrastructure using the active context before MongoDB executes the final operation.

## Basic API

### Creating a context boundary

Use `TenraContext.run(...)` to establish an execution scope manually:

```ts
import { TenraContext } from "@tenra/core";

await TenraContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },
  async () => {
    await UserModel.create({ name: "John" });
  }
);
```

This pattern is commonly used in background jobs, scripts, scheduled tasks, or infrastructure code executing outside an adapter-managed request lifecycle.

Once established, the boundary remains active across the entire asynchronous execution chain.

### Reading the active context

Use `get()` to retrieve the current runtime scope:

```ts
const ctx = TenraContext.get();

console.log(ctx?.tenantId);
console.log(ctx?.requestId);
```

This is frequently used inside middleware, observability tooling, instrumentation systems, auditing layers, and runtime utilities that need access to execution metadata without modifying application interfaces.

## Transaction-aware execution

One of the most important responsibilities of context is transaction continuity.

TenraContext allows transaction sessions to propagate automatically across nested model operations:

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.create({ name: "Alice" });
  await OrderModel.create({ item: "Starter Kit" });
});
```

Every operation inside the boundary automatically participates in the same MongoDB session.

This enables reliable transaction composition without forcing session objects through service layers manually. The result is cleaner business logic, safer transaction boundaries, and significantly lower risk of accidental out-of-transaction writes.

## What belongs in context

TenraContext is designed for execution state, not domain data.

Typical context contents include tenant identity, request identifiers, database overrides, transaction sessions, runtime metadata, and instrumentation state.

Business entities, user payloads, or domain-specific application data should not be stored in context boundaries.

The purpose of context is to describe how execution behaves, not what the business domain contains.

## Adapter integration

In most applications, `TenraContext.run(...)` is never called manually during request handling.

Adapters establish the runtime boundary automatically.

Conceptually, the flow resembles:

```ts
app.use((req, _res, next) => {
  TenraContext.run(
    {
      tenantId: req.headers["x-tenant-id"],
      requestId: generateRequestId()
    },
    async () => next()
  );
});
```

In production systems, Tenra adapters coordinate this through the adapter runtime layer.

This is what allows identical model code to execute consistently across Express, Fastify, NestJS, GraphQL runtimes, AWS Lambda functions, and background workers without each environment having to reinvent execution propagation.

## How context changes application design

Without a runtime context layer, services frequently become infrastructure carriers responsible for forwarding sessions, tenant identifiers, database references, and request metadata.

With `TenraContext`, those concerns move into the runtime.

The result is a cleaner architectural separation between business behavior and execution infrastructure.

Services become easier to compose, transaction handling becomes more reliable, tenant enforcement becomes centralized, and observability gains structured execution metadata without additional plumbing.

This shift is one of the primary reasons Tenra scales more cleanly as systems grow in complexity.

## Common runtime patterns

### Multi-tenant execution

```ts
const ctx = TenraContext.get();

console.log(ctx?.tenantId);
```

Tenant-aware execution depends on the active tenant boundary remaining available throughout runtime execution.

### Logging and observability

```ts
const ctx = TenraContext.get();

logger.info("User created", {
  requestId: ctx?.requestId
});
```

Because request metadata propagates automatically, logs and traces can remain fully correlated without modifying every service interface.

### Auditing

```ts
const ctx = TenraContext.get();

await AuditLogModel.create({
  requestId: ctx?.requestId
});
```

### Conditional runtime behavior

```ts
const ctx = TenraContext.get();

if (ctx?.tenantId === "admin") {
  // privileged runtime path
}
```

## Important runtime rules

Context only exists inside the execution boundary that created it.

For request-driven systems, boundaries should be established through adapters. For standalone execution flows, use `TenraContext.run(...`) or runtime helpers such as transaction wrappers.

Normal request-bound operations should rely on runtime propagation rather than manual infrastructure overrides.

**Prefer:**

```ts
await UserModel.create(data);
```

**Instead of:**

```ts
await UserModel.create(data, {
  tenantId,
  session
});
```

unless you are intentionally overriding runtime behavior.

## Troubleshooting context loss

Most context-related issues originate from boundary creation problems rather than model execution itself.

If runtime state appears missing:

- verify that the adapter is installed correctly
- ensure background jobs create explicit execution boundaries
- confirm transactions are created inside an active context
- check that asynchronous execution does not escape the runtime scope

In most cases, the issue is related to execution boundaries rather than database operations.

## Relationship with the runtime

<SignalFlow 
aria-label="TenraContext runtime relationship" :items='["Adapter", "TenraContext", "TenraModel", "TenraClient", "MongoDB"]' />

Within the runtime architecture, adapters establish execution boundaries, TenraContext stores execution state, models consume that state, providers resolve infrastructure bindings, and MongoDB executes the finalized operation.

Each layer remains isolated in responsibility while participating in the same execution flow.

## Summary

TenraContext is one of the foundational primitives of Tenra’s architecture.

It enables isolated, ambient, and transaction-aware execution state across asynchronous boundaries, allowing multi-tenancy, observability, and infrastructure coordination to exist without polluting business logic.

Rather than forcing application code to carry runtime state manually, Tenra moves execution awareness into the runtime itself.

## Related pages

- [Context Binding](/models/context-binding)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [TenraClient](/api/tenra-client)
- [Architecture](/architecture/whitepaper)
