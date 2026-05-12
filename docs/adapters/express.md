# Express Adapter

The Express adapter connects Express request handling to Tenra’s runtime execution model.

It establishes a request-scoped execution boundary before route handlers run, ensuring that tenant identity, request metadata, transaction state, and runtime-aware behavior remain available throughout the request lifecycle.

Once installed, every request executes inside `TenraContext` automatically.

## Why adapters exist

Tenra separates startup, execution, and persistence into distinct runtime layers.

```Plain Text
Bootstrap → prepares the runtime
Adapter   → establishes execution scope
Context   → carries runtime state
Models    → execute operations
MongoDB   → performs persistence
```

The adapter is the bridge between the external framework and Tenra’s internal execution system.

Without an adapter, applications would need to initialize runtime context manually inside every request flow.

The adapter removes that burden by establishing the execution boundary once at ingress.

## Installation

Install the adapter on your Express application:

```ts
import express from "express";
import { createExpressAdapter } from "@tenra/express";

const app = express();

const adapter = createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  },
  enableTransactions: true
});
```

Once installed, incoming requests automatically enter the Tenra runtime before reaching route handlers.

## The execution model

Internally, the adapter integrates into Express middleware and establishes runtime scope before downstream execution begins.

The flow is conceptually:

```PlainText
HTTP Request
  ↓
Express Middleware
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
  aria-label="Express adapter execution flow"
  :items='["HTTP Request", "Express Middleware", "Adapter Runtime", "TenraContext", "Route Handler", "MongoDB"]'
/>

The adapter normalizes the incoming request, initializes runtime state, and ensures downstream execution inherits that state automatically.

## Route handlers stay clean

Once the adapter is installed, route handlers no longer need to manage runtime infrastructure manually.

```ts
app.get("/users", async (_req, res) => {
  const users = await UserModel.find({});
  res.json(users);
});
```

The route handler does not need to:

- resolve tenant identity
- initialize sessions
- manage request metadata
- propagate execution context

That behavior already exists inside the active runtime boundary.

## Runtime behavior

With the adapter installed, request execution becomes runtime-aware automatically.

Tenant identity can be resolved from request headers, request metadata propagates across asynchronous boundaries, and model operations participate in the same execution scope consistently throughout the lifecycle.

Middleware, instrumentation, and transaction handling also execute inside the same request-scoped boundary, which keeps behavior predictable across routes and services.

## Transaction support

When transaction support is enabled, request execution can participate in transaction-aware workflows automatically.

```ts
import { TenraContext } from "@tenra/core";

app.post("/order", async (_req, res) => {
  const result = await TenraContext.withTransaction(async () => {
    const order = await OrderModel.create({
      item: "Starter Kit"
    });

    await InventoryModel.updateOne(
      { _id: "item-1" },
      { $inc: { stock: -1 } }
    );

    return order;
  });

  res.json(result);
});
```

The active session propagates automatically through the request scope without requiring manual session passing between operations.

## Tenant-aware execution

The adapter is commonly responsible for establishing tenant identity.

For example:

```http
x-tenant-id: tenant-a
```

Once resolved, the tenant scope becomes part of TenraContext, allowing downstream model operations to remain tenant-aware automatically.

```ts
await UserModel.find({});
```

The model operation stays simple while the runtime resolves the correct tenant boundary internally.

## Why Express is the reference model

Express provides the clearest mental model for understanding how Tenra adapters behave.

Middleware establishes execution scope once, and all downstream handlers inherit that runtime state automatically.

That same architectural pattern applies across other adapters such as Fastify, NestJS, GraphQL, and AWS Lambda, even though the hosting environments differ.

## When to use the Express adapter

The Express adapter is appropriate when your application already relies on Express middleware architecture or when you want a straightforward introduction to Tenra’s execution model.

It is especially useful for:

- REST APIs
- monolithic Node.js services
- middleware-heavy applications
- teams migrating existing Express systems toward runtime-aware execution

## Mental model

The Express adapter should be viewed as an execution boundary initializer rather than a routing utility.

```PlainText
Express → receives request
Adapter → establishes runtime scope
Context → carries execution state
Models → inherit runtime behavior
MongoDB → executes persistence
```

The important architectural shift is that runtime state is initialized once and inherited automatically rather than passed manually through application layers.

## Summary

The Express adapter integrates Express middleware with Tenra’s runtime system.

It establishes request-scoped execution boundaries, initializes `TenraContext`, enables tenant-aware and transaction-aware execution, and allows route handlers to remain focused on application behavior instead of infrastructure plumbing.

## Related pages

- [Adapters Overview](/adapters/overview)
- [Usage Patterns](/adapters/usage-patterns)
- [TenraBootstrap](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
