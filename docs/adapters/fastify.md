# Fastify Adapter

The Fastify adapter connects Fastify’s request lifecycle to the Tenra runtime.

It establishes a request-scoped execution boundary before route handlers run, ensuring that tenant identity, runtime metadata, transaction state, and context-aware execution remain available throughout the request lifecycle.

Once installed, every request automatically executes inside `TenraContext`.

## Integration model

Install the adapter on your Fastify instance:

```ts
import Fastify from "fastify";
import { createFastifyAdapter } from "@tenra/fastify";

const app = Fastify();

const adapter = createFastifyAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  },
  enableTransactions: true
});
```

After installation, incoming requests enter the Tenra runtime before reaching route handlers.

## How the adapter works

The Fastify adapter integrates through Fastify’s lifecycle hook system, typically at the preHandler stage.

At runtime, the adapter normalizes the incoming request, initializes execution scope through the adapter runtime, establishes TenraContext, and then returns control to Fastify’s handler lifecycle.

This ensures that downstream execution already has access to:

- tenant identity
- request metadata
- active transaction state
- runtime-aware model behavior

without requiring manual setup inside handlers.

## Request lifecycle

Execution follows a consistent runtime flow:

```PlainText
Fastify Request
  ↓
preHandler Hook
  ↓
Adapter Runtime
  ↓
TenraContext
  ↓
Route Handler
  ↓
MongoDB
```

<SignalFlow
  aria-label="Fastify adapter execution flow"
  :items='["Fastify Request", "preHandler Hook", "Adapter Runtime", "TenraContext", "Route Handler", "MongoDB"]'
/>

Fastify continues handling transport and routing while the adapter prepares runtime scope before application logic begins executing.

## Route handlers remain focused

Once the adapter is installed, route handlers no longer need to manage runtime infrastructure directly.

```ts
app.post("/transfer", async () => {
  await AccountModel.updateOne(
    { _id: "A" },
    { $inc: { balance: -100 } }
  );

  await AccountModel.updateOne(
    { _id: "B" },
    { $inc: { balance: 100 } }
  );

  return { success: true };
});
```

The handler stays focused on domain behavior while the runtime handles context propagation, tenant awareness, and transaction continuity automatically.

## Runtime behavior

With the adapter installed, every request executes inside a fully initialized runtime scope.

Tenant identity can be resolved before handler execution begins, `TenraContext` remains available throughout asynchronous execution, and model operations participate in the same request-aware lifecycle consistently.

Middleware, instrumentation, and transactions also execute inside that same scope, which keeps runtime behavior coherent across handlers and services.

## Transaction support

When transaction support is enabled, request execution can participate in transaction-aware workflows automatically.

```ts
await TenraContext.withTransaction(async () => {
  await OrderModel.create(order);

  await InventoryModel.updateOne(
    { _id: itemId },
    { $inc: { stock: -1 } }
  );
});
```

The active session propagates automatically through the request lifecycle without requiring manual session handling between operations.

## Why Fastify fits well with Tenra

Fastify’s hook-driven lifecycle aligns naturally with Tenra’s execution model.

The adapter can establish runtime scope early in the request lifecycle while preserving Fastify’s performance-oriented architecture and plugin ecosystem.

This allows applications to remain operationally consistent without introducing excessive runtime overhead or framework-specific plumbing into application code.

## When to use the Fastify adapter

The Fastify adapter is well suited for high-throughput APIs, hook-driven services, and systems where low-overhead request handling matters.

It is especially useful when teams want Fastify’s performance characteristics while still benefiting from:

- runtime-aware execution
- tenant isolation
- automatic context propagation
- transaction-aware workflows

without manually coordinating those concerns inside handlers.

## Mental model

The Fastify adapter should be viewed as a runtime boundary initializer rather than a routing abstraction.

```PlainText
Fastify → transport and hooks
Adapter → runtime initialization
Context → execution state
Models → data operations
MongoDB → persistence
```

Once execution enters the runtime, models and middleware behave the same way they would in any other supported adapter environment.

## Summary

The Fastify adapter integrates Fastify’s lifecycle with Tenra’s runtime execution model.

It establishes request-scoped execution boundaries, initializes `TenraContext`, enables tenant-aware and transaction-aware execution, and allows route handlers to remain focused on application behavior instead of infrastructure coordination.

## Related pages

- [Adapters Overview](/adapters/overview)
- [Usage Patterns](/adapters/usage-patterns)
- [TenraBootstrap](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
