---
title: Fastify Adapter
description: Connect Fastify request execution to AmbitenContext, tenant resolution, transactions, and multi-tenant runtime infrastructure.
---

# Fastify Adapter

The Fastify adapter connects Fastify's request lifecycle to Ambiten's runtime execution model.

It establishes a request-scoped execution boundary before route handlers run, allowing tenant identity, request metadata, transaction state, and other runtime information to remain available throughout the request lifecycle.

Once installed, downstream Fastify request execution enters `AmbitenContext` automatically.

```text
Fastify Request
      ↓
Fastify Adapter
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

The adapter does not replace Fastify.

Fastify continues to own routing, hooks, plugins, request parsing, serialization, validation, and transport behavior.

The adapter owns the boundary between Fastify execution and Ambiten's runtime context.

## Why the Fastify Adapter Exists

Ambiten separates runtime startup, request execution, tenant infrastructure, and data operations into distinct layers.

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

Fastify Adapter
→ establishes request execution scope

AmbitenContext
→ carries request-scoped state

MultiTenantManager
→ manages tenant infrastructure

AmbitenModel
→ performs data operations

MongoDB
→ performs persistence
```

Without the adapter, applications would need to establish Ambiten execution context manually inside Fastify handlers or hooks.

The adapter provides one consistent ingress boundary for request execution.

## Installation

Install the Fastify adapter with Ambiten Core and Fastify:

```bash
pnpm add @ambiten/core @ambiten/adapter-fastify fastify
```

Import the adapter from:

```ts
import {
  createFastifyAdapter
} from "@ambiten/adapter-fastify";
```

A basic application can be configured as follows:

```ts
import Fastify from "fastify";

import {
  AmbitenBootstrapFactory
} from "@ambiten/core";

import {
  createFastifyAdapter
} from "@ambiten/adapter-fastify";

const runtime =
  await AmbitenBootstrapFactory.create();

const app =
  Fastify();

const adapter =
  createFastifyAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

await app.listen({
  port: 3000
});
```

After installation, incoming requests enter Ambiten's runtime boundary before route handlers execute.

## Integration Model

The Fastify adapter integrates with Fastify's request lifecycle and delegates shared runtime behavior to `@ambiten/adapter-runtime`.

Conceptually:

```text
Fastify Request
      ↓
Fastify Lifecycle
      ↓
@ambiten/adapter-fastify
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
  aria-label="Fastify adapter execution flow"
  :items='[
    "Fastify Request",
    "Fastify Lifecycle",
    "Adapter Runtime",
    "AmbitenContext",
    "Route Handler",
    "MongoDB"
  ]'
/>

The Fastify-specific adapter handles framework integration.

The shared adapter runtime handles Ambiten execution concerns.

This keeps Fastify-specific request behavior out of Ambiten Core.

## Lifecycle Ordering

The adapter should be installed before routes that depend on Ambiten runtime context.

A typical application sequence is:

```ts
const app =
  Fastify();

const adapter =
  createFastifyAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

app.get(
  "/users",
  async () => {
    return UserModel.find({});
  }
);
```

Conceptually:

```text
Fastify initialization
      ↓
Ambiten adapter installation
      ↓
application routes
      ↓
server starts
```

If other hooks or plugins prepare information required by tenant resolution, such as authentication state or cookies, those should be registered in the appropriate Fastify lifecycle before the Ambiten tenancy boundary depends on them.

Routes that require `AmbitenContext` should execute after the adapter has been installed.

## Route Handlers Stay Focused

Once the adapter is installed, Fastify route handlers do not need to manually manage Ambiten runtime infrastructure.

```ts
app.post(
  "/transfer",
  async () => {
    await AccountModel.updateOne(
      {
        _id: "A"
      },
      {
        $inc: {
          balance: -100
        }
      }
    );

    await AccountModel.updateOne(
      {
        _id: "B"
      },
      {
        $inc: {
          balance: 100
        }
      }
    );

    return {
      success: true
    };
  }
);
```

The handler remains focused on application behavior.

It does not need to manually:

- create `AmbitenContext`,
- resolve tenant database infrastructure,
- propagate tenant identity,
- pass request metadata between services,
- create MongoDB clients per request.

Those concerns belong to the runtime boundary.

## Tenant-Aware Execution

A common tenancy setup resolves tenant identity from a request header.

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

The adapter resolves the request tenant and establishes:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

The request flow becomes:

```text
x-tenant-id: tenant5
        ↓
Fastify Adapter
        ↓
TenantResolver
        ↓
tenant5
        ↓
AmbitenContext
tenantId = tenant5
```

Downstream application code should generally use the resolved runtime identity:

```ts
const {
  tenantId
} = AmbitenContext.get();
```

rather than repeatedly reading the original Fastify request header.

The request source is framework-specific.

The resolved context value is the runtime identity.

## Tenant Resolution and Tenant Infrastructure

The Fastify adapter identifies which tenant the request belongs to.

It does not manage tenant infrastructure.

```text
Fastify Adapter
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
connection state
deployment region
tenant metadata
```

Those concerns belong to `MultiTenantManager`.

## Tenant Validation

Resolved tenant identities can be validated before route execution begins.

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

This allows statically registered and dynamically discovered tenants to participate in the same request flow.

## Dynamic Tenants

The Fastify adapter does not need to know whether a tenant was registered during startup.

For example:

```text
Request
x-tenant-id: tenant5
        ↓
Fastify Adapter
        ↓
tenantId = tenant5
        ↓
AmbitenContext
        ↓
Model Operation
        ↓
MultiTenantManager
```

If `tenant5` is not already registered:

```text
MultiTenantManager
        ↓
TenantConfigResolver
        ↓
external tenant lookup
        ↓
tenant5 registered
        ↓
getClient()
        ↓
db_tenant5
```

From the Fastify adapter's perspective, static and dynamic tenants are handled identically.

The adapter carries tenant identity.

The runtime manages tenant infrastructure.

## Custom Tenant Resolution

Tenant resolution is not limited to `x-tenant-id`.

Applications can provide custom resolution logic.

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

A custom resolver may derive tenant identity from:

- authentication information,
- cookies,
- route parameters,
- subdomains,
- gateway metadata,
- custom headers,
- application-specific request state.

The result remains:

```text
Fastify Request
      ↓
TenantResolver
      ↓
tenantId
      ↓
AmbitenContext
```

Downstream application code remains independent from the original request mechanism.

## Request Metadata

The adapter runtime can populate other request-scoped values in addition to tenant identity.

Common context concerns include:

```text
tenantId
requestId
dbName
collectionName
debug state
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

These values belong to the active execution context.

They are different from tenant configuration maintained by `MultiTenantManager`.

## Transactions

The Fastify adapter can establish transaction-aware request execution.

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  },

  enableTransactions: true
});
```

When enabled, downstream request execution enters Ambiten through a transaction-aware context.

Conceptually:

```text
Fastify Request
      ↓
Fastify Adapter
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
```

When `enableTransactions` is active, the request is already executing through the adapter's transaction-aware runtime boundary.

You do not need to manually create another request-level transaction merely to make the request transactional.

## Explicit Transaction Boundaries

Applications may instead leave automatic request transactions disabled and use explicit transaction boundaries only where atomic consistency is required.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";

app.post(
  "/orders",
  async () => {
    return AmbitenContext.withTransaction(
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
  }
);
```

The difference is:

```text
enableTransactions: true
→ request-wide transaction boundary

AmbitenContext.withTransaction(...)
→ explicit operation-specific transaction
```

Choose the strategy that matches the application's consistency requirements.

Avoid transaction wrapping when the request does not require transactional behavior.

## Async Context Propagation

The Fastify adapter establishes Ambiten's request-scoped execution boundary before downstream handler execution.

This allows runtime context to remain available across asynchronous operations associated with the request.

For example:

```ts
app.get(
  "/context",
  async () => {
    const before =
      AmbitenContext
        .get()
        .tenantId;

    await Promise.resolve();

    const after =
      AmbitenContext
        .get()
        .tenantId;

    return {
      before,
      after
    };
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

The handler does not need to manually propagate tenant identity across asynchronous calls.

## Services Remain Framework-Independent

One of the benefits of adapter-managed context is that downstream services do not need Fastify request objects merely to access runtime identity.

Avoid:

```text
FastifyRequest
      ↓
Route Handler
      ↓ passes request
Service
      ↓ passes request
Repository
```

Prefer:

```text
Fastify Adapter
      ↓
AmbitenContext
      ↓
Route Handler
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

without depending on `FastifyRequest`.

This keeps application services independent from the HTTP framework.

## Models Use the Active Runtime Context

Once tenant identity has been established, model operations remain simple.

```ts
app.post(
  "/users",
  async (request) => {
    return UserModel.create(
      request.body
    );
  }
);
```

If the active execution contains:

```ts
{
  tenantId: "tenant5"
}
```

the runtime can resolve the tenant infrastructure required for the operation.

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

The model does not need to inspect the Fastify request itself.

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

while authentication separately identifies:

```ts
userId = "usr_2481";
```

An application may therefore maintain:

```ts
{
  tenantId: "tenant5",
  userId: "usr_2481"
}
```

The adapter resolves execution ownership.

Authentication and authorization remain application concerns.

## Security

A client-controlled tenant header should not automatically be treated as proof of authorization.

For example:

```http
x-tenant-id: tenant5
```

may correctly identify `tenant5` while the caller is still unauthorized to access it.

A stronger lifecycle may be:

```text
Fastify Request
      ↓
Authentication
      ↓
Authenticated Identity
      ↓
Ambiten Adapter
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

The application remains responsible for defining its security policy.

## Fastify Plugins and Ambiten

Fastify applications often use plugins to organize authentication, validation, routing, and infrastructure.

The Ambiten adapter should fit into that lifecycle rather than replacing it.

Conceptually:

```text
Fastify Plugin System
      ↓
request preparation
      ↓
Ambiten Adapter Boundary
      ↓
application routes
```

If a plugin populates request information used by the tenant resolver, make sure that information exists before Ambiten attempts tenant resolution.

The goal is one clear runtime entry boundary rather than competing request scopes.

## Error Handling

Tenant resolution or validation may fail before a route handler executes.

Fastify's error handling should remain the application's transport-level error boundary.

Conceptually:

```text
Request
   ↓
Fastify lifecycle
   ↓
Ambiten Adapter
   ↓
Route
   ↓
Fastify error handling
```

For tenant-required routes, an unresolved or invalid tenant should not silently continue against an unrelated/default tenant database.

## Adapter Installation Is Application Infrastructure

The Fastify adapter should normally be created and installed once during application startup.

```ts
const adapter =
  createFastifyAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

Do not create or install a new adapter for every request.

Conceptually:

```text
Application Startup
      ↓
Install Fastify Adapter
      ↓
Server Starts
      ↓
Request A → own AmbitenContext
Request B → own AmbitenContext
Request C → own AmbitenContext
```

The adapter infrastructure is long-lived.

The contexts it establishes are request-scoped.

## Relationship with AmbitenBootstrapFactory

`AmbitenBootstrapFactory` and the Fastify adapter operate at different lifecycle stages.

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

Fastify Adapter
→ connects request execution to that runtime
```

A typical startup sequence is:

```ts
const runtime =
  await AmbitenBootstrapFactory.create();

const app =
  Fastify();

const adapter =
  createFastifyAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

await app.listen({
  port: 3000
});
```

Conceptually:

```text
Process Starts
      ↓
BootstrapFactory
      ↓
Runtime Ready
      ↓
Fastify Instance
      ↓
Adapter Installed
      ↓
Server Accepts Requests
```

## Runtime Shutdown

The Fastify adapter manages request execution boundaries.

It does not replace the application runtime lifecycle.

During application shutdown:

```ts
async function shutdown() {
  await app.close();
  await runtime.shutdown();
}
```

For example:

```ts
process.on(
  "SIGTERM",
  async () => {
    await app.close();
    await runtime.shutdown();
    process.exit(0);
  }
);
```

Shutdown belongs to the process lifecycle, not individual requests.

## ESM and CommonJS

The Fastify adapter supports Ambiten's ESM and CommonJS consumer boundaries.

For ESM:

```text
ESM Application
      ↓
@ambiten/adapter-fastify ESM
      ↓
@ambiten/adapter-runtime ESM
      ↓
@ambiten/core ESM
```

For CommonJS:

```text
CommonJS Application
      ↓
@ambiten/adapter-fastify CJS
      ↓
@ambiten/adapter-runtime CJS
      ↓
@ambiten/core CJS
```

This matters because request-scoped runtime state must remain consistent across the adapter and Core package boundary.

Applications should use public package imports:

```ts
import {
  createFastifyAdapter
} from "@ambiten/adapter-fastify";
```

and:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

Do not import internal build paths such as:

```text
@ambiten/adapter-fastify/dist/...
@ambiten/adapter-runtime/dist/...
@ambiten/core/dist/...
```

Public package exports select the appropriate module format for the consumer.

## Testing Fastify Integration

A meaningful Fastify adapter test should verify the actual request boundary rather than only testing installation.

For example:

```ts
app.get(
  "/context",
  async () => {
    await Promise.resolve();

    return {
      tenantId:
        AmbitenContext
          .get()
          .tenantId
    };
  }
);
```

A request containing:

```http
GET /context
x-tenant-id: tenant5
```

should produce:

```json
{
  "tenantId": "tenant5"
}
```

For multi-tenant integration testing, also inspect the resulting runtime state when appropriate:

```ts
const tenant =
  MultiTenantManager
    .getTenant("tenant5");
```

A tenant that has been used for database access may report:

```ts
{
  tenantId: "tenant5",
  dbName: "db_tenant5",
  connected: true,
  lazy: false
}
```

This validates the complete path:

```text
Fastify
→ Adapter
→ AmbitenContext
→ Model
→ MultiTenantManager
→ Tenant Database
```

## Why Fastify Fits Well with Ambiten

Fastify's lifecycle-oriented design aligns naturally with Ambiten's execution model.

Fastify provides:

```text
request lifecycle
hooks
plugins
routing
transport behavior
```

while Ambiten provides:

```text
execution context
tenant resolution
transaction continuity
runtime infrastructure
model routing
```

The responsibilities complement each other without requiring Ambiten Core to become framework-specific.

## When to Use the Fastify Adapter

The Fastify adapter is well suited for:

- high-throughput APIs,
- hook-driven services,
- Fastify plugin-based applications,
- multi-tenant APIs,
- transaction-aware services,
- systems where low-overhead request handling matters,
- teams that want runtime-aware execution without framework coupling inside services.

Existing Fastify applications can adopt Ambiten without replacing their routing or plugin architecture.

## Recommended Mental Model

Think of the Fastify adapter as an execution-boundary initializer rather than a routing abstraction.

```text
Fastify
→ owns transport and lifecycle

Fastify Adapter
→ enters Ambiten runtime

TenantResolver
→ identifies tenant

AmbitenContext
→ carries execution state

MultiTenantManager
→ resolves tenant resources

AmbitenModel
→ performs data operations

MongoDB
→ persists data
```

Once execution enters Ambiten's runtime boundary, models and services behave consistently with other supported framework adapters.

## Summary

The Fastify adapter connects Fastify's request lifecycle to Ambiten's runtime execution model.

It:

- normalizes Fastify request information,
- resolves tenant identity,
- validates tenancy when configured,
- establishes `AmbitenContext`,
- preserves request-scoped state across async execution,
- supports transaction-aware request boundaries,
- allows dynamic tenant discovery downstream,
- keeps application services independent from Fastify-specific runtime plumbing.

The complete flow is:

```text
Fastify Request
      ↓
Fastify Adapter
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
- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [Tenant Resolution](/architecture/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/architecture/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/architecture/multi-tenancy/framework-adapters)