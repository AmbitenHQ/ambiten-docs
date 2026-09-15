---
title: Framework Adapters
description: Integrate Ambiten's request-scoped runtime, tenant resolution, and multi-tenant database routing with Express, Fastify, NestJS, and other supported frameworks.
---

# Framework Adapters

Framework adapters connect an application's HTTP request lifecycle to Ambiten's runtime.

They provide the boundary between framework-specific request objects and Ambiten's framework-agnostic execution model.

Conceptually:

```text
Framework Request
       ↓
Framework Adapter
       ↓
AmbitenRequestLike
       ↓
adapter-runtime
       ↓
Tenant Resolution
       ↓
AmbitenContext
       ↓
Application Logic
       ↓
AmbitenModel
       ↓
Tenant Database
```

An adapter does not replace the framework.

Express remains Express.

Fastify remains Fastify.

NestJS continues to use its controllers, providers, guards, interceptors, and other framework primitives.

The adapter's responsibility is narrower:

> Enter application execution through Ambiten's request-scoped runtime context.

Once the adapter has established that boundary, Ambiten can propagate tenant identity, request metadata, transaction state, and other runtime information through the active execution.

## Why Framework Adapters Exist

Different frameworks represent requests differently.

For example, tenant identity may originate from:

```text
Express Request
FastifyRequest
NestJS ExecutionContext
```

Core should not need to understand all of those types.

Instead, each adapter normalizes the framework request into the request shape understood by Ambiten's shared adapter runtime.

```text
Express
   ↓
adapter-express
   │
Fastify
   ↓
adapter-fastify
   │
NestJS
   ↓
adapter-nestjs
   │
   └─────────────→ adapter-runtime
                         ↓
                  AmbitenRequestLike
                         ↓
                  AmbitenContext
```

This separation keeps Core independent from HTTP framework implementations while allowing all adapters to share the same context behavior.

## Adapter Responsibilities

A framework adapter typically coordinates the following steps:

1. receive the framework request,
2. normalize request information,
3. resolve tenant identity,
4. validate the tenant when configured,
5. collect request-scoped metadata,
6. create the Ambiten execution context,
7. execute downstream application logic inside that context.

Conceptually:

```text
Incoming Request
      ↓
normalize request
      ↓
resolve tenant
      ↓
validate tenant
      ↓
create context
      ↓
AmbitenContext.run(...)
      ↓
application handler
```

The adapter does not own tenant infrastructure.

It does not need to know:

```text
MongoDB URI
tenant database name
tenant connection state
tenant deployment region
```

Those responsibilities remain with `MultiTenantManager`.

## Shared Adapter Runtime

Framework-specific adapters delegate common runtime behavior to `@ambiten/adapter-runtime`.

This gives the adapter ecosystem one shared context execution path.

Conceptually:

```ts
runWithAdapterContext(
  adaptedRequest,
  handler,
  options
);
```

The adapter runtime can then coordinate:

```text
tenant resolution
request ID
database context
collection context
debug information
logger metadata
custom metadata
transactions
```

before entering application execution.

This prevents each framework adapter from implementing its own version of Ambiten context propagation.

## Tenant Resolution Through Adapters

A common setup resolves tenant identity from a request header.

For example:

```http
x-tenant-id: tenant5
```

The adapter can resolve this into:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

The application can then operate using the resolved runtime identity instead of repeatedly reading the original request.

```text
HTTP Header
x-tenant-id: tenant5
        ↓
Framework Adapter
        ↓
TenantResolver
        ↓
tenant5
        ↓
AmbitenContext
tenantId = tenant5
```

Once the request has entered Ambiten's context, downstream code should normally prefer:

```ts
const { tenantId } =
  AmbitenContext.get();
```

over repeatedly doing:

```ts
req.headers["x-tenant-id"];
```

The request header is transport-specific.

The Ambiten context contains the resolved execution identity.

## Express

Install the Express adapter alongside Core and Express:

```bash
pnpm add @ambiten/core @ambiten/adapter-express express
```

A typical setup looks like:

```ts
import express from "express";
import {
  createExpressAdapter
} from "@ambiten/adapter-express";

const app = express();

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
    limit: "32kb"
  })
);

const ambitenAdapter =
  createExpressAdapter();

await ambitenAdapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

The adapter should be installed before routes that depend on Ambiten context.

```ts
await ambitenAdapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

app.post(
  "/users",
  async (req, res) => {
    const user =
      await UserModel.create(req.body);

    res.status(201).json(user);
  }
);
```

The resulting request flow becomes:

```text
POST /users
x-tenant-id: tenant5
        ↓
Express
        ↓
adapter-express
        ↓
adapter-runtime
        ↓
AmbitenContext
tenantId = tenant5
        ↓
route handler
        ↓
UserModel.create(...)
        ↓
db_tenant5
```

The route does not need to manually wrap itself in:

```ts
AmbitenContext.run(...)
```

The adapter owns that boundary.

## Middleware Ordering in Express

Adapter installation order matters.

Ambiten should enter the request lifecycle before application routes that need runtime context.

A typical ordering is:

```ts
const app = express();

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

await ambitenAdapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});

// Routes requiring Ambiten context
app.use("/users", userRouter);
app.use("/orders", orderRouter);
```

Conceptually:

```text
body parsing
    ↓
Ambiten adapter
    ↓
application routes
```

If Ambiten tenancy depends on request information provided by earlier framework middleware, that middleware should run before the adapter.

Routes that depend on `AmbitenContext` should run after it.

## Fastify

The Fastify adapter serves the same architectural purpose as the Express adapter:

```text
Fastify Request
      ↓
adapter-fastify
      ↓
adapter-runtime
      ↓
AmbitenContext
      ↓
route handler
```

The framework-specific integration may differ, but the runtime contract remains the same.

Once the request has entered Ambiten's context:

```ts
AmbitenContext.get().tenantId
```

represents the resolved tenant for the current execution.

Application code should not need a Fastify-specific tenancy implementation in every route.

The adapter translates the framework request once at the runtime boundary.

## NestJS

NestJS uses a different request lifecycle from Express-style middleware APIs, so its adapter integrates through Nest's execution model.

Conceptually:

```text
NestJS Request
      ↓
ExecutionContext
      ↓
Ambiten Nest Interceptor
      ↓
normalize request
      ↓
adapter-runtime
      ↓
AmbitenContext
      ↓
Controller / Service
```

The interceptor receives the Nest `ExecutionContext`, adapts the HTTP request, and enters downstream execution through Ambiten's shared adapter runtime.

This allows controller and service code to access:

```ts
AmbitenContext.get().tenantId
```

without requiring each controller to manually resolve tenancy.

For example, application code can remain focused on its domain operation:

```ts
@Post()
async createUser(
  @Body() body: CreateUserDto
) {
  return UserModel.create(body);
}
```

while the surrounding adapter lifecycle provides the tenant context.

Conceptually:

```text
POST /users
      ↓
NestJS
      ↓
Ambiten interceptor
      ↓
tenant5
      ↓
AmbitenContext
      ↓
controller
      ↓
service
      ↓
model
      ↓
db_tenant5
```

## Async Context Preservation

Framework adapters must preserve Ambiten context across asynchronous request execution.

This matters because real application flows commonly look like:

```text
request
   ↓
controller
   ↓
await service()
   ↓
await another operation
   ↓
model
   ↓
database
```

For example:

```ts
app.get(
  "/context",
  async (_req, res) => {
    const before =
      AmbitenContext.get().tenantId;

    await Promise.resolve();

    const after =
      AmbitenContext.get().tenantId;

    res.json({
      before,
      after
    });
  }
);
```

For a request belonging to `"tenant5"`, both values should represent the same execution:

```ts
{
  before: "tenant5",
  after: "tenant5"
}
```

Framework adapters establish the AsyncLocalStorage execution boundary that makes this propagation possible.

## ESM and CommonJS Consumers

Ambiten's adapter packages support both ESM and CommonJS consumers.

The module format used by the application should resolve through the matching adapter and Core package boundary.

Conceptually:

```text
ESM application
    ↓
adapter ESM
    ↓
adapter-runtime ESM
    ↓
Core ESM
```

and:

```text
CommonJS application
    ↓
adapter CJS
    ↓
adapter-runtime CJS
    ↓
Core CJS
```

This matters because request-scoped state is owned by the active Core runtime.

All components participating in one request must operate against the same compatible runtime context.

Ambiten's package-boundary integration is verified against both ESM and CommonJS consumers so framework adapters preserve the same request-scoped tenant context through the application lifecycle.

## Adapter Context Options

Framework adapters pass runtime configuration into the shared adapter context layer.

Common context concerns include:

```text
tenant identity
request ID
database name
collection name
debug state
logger metadata
application metadata
transaction behavior
```

For example:

```ts
await ambitenAdapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  },

  enableTransactions: false,

  requestIdHeader:
    "x-request-id",

  dbNameHeader:
    "x-db-name",

  collectionNameHeader:
    "x-collection-name"
});
```

Not every application needs every option.

Tenant-aware applications often begin with only tenant resolution:

```ts
await ambitenAdapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

The remaining context fields can be introduced when the application's runtime model requires them.

## Custom Tenant Resolvers

Adapters are not restricted to a fixed tenant header.

Applications can provide custom tenant resolution logic.

Conceptually:

```ts
await ambitenAdapter.install(app, {
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

```text
authorization token
cookie
route parameter
subdomain
gateway metadata
session
custom request state
```

The adapter's job remains:

```text
framework request
      ↓
tenant identity
      ↓
AmbitenContext
```

Once the tenant has been resolved, downstream application code does not need to know which mechanism produced it.

## Tenant Validation

Adapters can validate a resolved tenant before application logic is entered.

For example:

```ts
await ambitenAdapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant =
        await MultiTenantManager.resolveTenant(
          tenantId
        );

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

The request lifecycle becomes:

```text
Request
   ↓
resolve tenantId
   ↓
tenant5
   ↓
validate tenant5
   ↓
valid?
 ┌──┴──┐
yes    no
 ↓      ↓
context reject
```

Because validation may require dynamic tenant discovery, the validator can be asynchronous.

## Adapters and Dynamic Tenants

Framework adapters identify the tenant.

They do not need to know whether that tenant was registered during startup.

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
model operation
        ↓
MultiTenantManager
        ↓
tenant5 registered?
     ┌─────┴─────┐
    yes          no
     ↓            ↓
 use config   TenantConfigResolver
                   ↓
              register tenant5
                   ↓
                getClient()
```

From the adapter's perspective, both of these are identical:

```text
tenant1
→ statically registered
```

and:

```text
tenant5
→ dynamically discovered
```

The adapter only carries the tenant identity.

`MultiTenantManager` determines how the runtime reaches that tenant.

## Adapters Do Not Own Database Selection

Framework adapters should not manually select the tenant database.

For example, adapter code should not need to perform logic such as:

```ts
const db =
  tenantId === "tenant5"
    ? client.db("db_tenant5")
    : client.db("default");
```

That responsibility belongs to Ambiten's runtime database resolution.

The adapter should provide:

```ts
{
  tenantId: "tenant5"
}
```

through `AmbitenContext`.

The model/client layer then resolves:

```text
tenant5
   ↓
MultiTenantManager
   ↓
tenant configuration
   ↓
MongoClient
   ↓
db_tenant5
```

This prevents HTTP framework integration from becoming coupled to database infrastructure.

## Request Metadata

Adapters can also populate request-scoped information beyond tenancy.

For example, the active context may contain:

```ts
{
  tenantId: "tenant5",
  requestId: "req_123",
  dbName: undefined,
  collectionName: undefined,
  debug: false,
  loggerMeta: {
    source: "api"
  }
}
```

These values belong to the current execution.

They are different from tenant configuration stored by `MultiTenantManager`.

```text
AmbitenContext
→ request/execution information

MultiTenantManager
→ tenant infrastructure
```

## Using Context Inside Application Code

Once the adapter has established the runtime context, any downstream code participating in the same execution can access it.

For example:

```ts
const context =
  AmbitenContext.get();

console.log(
  context.tenantId
);
```

A service may do:

```ts
export async function createUser(
  input: CreateUserInput
) {
  const { tenantId } =
    AmbitenContext.get();

  if (!tenantId) {
    throw new Error(
      "Tenant context is required."
    );
  }

  return UserModel.create({
    ...input,
    tenantId
  });
}
```

The service does not need an Express `Request`, a Fastify request object, or a NestJS `ExecutionContext`.

That is one of the primary advantages of resolving transport-specific information at the adapter boundary.

## Avoid Passing Framework Request Objects Into Domain Services

Without a runtime context, applications may end up doing this:

```text
Controller
   ↓ passes req
Service
   ↓ passes req
Repository
   ↓ reads header
Model
```

This couples application layers to the HTTP framework.

Ambiten allows:

```text
Controller
   ↓
Service
   ↓
Repository
   ↓
Model
```

while tenant identity remains independently available through:

```ts
AmbitenContext.get().tenantId
```

Domain services therefore do not need to depend on:

```text
Express.Request
FastifyRequest
NestJS ExecutionContext
```

just to know which tenant owns the execution.

## Request Identity vs User Identity

Tenant identity should not automatically be treated as authenticated user identity.

For example:

```http
x-tenant-id: tenant5
```

may resolve:

```ts
tenantId = "tenant5";
```

This identifies the tenant associated with the request.

It does not necessarily identify an individual user.

Applications may separately maintain:

```ts
{
  tenantId: "tenant5",
  userId: "usr_2481"
}
```

The framework adapter establishes tenant context.

Authentication and authorization remain application concerns.

## Security Boundary

A client-controlled tenant header should not automatically grant access to that tenant.

For example:

```http
x-tenant-id: tenant5
```

may be syntactically valid while still being unauthorized for the authenticated caller.

A stronger request lifecycle may be:

```text
Request
   ↓
Authentication
   ↓
Authenticated identity
   ↓
Tenant Resolution
   ↓
Tenant Authorization
   ↓
AmbitenContext
   ↓
Application
```

Framework adapters provide the runtime boundary.

Applications remain responsible for defining who is allowed to act for a tenant.

## Transaction-Aware Requests

The shared adapter runtime can also enter request execution with transaction support enabled.

Conceptually:

```ts
await adapter.install(app, {
  enableTransactions: true,
  tenancy: {
    header: "x-tenant-id"
  }
});
```

The request lifecycle becomes:

```text
Request
   ↓
resolve context
   ↓
AmbitenContext.run(...)
   ↓
transaction scope
   ↓
application handler
```

This allows transaction state to participate in the same request-scoped runtime context as tenant identity.

Exact transaction behavior depends on the application and database operation being executed.

## Adapter Installation Is Runtime Infrastructure

Adapter setup should normally happen once during application bootstrap.

For example:

```ts
const adapter =
  createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

Application routes then operate inside the established runtime boundary.

Avoid installing or recreating the adapter separately for each request.

Conceptually:

```text
Application Bootstrap
        ↓
Install Adapter
        ↓
Server Starts
        ↓
Request A ─┐
Request B ─┼→ adapter runtime context
Request C ─┘
```

Each request receives its own execution context even though the adapter infrastructure is installed once.

## Application Shutdown

Framework adapters establish request boundaries, but Ambiten runtime resources should still be shut down at the application lifecycle boundary.

For example:

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

Shutdown belongs to process or application termination.

Request handling and runtime lifecycle are separate concerns.

## Testing Adapter Integration

A useful adapter integration test should verify the entire request-context boundary rather than only testing resolver functions in isolation.

For example:

```text
send HTTP request
      ↓
x-tenant-id: tenant5
      ↓
framework adapter
      ↓
AmbitenContext
      ↓
async boundary
      ↓
controller/route
      ↓
tenantId still equals tenant5
```

A representative assertion is:

```ts
expect(
  AmbitenContext.get().tenantId
).toBe("tenant5");
```

after an asynchronous operation.

For multi-tenant integration tests, also verify that the model operation ultimately reaches the expected tenant runtime state.

For example:

```ts
const tenant =
  MultiTenantManager.getTenant(
    "tenant5"
  );

expect(tenant?.dbName)
  .toBe("db_tenant5");
```

This tests the adapter as part of the runtime rather than merely testing framework middleware registration.

## Package-Boundary Verification

Adapter integration should also be tested using built packages rather than only workspace source.

This matters because runtime behavior can depend on package resolution.

A production-like integration path is:

```text
external consumer application
        ↓
packed adapter package
        ↓
packed adapter-runtime
        ↓
packed Core
```

Ambiten verifies both:

```text
ESM consumer
```

and:

```text
CommonJS consumer
```

so that request-scoped context remains consistent across supported module formats.

This type of integration testing complements package-level unit tests by verifying the same boundaries encountered by real applications.

## Choosing an Adapter

Use the adapter that matches the application's request framework.

```text
Express
→ @ambiten/adapter-express

Fastify
→ @ambiten/adapter-fastify

NestJS
→ @ambiten/adapter-nestjs
```

The framework-specific package handles request integration.

The shared Ambiten concepts remain the same:

```text
resolve request identity
        ↓
enter AmbitenContext
        ↓
execute application
        ↓
resolve tenant resources
        ↓
perform model operation
```

This allows applications built on different frameworks to share the same underlying Ambiten runtime model.

## Recommended Mental Model

A useful way to understand framework integration is:

```text
Framework
→ owns request mechanics

Framework Adapter
→ translates request mechanics into Ambiten execution

adapter-runtime
→ establishes request-scoped context

AmbitenContext
→ carries execution identity

MultiTenantManager
→ owns tenant infrastructure

AmbitenModel
→ performs data operations
```

Or as one continuous flow:

```text
HTTP Request
     ↓
Framework
     ↓
Ambiten Adapter
     ↓
Tenant Resolution
     ↓
AmbitenContext
     ↓
Application Logic
     ↓
AmbitenModel
     ↓
MultiTenantManager
     ↓
Tenant MongoDB Client
     ↓
Tenant Database
```

Each layer has one clear responsibility.

That separation allows Ambiten to remain framework-agnostic at its Core while still integrating naturally with framework request lifecycles.

## Related Pages

Continue with:

- [Multi-Tenancy Overview](./overview) — the overall Ambiten tenancy architecture.
- [Tenant Resolution](./tenant-resolution) — how incoming requests become tenant identities.
- [MultiTenantManager](./multi-tenant-manager) — tenant registry, resolution, connection lifecycle, and runtime state.
- [Dynamic Tenants](./dynamic-tenants) — resolving tenants that are not registered during application startup.

For exact adapter configuration types, installation methods, and framework-specific APIs, see the corresponding generated API reference for each adapter package.