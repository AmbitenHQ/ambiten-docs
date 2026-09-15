---
title: Express Adapter
description: Connect Express request execution to AmbitenContext, tenant resolution, transactions, and multi-tenant runtime infrastructure.
---

# Express Adapter

The Express adapter connects Express request handling to Ambiten's runtime execution model.

It establishes a request-scoped execution boundary before downstream route handlers run, allowing tenant identity, request metadata, transaction state, and other runtime information to remain available throughout the request lifecycle.

Once installed in the Express middleware chain, downstream requests execute inside `AmbitenContext`.

```text
Express Request
      ↓
Express Adapter
      ↓
adapter-runtime
      ↓
AmbitenContext
      ↓
Route / Service
      ↓
AmbitenModel
      ↓
Tenant Database
```

The adapter does not replace Express.

Express continues to own routing, middleware, request parsing, error handling, and application structure.

The adapter owns the boundary between Express execution and Ambiten's request-scoped runtime.

## Why Adapters Exist

Ambiten separates startup, execution, tenant infrastructure, and persistence into distinct runtime layers.

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

Express Adapter
→ establishes request execution scope

AmbitenContext
→ carries request-scoped state

MultiTenantManager
→ manages tenant infrastructure

AmbitenModel
→ executes data operations

MongoDB
→ performs persistence
```

Without an adapter, applications would need to establish Ambiten runtime context manually for every request.

The Express adapter removes that responsibility by entering downstream middleware and route execution through the shared adapter runtime.

## Installation

Install the Express adapter with Ambiten Core and Express:

```bash
pnpm add @ambiten/core @ambiten/adapter-express express
```

Import the adapter from:

```ts
import {
  createExpressAdapter
} from "@ambiten/adapter-express";
```

A basic application can be configured as follows:

```ts
import express from "express";

import {
  AmbitenBootstrapFactory
} from "@ambiten/core";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

const runtime =
  await AmbitenBootstrapFactory.create();

const app =
  express();

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "32kb"
  })
);

const adapter =
  createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

app.listen(3000);
```

The adapter should be installed before routes that depend on Ambiten context.

## Middleware Ordering

Express middleware order matters.

A typical application should establish parsing and any request preparation required by tenant resolution before installing Ambiten's adapter.

```ts
const app =
  express();

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true
  })
);

// Ambiten request boundary
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

// Routes that depend on AmbitenContext
app.use(
  "/users",
  userRouter
);
```

Conceptually:

```text
Request
   ↓
Body / request parsing
   ↓
Ambiten Express Adapter
   ↓
AmbitenContext
   ↓
Application routes
```

If custom middleware prepares authentication, cookies, or other information used by tenant resolution, that middleware should run before the Ambiten adapter.

Routes that require Ambiten runtime state should execute after it.

## Execution Model

Internally, the Express adapter converts the incoming Express request into the framework-neutral request representation understood by `@ambiten/adapter-runtime`.

```text
HTTP Request
      ↓
Express
      ↓
@ambiten/adapter-express
      ↓
AmbitenRequestLike
      ↓
@ambiten/adapter-runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Route Handler
```

<SignalFlow
  aria-label="Express adapter execution flow"
  :items='[
    "HTTP Request",
    "Express Middleware",
    "Adapter Runtime",
    "AmbitenContext",
    "Route Handler",
    "MongoDB"
  ]'
/>

The adapter normalizes framework-specific request information and delegates shared runtime behavior to `adapter-runtime`.

This prevents Express-specific types and behavior from leaking into Ambiten Core.

## Route Handlers Stay Focused

Once the adapter is installed, route handlers do not need to manually establish Ambiten context.

```ts
app.get(
  "/users",
  async (_req, res) => {
    const users =
      await UserModel.find({});

    res.json(users);
  }
);
```

The handler does not need to manually:

- create `AmbitenContext`,
- propagate tenant identity,
- select the tenant database,
- create a tenant MongoDB client,
- pass request metadata through service layers.

Those concerns are handled through the runtime boundary established before the handler executes.

## Tenant-Aware Execution

A common configuration resolves tenant identity from an HTTP header.

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

A request may contain:

```http
POST /users
x-tenant-id: tenant5
```

The adapter resolves the request identity and enters downstream execution with:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

The flow becomes:

```text
x-tenant-id: tenant5
        ↓
Express Adapter
        ↓
TenantResolver
        ↓
tenant5
        ↓
AmbitenContext
tenantId = tenant5
```

The resolved context value should be treated as the runtime tenant identity.

Downstream application code should generally prefer:

```ts
const {
  tenantId
} = AmbitenContext.get();
```

instead of repeatedly reading:

```ts
req.headers["x-tenant-id"];
```

The HTTP header is only one possible source of tenant identity.

The runtime identity is:

```ts
AmbitenContext.get().tenantId
```

## Tenant Resolution Is Not Tenant Infrastructure

The Express adapter determines which tenant the request belongs to.

It does not own the tenant's database infrastructure.

```text
Express Adapter
→ Who is this request for?

AmbitenContext
→ Which tenant belongs to this execution?

MultiTenantManager
→ What resources belong to that tenant?
```

For example, the adapter may resolve:

```text
tenant5
```

without knowing:

```text
MongoDB URI
database name
connection status
region
tenant metadata
```

Those values belong to `MultiTenantManager`.

## Tenant Validation

Resolved tenant identities can be validated before downstream execution begins.

For example:

```ts
import {
  MultiTenantManager
} from "@ambiten/core";

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant =
        await MultiTenantManager
          .resolveTenant(tenantId);

      if (!tenant) {
        throw new Error(
          `Tenant with ID "${tenantId}" not found.`
        );
      }

      return true;
    }
  }
});
```

The lifecycle becomes:

```text
Request
   ↓
Resolve tenantId
   ↓
tenant5
   ↓
Validate
   ↓
Valid?
 ┌──┴──┐
yes    no
 ↓      ↓
Context reject
```

Validation may be asynchronous.

This makes it possible to validate dynamically discovered tenants as well as tenants registered during startup.

## Dynamic Tenants

The Express adapter does not need to know whether a tenant was registered when the process started.

For example:

```text
Request
x-tenant-id: tenant5
        ↓
Express Adapter
        ↓
tenantId = tenant5
        ↓
AmbitenContext
        ↓
Model Operation
        ↓
MultiTenantManager
```

If `tenant5` is not registered locally:

```text
MultiTenantManager
        ↓
TenantConfigResolver
        ↓
resolve tenant5
        ↓
register
        ↓
getClient()
        ↓
db_tenant5
```

From the Express adapter's perspective, a static tenant and a dynamically discovered tenant are handled the same way.

The adapter carries identity.

The runtime manages infrastructure.

## Custom Tenant Resolution

Tenant resolution is not restricted to `x-tenant-id`.

Applications can provide a custom resolver.

Conceptually:

```ts
await adapter.install(app, {
  resolvers: {
    tenantId: async (req) => {
      return resolveTenantForRequest(
        req
      );
    }
  }
});
```

Tenant identity may be derived from:

- authentication information,
- cookies,
- route parameters,
- subdomains,
- gateway metadata,
- custom headers,
- application-specific request state.

The important contract is:

```text
Request
   ↓
TenantResolver
   ↓
tenantId
   ↓
AmbitenContext
```

Downstream application code does not need to know how that identity was originally resolved.

## Request Metadata

The adapter runtime can also populate other request-scoped context information.

Common options include:

```text
tenantId
requestId
dbName
collectionName
debug
logger metadata
custom metadata
```

For example:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  },

  requestIdHeader:
    "x-request-id",

  dbNameHeader:
    "x-db-name",

  collectionNameHeader:
    "x-collection-name"
});
```

These values become part of the active execution context.

They should not be confused with process-level tenant configuration managed by `MultiTenantManager`.

## Transactions

The Express adapter can establish transaction-aware request execution.

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  },

  enableTransactions: true
});
```

When request transactions are enabled, the adapter runtime enters downstream execution through Ambiten's transaction-aware context.

Conceptually:

```text
HTTP Request
      ↓
Express Adapter
      ↓
AmbitenContext
      ↓
Transaction Boundary
      ↓
Route Handler
      ↓
Model Operations
```

For example:

```ts
app.post(
  "/orders",
  async (req, res) => {
    const order =
      await OrderModel.create({
        item: "Starter Kit"
      });

    await InventoryModel.updateOne(
      {
        _id: "item-1"
      },
      {
        $inc: {
          stock: -1
        }
      }
    );

    res.json(order);
  }
);
```

When `enableTransactions` is active, the request itself is already executing through the adapter's transaction-aware runtime boundary.

You do not need to manually create an additional request-level transaction merely to make the adapter transactional.

## Explicit Transactions

Applications may also choose to leave automatic request transactions disabled and create transaction boundaries only around operations that require atomic consistency.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";

app.post(
  "/orders",
  async (_req, res) => {
    const result =
      await AmbitenContext.withTransaction(
        async () => {
          const order =
            await OrderModel.create({
              item: "Starter Kit"
            });

          await InventoryModel.updateOne(
            {
              _id: "item-1"
            },
            {
              $inc: {
                stock: -1
              }
            }
          );

          return order;
        }
      );

    res.json(result);
  }
);
```

The two approaches represent different policies:

```text
enableTransactions: true
→ request-wide transaction boundary

AmbitenContext.withTransaction(...)
→ explicit operation-specific boundary
```

Choose the strategy that reflects the application's consistency requirements.

Do not enable transactions indiscriminately when the request does not require transactional behavior.

## Async Context Propagation

The Express adapter establishes the runtime boundary around downstream middleware and routes.

This allows execution context to remain available across asynchronous operations associated with the request.

For example:

```ts
app.get(
  "/context",
  async (_req, res) => {
    const before =
      AmbitenContext
        .get()
        .tenantId;

    await Promise.resolve();

    const after =
      AmbitenContext
        .get()
        .tenantId;

    res.json({
      before,
      after
    });
  }
);
```

For a request belonging to `tenant5`:

```ts
{
  before: "tenant5",
  after: "tenant5"
}
```

The route does not need to manually propagate the tenant through each asynchronous call.

## Services Do Not Need Express Request Objects

One benefit of adapter-managed context is that domain services do not need Express request objects just to access tenant identity.

Avoid coupling such as:

```text
Express Request
      ↓
Controller
      ↓ passes Request
Service
      ↓ passes Request
Repository
```

Prefer:

```text
Express Adapter
      ↓
AmbitenContext
      ↓
Controller
      ↓
Service
      ↓
Repository
```

A service can access:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();
```

without depending on:

```ts
express.Request
```

This keeps domain code independent from the HTTP framework.

## Models Use the Active Runtime Context

Once the request tenant has been established, models can remain focused on data operations.

```ts
app.post(
  "/users",
  async (req, res) => {
    const user =
      await UserModel.create(
        req.body
      );

    res
      .status(201)
      .json(user);
  }
);
```

If the active execution contains:

```ts
{
  tenantId: "tenant5"
}
```

the runtime can resolve the corresponding tenant infrastructure.

Conceptually:

```text
UserModel.create(...)
      ↓
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
tenant5 client
      ↓
db_tenant5
```

The model does not need to inspect the Express request.

## Request Identity vs User Identity

Tenant identity and authenticated user identity are separate concepts.

For example:

```http
x-tenant-id: tenant5
```

may establish:

```ts
tenantId = "tenant5";
```

while authentication may separately identify:

```ts
userId = "usr_2481";
```

An application may therefore have:

```ts
{
  tenantId: "tenant5",
  userId: "usr_2481"
}
```

The Express adapter's tenant resolution identifies execution ownership.

Authentication and authorization remain application concerns.

## Security

A client-controlled tenant header should not automatically be treated as authorization.

For example:

```http
x-tenant-id: tenant5
```

may correctly resolve `tenant5` while the caller is not authorized to access it.

A stronger lifecycle may be:

```text
HTTP Request
      ↓
Authentication Middleware
      ↓
Authenticated Identity
      ↓
Ambiten Express Adapter
      ↓
Tenant Resolution
      ↓
Tenant Validation / Authorization
      ↓
AmbitenContext
      ↓
Route Handler
```

Ambiten provides the execution and tenancy runtime.

Applications remain responsible for defining their access-control policy.

## Error Handling

Tenant resolution or validation may fail before the route handler executes.

Applications should place Express error handling appropriately around the configured middleware stack.

Conceptually:

```text
Request
   ↓
Authentication
   ↓
Ambiten Adapter
   ↓
Route
   ↓
Error Handler
```

Unresolved or invalid tenant requests should not silently fall through to an unrelated tenant database.

For tenant-required routes, failure to establish the tenant should normally terminate that execution.

## Adapter Installation Is Application Infrastructure

The adapter should normally be created and installed once during application bootstrap.

```ts
const adapter =
  createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

Do not recreate or reinstall the adapter for every request.

Conceptually:

```text
Application Startup
      ↓
Install Express Adapter
      ↓
Server Starts
      ↓
Request A → own AmbitenContext
Request B → own AmbitenContext
Request C → own AmbitenContext
```

The adapter infrastructure is long-lived.

The execution contexts it creates are request-scoped.

## Relationship with AmbitenBootstrapFactory

`AmbitenBootstrapFactory` and the Express adapter occupy different lifecycle stages.

```text
AmbitenBootstrapFactory
→ prepares application/runtime infrastructure

Express Adapter
→ connects HTTP request execution to that runtime
```

A typical startup sequence is:

```ts
const runtime =
  await AmbitenBootstrapFactory.create();

const app =
  express();

app.use(
  express.json()
);

const adapter =
  createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

app.listen(3000);
```

Conceptually:

```text
Process Starts
      ↓
BootstrapFactory
      ↓
Runtime Ready
      ↓
Express App
      ↓
Adapter Installed
      ↓
Server Accepts Requests
```

## Runtime Shutdown

The Express adapter establishes request execution boundaries.

It does not replace the runtime lifecycle.

When the application terminates, shut down Ambiten at the process boundary.

```ts
process.on(
  "SIGTERM",
  async () => {
    await runtime.shutdown();
    process.exit(0);
  }
);
```

Do not call:

```ts
runtime.shutdown();
```

at the end of an individual route.

The runtime is shared application infrastructure.

## ESM and CommonJS

The Express adapter supports applications using Ambiten's ESM or CommonJS package boundaries.

Conceptually:

```text
ESM Application
      ↓
@ambiten/adapter-express ESM
      ↓
@ambiten/adapter-runtime ESM
      ↓
@ambiten/core ESM
```

and:

```text
CommonJS Application
      ↓
@ambiten/adapter-express CJS
      ↓
@ambiten/adapter-runtime CJS
      ↓
@ambiten/core CJS
```

This matters because request-scoped runtime state must remain consistent across the adapter and Core boundary.

Applications should import from public package entry points:

```ts
import {
  createExpressAdapter
} from "@ambiten/adapter-express";
```

and:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

Do not import internal build paths such as:

```text
@ambiten/adapter-express/dist/...
@ambiten/adapter-runtime/dist/...
@ambiten/core/dist/...
```

Public package exports select the appropriate module format.

## Testing Express Integration

A meaningful integration test should verify more than middleware registration.

It should verify that context survives the real request lifecycle.

For example:

```ts
app.get(
  "/context",
  async (_req, res) => {
    await Promise.resolve();

    res.json({
      tenantId:
        AmbitenContext
          .get()
          .tenantId
    });
  }
);
```

A request:

```http
GET /context
x-tenant-id: tenant5
```

should return:

```json
{
  "tenantId": "tenant5"
}
```

For multi-tenant integration testing, also verify the resulting tenant state when appropriate:

```ts
const tenant =
  MultiTenantManager
    .getTenant("tenant5");
```

The expected runtime state may include:

```ts
{
  tenantId: "tenant5",
  dbName: "db_tenant5",
  connected: true,
  lazy: false
}
```

This validates the complete adapter-to-runtime path.

## Why Express Is a Useful Reference Model

Express provides a straightforward mental model for Ambiten adapter behavior.

```text
Middleware
   ↓
establish execution scope
   ↓
downstream handlers inherit runtime state
```

Other adapters use framework-specific mechanisms, but the underlying Ambiten model remains the same.

For example:

```text
Express
→ middleware

Fastify
→ framework lifecycle integration

NestJS
→ interceptor/execution lifecycle
```

All ultimately connect framework execution to:

```text
adapter-runtime
      ↓
AmbitenContext
```

## When to Use the Express Adapter

The Express adapter is appropriate when an application:

- already uses Express,
- relies on Express middleware architecture,
- exposes REST APIs,
- needs request-scoped tenant propagation,
- needs transaction-aware request execution,
- is migrating an existing Express application toward Ambiten's runtime model.

Existing Express applications do not need to replace their routing architecture to use Ambiten.

The adapter is designed to fit into the existing middleware lifecycle.

## Recommended Mental Model

Think of the Express adapter as an execution-boundary initializer rather than a routing utility.

```text
Express
→ receives request

Express Adapter
→ enters Ambiten runtime

TenantResolver
→ identifies tenant

AmbitenContext
→ carries execution state

MultiTenantManager
→ resolves tenant resources

AmbitenModel
→ performs operation

MongoDB
→ persists data
```

The important architectural shift is that request-scoped runtime state is established once at ingress and inherited throughout downstream execution instead of being manually propagated through every application layer.

## Summary

The Express adapter connects Express middleware execution to Ambiten's runtime.

It:

- normalizes the Express request,
- resolves tenant identity,
- validates tenancy when configured,
- establishes `AmbitenContext`,
- propagates request-scoped state across asynchronous execution,
- supports transaction-aware request boundaries,
- allows dynamic tenant infrastructure to be resolved downstream,
- keeps route and service code independent from runtime plumbing.

The complete flow is:

```text
HTTP Request
      ↓
Express
      ↓
Ambiten Express Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Route / Service
      ↓
AmbitenModel
      ↓
MultiTenantManager
      ↓
Tenant Database
```

## Related Pages

- [Adapters Overview](/adapters/overview)
- [Usage Patterns](/adapters/usage-patterns)
- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/multi-tenancy/framework-adapters)