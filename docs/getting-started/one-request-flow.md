---
title: One Request Flow
description: Follow one framework request through Ambiten from adapter ingress and execution context to model execution, infrastructure resolution, MongoDB persistence, and response completion.
---

# One Request Flow

This page follows a single framework request through the Ambiten runtime from ingress to MongoDB and back to the host framework.

Its purpose is to show how:

```text
adapter ingress
tenant resolution
AmbitenContext
application logic
AmbitenModel
effective ModelContext
middleware
infrastructure resolution
AmbitenClient
MongoDB
```

participate in one coordinated execution.

This is a **request-oriented example** of Ambiten's wider execution model.

Background jobs, workers, scripts, and other non-request execution paths can establish the same runtime state explicitly through `AmbitenContext.run(...)`.

## The Request Execution Model

For a supported framework request, the core flow is:

<SignalFlow
  aria-label="One request core flow"
  :items='[
    "Request",
    "Adapter",
    "AmbitenContext",
    "Application",
    "AmbitenModel",
    "Infrastructure Resolution",
    "MongoDB"
  ]'
/>

The detailed path is:

```text
Request
   ↓
Framework Adapter
   ↓
Adapter Runtime
   ↓
Tenant + Request Metadata Resolution
   ↓
AmbitenContext
   ↓
Application Handler
   ↓
AmbitenModel
   ↓
Effective ModelContext
   ↓
Schema / Middleware
   ↓
Provider / MultiTenantManager
   ↓
AmbitenClient
   ↓
MongoDB
   ↓
Result
   ↓
Framework Response
```

The framework can change.

The runtime responsibilities remain separated.

## A Simple Request

A client sends:

```http
GET /users

x-tenant-id: tenant-a
x-request-id: req-123
```

An Express handler may remain completely ordinary:

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

At the application layer, this is simply:

```ts
await UserModel.find({});
```

Underneath that call, Ambiten may coordinate:

```text
request normalization
tenant identity
execution context
effective ModelContext
schema behavior
middleware
tenant infrastructure
database resolution
collection resolution
MongoDB execution
instrumentation
transaction participation
```

without requiring the route handler to manually coordinate those concerns.

## 1. Request Ingress

Execution begins when the host framework receives the request.

```text
HTTP Request
      ↓
Express / Fastify / NestJS
      ↓
Ambiten Adapter
```

The adapter integrates the framework with Ambiten's execution model.

For example:

```ts
createExpressAdapter()
  .install(app, {
    tenancy: {
      header: "x-tenant-id",

      validate: async (
        tenantId
      ) => {
        const tenant =
          await MultiTenantManager
            .resolveTenant(
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

At this stage, the adapter works with framework-specific request information.

Depending on adapter configuration, that may include access to:

```text
headers
method
URL
route parameters
query parameters
cookies
body
```

The adapter runtime normalizes the host request into the shape required by Ambiten's execution boundary.

## 2. Tenant Resolution

If tenancy is configured, the adapter resolves the tenant identity before application logic executes.

For this request:

```text
x-tenant-id
      ↓
tenant-a
```

Conceptually:

```text
Request
   ↓
TenantResolver
   ↓
tenantId = tenant-a
```

Tenant resolution answers:

> **Which tenant does this execution belong to?**

It does not yet answer:

```text
Which MongoClient belongs to tenant-a?

Which database should be used?

Is the caller authorized for tenant-a?
```

Those are separate concerns.

## 3. Tenant Validation

Where tenant validation is configured, the resolved identity can be validated before the execution boundary continues.

Conceptually:

```text
tenant-a
   ↓
validate(...)
   ↓
valid?
```

If required tenant resolution or validation fails, the request should fail rather than silently switching to an unrelated default tenant.

Tenant identity is therefore established deliberately before model execution begins.

## 4. Request Metadata Resolution

The adapter runtime may also resolve execution metadata such as:

```text
requestId
dbName
collectionName
debug state
logger metadata
custom runtime metadata
```

For example:

```text
tenantId  = tenant-a
requestId = req-123
```

These values form part of the execution state that will be bound to `AmbitenContext`.

## 5. Context Initialization

Once request-level resolution is complete, Ambiten establishes the execution boundary.

Conceptually:

```ts
await AmbitenContext.run(
  {
    tenantId:
      "tenant-a",

    requestId:
      "req-123"
  },

  async () => {
    // downstream application execution
  }
);
```

The resulting `AmbitenContextState` can carry values such as:

```text
tenantId
requestId
dbName
collectionName
session
loggerMeta
logger
debug
meta
observer
budget
```

From this point, those values remain associated with the active asynchronous execution boundary.

## 6. Async Context Continuity

Ambiten uses asynchronous execution context so downstream work can remain associated with the same runtime state.

Conceptually:

```text
AmbitenContext
      ↓
controller
      ↓
service
      ↓
async operation
      ↓
model
```

The application does not need to manually forward:

```text
tenantId
requestId
session
```

through every function signature merely so runtime infrastructure can access them.

The context remains execution-scoped rather than being stored as mutable global request state.

## 7. Application Execution

The route handler now runs inside the active Ambiten boundary.

```ts
const users =
  await UserModel.find({});
```

The application layer does not need:

```ts
await UserModel.find(
  {},
  {
    tenantId,
    requestId,
    session
  }
);
```

for ordinary context-driven execution.

Those values already belong to the execution boundary.

Explicit operation context remains available where the API intentionally supports an override.

## 8. AmbitenModel Receives the Operation

`AmbitenModel` now receives:

```text
find({})
```

against its structurally defined model configuration.

That definition may already contain:

```text
schema
collectionName
provider
middleware
model defaults
```

But request-specific state is not stored permanently on the model.

Instead, the model derives an effective operation context.

## 9. Effective ModelContext Resolution

The model combines the relevant runtime sources.

The precedence is:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

Conceptually:

```text
AmbitenContext.get()
        +
operation context
        +
model defaults
        ↓
AmbitenModel.mergeCtx()
        ↓
Effective ModelContext
```

For this request, the resulting operation context may contain:

```text
tenantId = tenant-a
requestId = req-123
collectionName = users
session = active session if transactional
```

`ModelContext` is therefore the persistence-facing operation context derived from the wider execution state.

## 10. AmbitenContextState vs ModelContext

These two contracts serve different purposes.

```text
AmbitenContextState
= full execution-scoped runtime state
```

while:

```text
ModelContext
= model-operation-facing state
```

Conceptually:

```text
AmbitenContextState
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext
```

The model runtime does not require every schema or provider to consume the entire `AmbitenContextState`.

Instead, the relevant operation state is projected into the effective `ModelContext`.

## 11. Schema Participation

The model's schema now participates in the operation.

Conceptually:

```text
Effective ModelContext
      ↓
AmbitenSchema
      ↓
validation / policy
```

The schema can contribute concerns such as:

```text
document validation
normalization
lifecycle behavior
persistence policy
middleware registration
soft-delete behavior
```

The schema does not resolve the tenant or create database infrastructure.

It participates in the model operation using the effective context prepared by the model.

## 12. Middleware Execution

Configured middleware can execute around the model operation.

Conceptually:

```text
before middleware
      ↓
operation
      ↓
after middleware
```

Middleware may use operation state such as:

```text
tenantId
requestId
session
database scope
soft-delete controls
```

where exposed by the middleware contract.

Because middleware participates in the same model operation, it does not need framework-specific request objects merely to understand persistence execution state.

## 13. Collection Resolution

The model owns its collection boundary.

For example:

```ts
collectionName: "users"
```

The effective collection may come from:

```text
supported operation override
        ↓
active context
        ↓
model collection configuration
```

according to the model's resolution rules.

Conceptually:

```text
AmbitenModel
      ↓
effective collection
      ↓
users
```

Collection ownership remains with the model rather than the provider.

## 14. Infrastructure Resolution

Once the model requires persistence, the effective `ModelContext` is used to resolve infrastructure.

Conceptually:

```text
AmbitenModel
      ↓
Effective ModelContext
      ↓
DbProvider
      ↓
database / client / session
```

For tenant-aware execution, `MultiTenantManager` may also participate.

```text
ModelContext.tenantId
      ↓
tenant infrastructure resolution
      ↓
MongoDB client
      ↓
database
```

Infrastructure resolution answers:

> **What database resources should execute this operation?**

## 15. Tenant Infrastructure Resolution

For this request:

```text
tenantId = tenant-a
```

The runtime may follow:

```text
tenant-a
   ↓
MultiTenantManager
   ↓
TenantConfig
   ↓
Tenant MongoClient
   ↓
Tenant Database
```

If the tenant is already registered, its existing runtime infrastructure can be reused.

If dynamic tenant discovery is configured and the tenant is not yet registered:

```text
tenant-a
   ↓
resolveTenant()
   ↓
TenantConfigResolver
   ↓
register
   ↓
getClient()
```

The application handler remains unchanged.

```ts
await UserModel.find({});
```

## 16. Lazy Tenant Activation

A tenant can be known to the runtime without already having an active MongoDB connection.

For example:

```text
registered = true
connected = false
lazy = true
```

When the request actually requires persistence:

```text
MultiTenantManager.getClient()
      ↓
connect tenant client
      ↓
tenant database
```

Lazy connection behavior therefore belongs to infrastructure resolution, not application logic.

## 17. Provider Resolution

Where a `DbProvider` participates, it receives the effective `ModelContext`.

For example:

```ts
const db =
  await provider.db(ctx);
```

The provider can resolve:

```text
database
MongoClient
session capability
runtime database overrides
```

It does not determine the request's original tenant identity.

That identity has already been established upstream.

<SignalFlow
  aria-label="Provider and model responsibility flow"
  :items='[
    "Model resolves operation + collection",
    "Provider resolves infrastructure"
  ]'
/>

## 18. AmbitenClient Participation

When `AmbitenClient` is used as the model's provider, the model path becomes:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
AmbitenClient.db(ctx)
      ↓
MongoDB Db
```

This distinction is important.

During model execution, `AmbitenClient` does not need to independently reconstruct the active request state.

The model has already projected the relevant execution state into `ModelContext`.

## 19. Tenant-Aware AmbitenClient Resolution

For a tenant-aware operation, `AmbitenClient` can resolve the appropriate MongoDB client through its configured tenant resolver.

Conceptually:

```text
ModelContext
tenantId = tenant-a
      ↓
AmbitenClient
      ↓
tenantResolver.getClient(
  "tenant-a"
)
      ↓
Tenant MongoClient
```

The tenant database name can then resolve from:

```text
explicit ModelContext.dbName
        ↓
tenant configuration
        ↓
client default
```

This keeps infrastructure selection outside application services.

## 20. Transaction Participation

If the request is executing inside a transaction boundary, the active session is already part of `AmbitenContext`.

```text
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
```

Participating Ambiten model operations then execute against the same active session.

Application code remains:

```ts
await UserModel.find({});
```

or:

```ts
await UserModel.create(data);
```

without manually forwarding the session through every service layer.

## 21. Adapter-Managed Transactions

If the adapter was configured with:

```ts
enableTransactions: true
```

the request execution may be wrapped in an execution-wide transaction boundary.

Conceptually:

```text
Request
   ↓
Adapter
   ↓
AmbitenContext
   ↓
Transaction Boundary
   ↓
Handler
   ↓
Model Operations
```

The transaction boundary owns:

```text
session lifecycle
commit
rollback
```

Models simply participate in the active transaction.

## 22. MongoDB Persistence

Once database, collection, client, and any active session have been resolved, the finalized operation reaches MongoDB.

Conceptually:

```ts
db
  .collection("users")
  .find(filter)
  .toArray();
```

The important point is that the model operation reaches MongoDB only after its effective execution scope has been determined.

```text
tenant
database
collection
session
operation options
```

have already been resolved by the appropriate runtime layers.

## 23. Persistence Result

MongoDB returns the result into the same execution chain.

```text
MongoDB
   ↓
AmbitenClient
   ↓
AmbitenModel
```

The operation can then continue through any configured post-operation behavior.

## 24. Post-Operation Middleware

Post middleware can execute after persistence while still participating in the same model operation.

Conceptually:

```text
MongoDB Result
      ↓
post middleware
      ↓
model result
```

This allows schema/model policies to remain consistent regardless of the framework that initiated the request.

## 25. Instrumentation and Logging

Runtime instrumentation can observe execution metadata such as:

```text
tenantId
requestId
database
collection
operation
duration
outcome
error information
```

where the instrumentation implementation supports those signals.

`AmbitenContext` provides structured execution metadata.

The behavior of the configured logger or telemetry backend remains separate from persistence correctness.

## 26. Transaction Completion

If an enclosing transaction boundary exists, transaction completion occurs after the participating application work finishes.

Conceptually:

```text
Model Operations
      ↓
application callback completes
      ↓
Transaction Boundary
      ↓
commit
```

or:

```text
Model Operation fails
      ↓
callback rejects
      ↓
Transaction Boundary
      ↓
rollback
```

The transaction boundary—not individual model post-processing—owns commit or rollback.

## 27. Response Egress

Once application execution has completed successfully, the result returns through the host framework.

```ts
res.json(users);
```

Conceptually:

```text
MongoDB Result
      ↓
Model
      ↓
Application Handler
      ↓
Framework
      ↓
HTTP Response
```

The adapter does not need to transform the business result into a special Ambiten response type.

The host framework continues to own its transport response semantics.

## 28. Execution Boundary Completion

When the request execution finishes, the execution-scoped context is no longer the active context for future unrelated work.

```text
Request A
   ↓
AmbitenContext A
   ↓
complete


Request B
   ↓
AmbitenContext B
```

Execution state does not become process-global state merely because the runtime infrastructure itself is reusable.

## Runtime Flow

<OneRequestFlowVisual />

The complete request path is:

```text
Request
   ↓
Adapter
   ↓
Adapter Runtime
   ↓
Tenant Resolution
   ↓
AmbitenContext
   ↓
Application Logic
   ↓
AmbitenModel
   ↓
Effective ModelContext
   ↓
Schema / Middleware
   ↓
Collection Resolution
   ↓
Provider / MultiTenantManager
   ↓
AmbitenClient
   ↓
MongoDB
   ↓
Post-Operation Behavior
   ↓
Transaction Completion if active
   ↓
Response
```

## Responsibility Boundaries

A useful way to understand the flow is by ownership.

```text
Adapter
→ request ingress

TenantResolver
→ tenant identity

AmbitenContext
→ execution state

Application
→ business behavior

AmbitenModel
→ operation coordination + effective context

AmbitenSchema
→ persistence structure + policy

Model
→ collection boundary

DbProvider
→ database / client / session contract

MultiTenantManager
→ tenant infrastructure

AmbitenClient
→ MongoDB capability

Transaction Boundary
→ commit / rollback

MongoDB
→ persistence

Framework
→ response transport
```

No single layer is responsible for the entire request.

That separation is deliberate.

## Tenant Identity vs Infrastructure

One of the most important distinctions in this flow is:

```text
Tenant Resolution
      ↓
tenantId
```

versus:

```text
Infrastructure Resolution
      ↓
TenantConfig
MongoClient
Database
```

The first answers:

> **Who is this request for?**

The second answers:

> **What infrastructure belongs to that tenant?**

Keeping those questions separate prevents request adapters from becoming database managers and prevents database infrastructure from needing to understand framework requests.

## Context vs ModelContext

The request also contains two related context layers.

```text
AmbitenContextState
= full request/execution state
```

and:

```text
ModelContext
= operation-facing model state
```

The bridge between them is:

```text
AmbitenModel.mergeCtx()
```

Conceptually:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
```

This is why schema, middleware, and provider behavior do not each need to independently reconstruct the original framework request.

## Request Isolation

Each request receives its own execution-scoped state.

For example:

```text
Request A
tenantId = tenant-a
requestId = req-a
      ↓
UserModel
      ↓
tenant-a infrastructure
```

while concurrently:

```text
Request B
tenantId = tenant-b
requestId = req-b
      ↓
UserModel
      ↓
tenant-b infrastructure
```

The model definition can be shared.

The execution state is not.

## Resource Reuse

Request isolation does not mean every request creates new infrastructure.

For example:

```text
Request A
tenant-a
      ↓
existing tenant-a MongoClient
```

and later:

```text
Request B
tenant-a
      ↓
same reusable tenant-a MongoClient
```

This is desirable.

```text
execution state
→ isolated

infrastructure
→ reusable
```

The distinction allows Ambiten to preserve execution correctness without treating MongoDB clients as request-scoped objects.

## What the Request Flow Does Not Mean

This flow does not mean:

```text
every Ambiten execution requires an HTTP request
```

Non-request execution can begin through:

```ts
AmbitenContext.run(...)
```

It also does not mean:

```text
tenant resolution performs authorization
```

or:

```text
every MongoDB operation automatically joins a transaction
```

or:

```text
all telemetry delivery is guaranteed
```

Each of those concerns has its own contract.

## Framework Independence

The same basic request model can be established by different integrations.

```text
Express
Fastify
NestJS
GraphQL
Lambda
```

Each framework has a different ingress mechanism.

But once execution has entered the Ambiten boundary:

```text
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
ModelContext
      ↓
Infrastructure Resolution
```

the model runtime remains framework-independent.

## Non-Request Execution

The same model can also execute outside a framework request.

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "job-42"
  },

  async () => {
    await UserModel.find({});
  }
);
```

Conceptually:

```text
Job
  ↓
AmbitenContext
  ↓
Application
  ↓
AmbitenModel
  ↓
Effective ModelContext
  ↓
Infrastructure Resolution
  ↓
MongoDB
```

The ingress changes.

The model runtime does not.

## Why This Architecture Matters

Without a runtime execution model, a request often turns into:

```text
Controller
   ↓ tenantId
Service
   ↓ tenantId + session
Repository
   ↓ db + session
Model
```

Ambiten instead allows:

```text
Request
   ↓
Execution Boundary
   ↓
AmbitenContext
   ↓
Application
   ↓
AmbitenModel
   ↓
Infrastructure Resolution
```

Application APIs can stay focused on application behavior.

Runtime infrastructure remains in runtime layers.

That separation becomes especially valuable as applications introduce:

```text
multi-tenancy
dynamic tenants
transactions
multiple frameworks
background execution
instrumentation
scoped infrastructure
```

## Mental Model

A useful request mental model is:

```text
Adapter establishes execution.

Context carries execution.

Application defines intent.

Model binds intent to effective operation state.

Infrastructure determines where it executes.

MongoDB performs persistence.

Framework returns the result.
```

Or more compactly:

```text
Request
→ Context
→ Operation
→ Infrastructure
→ Persistence
→ Response
```

## Summary

A request in Ambiten is more than a framework handler calling MongoDB.

It is a coordinated execution lifecycle.

```text
Request
      ↓
Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Provider / MultiTenantManager
      ↓
AmbitenClient
      ↓
MongoDB
      ↓
Transaction Completion if active
      ↓
Response
```

Each layer owns a distinct responsibility.

The adapter does not own persistence.

The context does not own tenant infrastructure.

The model does not own the MongoDB connection lifecycle.

The provider does not own collection definition.

`MultiTenantManager` does not own request identity.

`AmbitenClient` does not own application orchestration.

MongoDB does not define the application execution boundary.

Together, those layers allow a simple application call:

```ts
await UserModel.find({});
```

to participate in a tenant-aware, transaction-aware, context-aware runtime without turning application code into infrastructure plumbing.

> **The application defines the operation. Ambiten coordinates the execution around it.**