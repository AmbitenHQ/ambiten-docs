---
title: Runtime Execution Flow
description: Understand how execution moves through Ambiten from ingress and context establishment to models, tenant infrastructure, MongoDB persistence, and egress.
---

# Runtime Execution Flow

This document describes how Ambiten executes an operation from entry to persistence.

It connects the major components of the runtime into one execution path so you can understand how execution context, tenant identity, models, infrastructure resolution, clients, transactions, and MongoDB interact.

The host environment may change.

The underlying runtime path remains consistent.

## Core Idea

An Ambiten execution follows a context-driven sequence:

<SignalFlow
  aria-label="Runtime core flow"
  :items='[
    "Execution Boundary",
    "Context",
    "Model",
    "Provider",
    "Client",
    "MongoDB"
  ]'
/>

Conceptually:

```text
Execution Entry
      ↓
Execution Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

For tenant-aware execution, infrastructure resolution may additionally involve:

```text
AmbitenContext.tenantId
        ↓
MultiTenantManager
        ↓
Tenant Configuration
        ↓
Tenant MongoDB Client
        ↓
Tenant Database
```

Each layer owns a distinct responsibility.

Execution moves through those layers without requiring application code to manually propagate runtime infrastructure state.

## Execution Boundary

Before examining the individual stages, it is important to distinguish two ways execution can enter Ambiten.

### Adapter-Managed Execution

Supported frameworks establish the execution boundary through their adapters.

```text
Express
Fastify
NestJS
GraphQL
AWS Lambda
      ↓
Framework Adapter
      ↓
Adapter Runtime
      ↓
AmbitenContext
```

### Explicit Execution

Execution without a framework adapter establishes context directly.

For example:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant5",
    requestId: "job-123"
  },

  async () => {
    await UserModel.find({});
  }
);
```

This is appropriate for:

- background workers,
- queue consumers,
- scheduled jobs,
- migrations,
- maintenance tools,
- custom execution environments.

The common rule is:

```text
Every runtime-aware operation
must execute inside
an Ambiten execution boundary.
```

How that boundary is established depends on the entry environment.

# Execution Lifecycle

## 1. Ingress

Execution begins at an external entry point.

Examples include:

```text
HTTP request
GraphQL operation
NestJS controller request
Lambda invocation
queue message
scheduled job
worker task
CLI operation
```

For supported frameworks, the corresponding adapter owns the ingress boundary.

For non-adapter execution, the application establishes `AmbitenContext` explicitly.

Conceptually:

```text
External Work
      ↓
Adapter
   or
Explicit Context
      ↓
Ambiten Runtime
```

Ingress identifies the beginning of one logical execution.

## 2. Adapter Normalization

For adapter-managed execution, the framework-specific adapter translates its host request or invocation into the normalized request representation understood by `@ambiten/adapter-runtime`.

Conceptually:

```text
Express Request
Fastify Request
NestJS Request
GraphQL Request
Lambda Event
      ↓
Framework Adapter
      ↓
AmbitenRequestLike
```

The normalized boundary can expose information such as:

```text
headers
URL
HTTP method
route parameters
cookies
query parameters
body
request metadata
```

The exact source depends on the host environment.

Core does not need to understand framework-specific request types.

## 3. Tenant and Metadata Resolution

The adapter runtime resolves execution-scoped information before application logic begins.

For example:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  },

  requestIdHeader:
    "x-request-id"
});
```

A request:

```http
GET /users
x-tenant-id: tenant5
x-request-id: req-123
```

may resolve to:

```ts
{
  tenantId: "tenant5",
  requestId: "req-123"
}
```

The important distinction is:

```text
TenantResolver
→ resolves execution identity

MultiTenantManager
→ resolves tenant infrastructure
```

The adapter resolves **who the execution belongs to**.

It does not need to know how the runtime reaches that tenant's database.

## 4. Tenant Validation

When tenancy validation is configured, the resolved identity can be checked before downstream execution begins.

For example:

```ts
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
```

The flow becomes:

```text
tenantId
   ↓
validation
   ↓
valid?
 ┌──┴──┐
yes    no
 ↓      ↓
continue reject
```

Validation may include dynamic tenant discovery.

The tenant therefore does not need to have been registered during application startup.

## 5. Context Initialization

After execution metadata has been resolved, Ambiten establishes the active runtime context.

Conceptually:

```ts
AmbitenContext.run(
  {
    tenantId,
    requestId,
    dbName,
    collectionName,
    debug,
    loggerMeta,
    meta
  },

  handler
);
```

This creates the execution-scoped runtime boundary.

The context may carry values such as:

```text
tenantId
requestId
database override
collection override
debug state
logger metadata
custom metadata
transaction session
```

These values belong to the active execution.

They are not process-global state.

## Context Resolution Model

Runtime-aware components resolve execution state from the active `AmbitenContext` rather than requiring that information to be manually passed through every application function.

Instead of:

```ts
await service.createUser(
  tenantId,
  requestId,
  session,
  data
);
```

application code can remain focused on domain input:

```ts
await service.createUser(
  data
);
```

while infrastructure-aware components can resolve:

```ts
const context =
  AmbitenContext.get();
```

when runtime state is required.

This keeps execution state available without coupling domain APIs to infrastructure propagation.

## 6. Framework-Specific Execution Continuity

Different frameworks enter the runtime differently.

### Express

```text
Express middleware
      ↓
AmbitenContext
      ↓
downstream middleware/routes
```

### Fastify

```text
Fastify lifecycle
      ↓
AmbitenContext
      ↓
route handler
```

### NestJS

```text
NestJS interceptor
      ↓
AmbitenContext
      ↓
Observable subscription
      ↓
controller
      ↓
service
```

For NestJS, the actual downstream Observable execution remains inside the Ambiten boundary rather than only creating the Observable inside it.

### GraphQL

```text
GraphQL context factory
      ↓
AmbitenContext
      ↓
resolver execution
```

### AWS Lambda

```text
Lambda invocation
      ↓
adapter wrapper
      ↓
fresh AmbitenContext
      ↓
handler
```

The integration mechanism changes.

The execution contract remains the same.

## 7. Application Execution

Controllers, handlers, resolvers, services, or workers now execute inside the active runtime boundary.

For example:

```ts
await UserModel.find({});
```

Application logic does not need to manually forward:

```text
tenantId
requestId
MongoDB URI
database name
transaction session
tenant client
```

through every layer.

The active runtime boundary already carries the execution-scoped information required downstream.

## 8. Async Context Continuity

Execution context remains associated with asynchronous operations belonging to the active scope.

For example:

```ts
const before =
  AmbitenContext
    .get()
    .tenantId;

await someAsyncOperation();

const after =
  AmbitenContext
    .get()
    .tenantId;
```

For one execution:

```ts
before === after;
```

Conceptually:

```text
Controller
   ↓
Service
   ↓
await
   ↓
Repository
   ↓
Model
```

The execution remains associated with the same runtime context throughout that asynchronous chain.

## 9. Model Execution

When execution reaches `AmbitenModel`, the operation enters the model execution pipeline.

For example:

```ts
await UserModel.find({});
```

or:

```ts
await UserModel.create({
  username: "Alice"
});
```

The model coordinates behavior such as:

```text
schema validation
operation preparation
middleware
execution metadata
context resolution
collection resolution
infrastructure selection
result processing
```

The model does not need an Express request, Fastify request, NestJS `ExecutionContext`, GraphQL context object, or Lambda event.

It operates against Ambiten's runtime abstractions.

## 10. Model Context Resolution

Before resolving persistence infrastructure, the model determines the effective operation context.

Conceptually, runtime values follow this precedence:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

This allows explicit operation-level overrides where supported while preserving the request-scoped execution state established by the runtime.

For tenant-aware operations:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

becomes part of the infrastructure-resolution decision.

## 11. Infrastructure Resolution

The model now resolves the database and collection required for the operation.

Conceptually:

```text
Model Operation
      ↓
Effective Context
      ↓
Provider / Client Resolution
      ↓
Database
      ↓
Collection
```

For non-tenant execution, this may resolve against the configured application database.

For tenant-aware execution:

```text
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
tenant5 configuration
      ↓
tenant5 client
      ↓
db_tenant5
```

This is where execution identity becomes concrete infrastructure selection.

## Provider Resolution

Where provider abstractions participate in model execution, they resolve infrastructure bindings from the active operation context.

Conceptually:

```ts
const db =
  await provider.db(ctx);
```

The provider layer can participate in decisions such as:

```text
database selection
collection resolution
session resolution
runtime overrides
client selection
```

Provider resolution does not determine the request tenant identity.

It consumes the execution state already established upstream.

## 12. Multi-Tenant Resolution

When the effective context contains a tenant ID, Ambiten can resolve tenant infrastructure through `MultiTenantManager`.

Conceptually:

```text
tenantId = tenant5
      ↓
MultiTenantManager.getTenant()
      ↓
registered?
 ┌────┴────┐
yes        no
 ↓          ↓
use      resolveTenant()
config        ↓
         TenantConfigResolver
              ↓
          register tenant
```

If database access requires a live client:

```text
tenant configuration
      ↓
getClient()
      ↓
connected client
```

The distinction remains:

```text
getTenant()
→ local registry lookup

resolveTenant()
→ registry + dynamic discovery

getClient()
→ resolution + usable client
```

## 13. Dynamic Tenant Discovery

If the tenant does not exist in the local runtime registry and a `TenantConfigResolver` is configured, Ambiten can discover it dynamically.

```text
tenant5
   ↓
not locally registered
   ↓
TenantConfigResolver
   ↓
external tenant source
   ↓
TenantConfig
   ↓
register tenant5
```

The source may be application-defined infrastructure such as:

```text
control database
tenant registry
configuration service
account service
infrastructure API
```

Application model code remains unchanged.

The model does not need to know whether a tenant was static or dynamic.

## 14. Lazy Client Activation

Tenant registration and connection establishment are separate lifecycle stages.

A tenant may be:

```text
registered
+
lazy
+
not connected
```

until an operation requires database access.

The lifecycle can therefore be:

```text
tenant registered
      ↓
lazy
      ↓
model requires database
      ↓
MultiTenantManager.getClient()
      ↓
MongoDB client established
      ↓
tenant active
```

This allows runtime resource usage to follow actual tenant demand.

## 15. Client Execution

After infrastructure resolution, `AmbitenClient` participates in the MongoDB execution path.

At this stage, the runtime has resolved the required:

```text
client
database
collection
session
operation options
```

The finalized operation can then be expressed through MongoDB driver behavior.

Conceptually:

```ts
db
  .collection("users")
  .find(...);
```

The execution has now moved from runtime coordination into persistence execution.

## 16. Transaction Session Resolution

If the active execution is inside a transaction boundary, the corresponding transaction session remains associated with that execution.

Conceptually:

```text
AmbitenContext
      ↓
transaction session
      ↓
Model A
      ↓
Model B
      ↓
Model C
```

Nested model operations can participate in the same active session without manually passing the session through every application layer.

The transaction lifecycle belongs to the enclosing transaction boundary.

It does **not** commit or roll back independently after every model operation.

## 17. Persistence

The MongoDB driver executes the finalized operation against the resolved target.

For a tenant-aware request:

```text
tenant5
   ↓
db_tenant5
   ↓
users collection
   ↓
MongoDB operation
```

Ambiten maintains a high-fidelity relationship with MongoDB rather than attempting to hide the underlying database semantics behind an unrelated persistence model.

MongoDB behavior therefore remains relevant to:

```text
queries
indexes
sessions
transactions
aggregations
write concerns
read behavior
connection management
```

## 18. Model Post-Processing

After the MongoDB operation completes, control returns through the model execution pipeline.

Depending on the operation and configured runtime behavior, this may include:

```text
post-middleware
result transformation
instrumentation finalization
metrics
logging
operation cleanup
```

The model operation then returns its result to the application layer.

Conceptually:

```text
MongoDB
   ↓
Result
   ↓
Post-Middleware
   ↓
Instrumentation
   ↓
Model Result
   ↓
Application
```

## 19. Transaction Completion

Transaction completion occurs at the boundary that created the transaction.

For explicit transactions:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(...);
    await AuditModel.create(...);
  }
);
```

the lifecycle is:

```text
withTransaction()
      ↓
Model A
      ↓
Model B
      ↓
callback succeeds
      ↓
commit
```

or:

```text
withTransaction()
      ↓
Model A
      ↓
Model B fails
      ↓
callback rejects
      ↓
rollback
```

For adapter-managed request-wide transactions:

```text
Adapter
   ↓
Transaction Boundary
   ↓
entire downstream execution
   ↓
execution completes
   ↓
commit / rollback
```

Transaction completion therefore belongs to the enclosing execution boundary rather than an individual model's post-processing stage.

## 20. Egress

Once application execution finishes, control exits the Ambiten execution boundary.

For adapter-managed execution:

```text
Application Result
      ↓
Adapter Runtime
      ↓
Framework
      ↓
Response / Completion
```

For explicit execution:

```text
AmbitenContext.run(...)
      ↓
callback completes
      ↓
control returns to caller
```

The active execution context no longer applies once control has left that boundary.

Long-lived runtime infrastructure remains available.

This distinction is important:

```text
Execution context
→ scoped to one request/job/invocation

Runtime infrastructure
→ may outlive many executions
```

## Visual Flow

<RuntimeExecutionVisualFlow />

## End-to-End Example

Consider an Express route:

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

with:

```http
GET /users
x-tenant-id: tenant5
```

The internal execution can be understood as:

```text
HTTP Request
      ↓
Express Adapter
      ↓
normalize request
      ↓
resolve tenant5
      ↓
validate tenant5
      ↓
AmbitenContext
tenantId = tenant5
      ↓
route handler
      ↓
UserModel.find(...)
      ↓
effective model context
      ↓
MultiTenantManager
      ↓
tenant5 configuration
      ↓
getClient("tenant5")
      ↓
db_tenant5
      ↓
users collection
      ↓
MongoDB find
      ↓
model post-processing
      ↓
route result
      ↓
Express response
```

If `tenant5` is not yet registered, dynamic discovery may occur between:

```text
MultiTenantManager
```

and:

```text
tenant5 configuration
```

without requiring any change to the route or model call.

## Background Job Example

A worker follows the same model but establishes execution explicitly.

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant5",
    requestId: "job-123"
  },

  async () => {
    await UserModel.updateMany(
      {},
      {
        $set: {
          processed: true
        }
      }
    );
  }
);
```

Internally:

```text
Worker
   ↓
AmbitenContext.run(...)
   ↓
tenantId = tenant5
   ↓
UserModel.updateMany(...)
   ↓
MultiTenantManager
   ↓
db_tenant5
   ↓
MongoDB
```

The ingress mechanism changed.

The runtime execution model did not.

# Key Properties of the Flow

## Context-Driven Execution

Execution state is resolved from the active runtime boundary rather than manually propagated through application code.

```text
execution boundary
      ↓
AmbitenContext
      ↓
runtime-aware components
```

This allows asynchronous application code to remain context-aware without making every business API infrastructure-aware.

## Execution Isolation

Each request, operation, job, or invocation receives its own execution scope.

```text
Execution A
→ Context A

Execution B
→ Context B
```

Long-lived resources may be reused.

Execution-specific state remains isolated.

## Layered Responsibility

Each runtime layer owns a distinct concern.

```text
Adapter
→ ingress

Adapter Runtime
→ execution setup

AmbitenContext
→ execution state

AmbitenModel
→ operation lifecycle

Provider
→ infrastructure binding abstraction

MultiTenantManager
→ tenant registry and client lifecycle

AmbitenClient
→ database infrastructure access

MongoDB
→ persistence
```

This prevents transport, execution state, tenant infrastructure, and persistence concerns from collapsing into one layer.

## Runtime Portability

The execution model remains consistent across:

```text
Express
Fastify
NestJS
GraphQL
AWS Lambda
workers
scheduled jobs
queue consumers
```

The entry mechanism changes.

The runtime semantics downstream remain stable.

## Tenant-Aware Resolution

Tenant identity is resolved before application execution and later translated into tenant infrastructure when persistence requires it.

```text
request identity
      ↓
tenantId
      ↓
AmbitenContext
      ↓
MultiTenantManager
      ↓
tenant database
```

This keeps request resolution separate from infrastructure ownership.

## Dynamic Infrastructure Resolution

Tenant infrastructure does not need to be completely known at startup.

Unknown tenants can be discovered through `TenantConfigResolver` and added to the runtime registry when required.

```text
unknown tenant
      ↓
dynamic discovery
      ↓
registration
      ↓
lazy connection
      ↓
database operation
```

## Transaction Continuity

Transaction state belongs to the active execution boundary.

Model operations executed inside that boundary can participate in the same transaction session.

```text
Transaction
   ↓
Service
   ↓
Model A
   ↓
Model B
```

Commit or rollback occurs when the enclosing transaction scope completes.

## Deterministic Resolution

For a given execution context and configured resolution rules, runtime infrastructure selection remains stable throughout that execution.

For example:

```text
tenantId = tenant5
```

should consistently route tenant-aware operations to the infrastructure associated with `tenant5`.

Explicit operation-level overrides may alter resolution where the public API permits them.

The runtime does not silently switch tenant identity during an active execution.

## Async Continuity

Ambiten preserves runtime context through supported asynchronous execution belonging to the active scope.

This allows:

```text
controller
→ service
→ await
→ repository
→ model
```

to remain associated with the same execution state.

Cross-process, network, queue, or future detached boundaries require explicit propagation and reconstruction of the required identity.

## Package-Boundary Consistency

Framework adapters, `adapter-runtime`, and Core participate in a compatible package graph.

For ESM:

```text
ESM Application
      ↓
ESM Adapter
      ↓
ESM Adapter Runtime
      ↓
ESM Core
```

For CommonJS:

```text
CommonJS Application
      ↓
CommonJS Adapter
      ↓
CommonJS Adapter Runtime
      ↓
CommonJS Core
```

This matters because context-aware execution depends on all participating packages using the compatible runtime context boundary.

## Why This Matters

Ambiten's execution architecture removes infrastructure plumbing from application code without removing infrastructure discipline.

Application code can remain focused on:

```ts
await UserModel.find({});
```

while the runtime coordinates:

```text
execution identity
tenant identity
request metadata
async context
transaction session
tenant configuration
client resolution
database selection
collection selection
middleware
instrumentation
persistence
```

The architectural goal is not to hide those concerns.

It is to place them in the runtime layers that own them.

This allows tenant isolation, transaction continuity, framework portability, dynamic infrastructure resolution, and operational observability to remain consistent without forcing those concerns into every controller, resolver, service, or worker.

## Mental Model

```text
The application defines the operation.

The context defines the execution.

The runtime resolves the infrastructure.

The model coordinates the operation.

The client reaches the database.
```

Or, in one flow:

```text
Entry
  ↓
Context
  ↓
Application
  ↓
Model
  ↓
Infrastructure Resolution
  ↓
Client
  ↓
MongoDB
```

## Related Pages

- [Architecture Overview](/architecture/whitepaper)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Context](/core/context)
- [AmbitenModel](/models/defining-models)
- [Provider Contract](/models/provider-contract)
- [AmbitenClient](/reference/api/ambiten-client)
- [Adapters Overview](/framework-adapters/overview)
- [Adapter Usage Patterns](/framework-adapters/usage-patterns)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)