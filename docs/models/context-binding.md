---
title: Context Binding
description: Understand how AmbitenModel combines execution context, model defaults, transaction state, and infrastructure resolution during runtime operations.
---

# Context Binding

Context binding is the mechanism that allows `AmbitenModel` to execute against the active runtime state without forcing infrastructure concerns through every layer of an application.

In Ambiten, models do not operate as isolated collection wrappers.

They execute inside a managed runtime boundary where execution-specific information such as:

```text
tenant identity
request metadata
database overrides
collection overrides
transaction session
logger metadata
custom runtime metadata
```

can participate in model execution automatically.

This allows a model call to remain structurally simple:

```ts
await UserModel.find({});
```

while the runtime determines the effective context and infrastructure required for that operation.

Context binding is therefore the connection between:

```text
execution state
```

and:

```text
model execution
```

## Why Context Binding Exists

In conventional application architectures, runtime state often leaks progressively into application APIs.

A service may begin with:

```ts
createUser(data);
```

and eventually become:

```ts
createUser(
  tenantId,
  dbName,
  session,
  requestId,
  data
);
```

The same infrastructure values then propagate through:

```text
controller
   ↓
service
   ↓
repository
   ↓
model
```

This creates several problems:

- tenant identity becomes application plumbing,
- transaction sessions depend on manual propagation,
- database selection spreads into business services,
- framework-specific request state leaks into domain APIs,
- execution rules become inconsistent between application paths.

Ambiten moves those concerns into the runtime.

Instead of requiring every layer to forward:

```text
tenantId
session
dbName
requestId
```

the execution boundary establishes runtime state once.

Model execution can then consume that state when required.

## The Binding Model

Context binding is produced by several runtime layers working together.

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
AmbitenModel
      ↓
Effective Context
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

<ContextBindingFlow />

Each layer owns a distinct responsibility.

```text
Execution Boundary
→ establishes execution

AmbitenContext
→ carries execution state

AmbitenModel
→ consumes and resolves effective context

Provider
→ resolves infrastructure bindings

MultiTenantManager
→ owns tenant infrastructure

AmbitenClient
→ bridges resolved infrastructure to MongoDB
```

Context binding is therefore not simply:

```text
Context → Client
```

It is the process by which execution state becomes meaningful to an individual model operation.

## Bound Execution State

An Ambiten execution boundary may carry values such as:

```text
tenantId
requestId
dbName
collectionName
transaction session
debug state
logger metadata
custom metadata
```

Those values may originate from different runtime entry mechanisms.

### Adapter-Managed Execution

For supported frameworks:

```text
Express
Fastify
NestJS
GraphQL
AWS Lambda
      ↓
Adapter
      ↓
Adapter Runtime
      ↓
AmbitenContext
```

### Explicit Execution

Outside adapter-managed environments:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "job-123"
  },

  async () => {
    await UserModel.find({});
  }
);
```

This is useful for:

```text
workers
scheduled jobs
queue consumers
maintenance tasks
custom runtimes
```

### Transaction Execution

A transaction can add an active MongoDB session to the execution state:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(data);
  }
);
```

Context binding allows all of these execution styles to feed the same model runtime.

## Context-Aware Execution

Consider an explicitly established execution boundary:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },

  async () => {
    return UserModel.find({});
  }
);
```

The model call remains:

```ts
UserModel.find({});
```

but the active execution contains:

```ts
{
  tenantId: "tenant-a",
  requestId: "req-123"
}
```

The model does not need to rediscover where that tenant identity came from.

It simply participates in the active runtime.

Conceptually:

```text
External Input
      ↓
TenantResolver / Explicit Context
      ↓
AmbitenContext
tenantId = tenant-a
      ↓
AmbitenModel
```

This is one of Ambiten's central architectural principles:

> **Static model definition. Dynamic runtime execution.**

## Effective Context Resolution

`AmbitenModel` does not simply copy the active `AmbitenContext`.

It resolves an **effective operation context**.

The general precedence model is:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

Conceptually:

```text
Operation Starts
      ↓
explicit values
      ↓
active execution state
      ↓
model defaults
      ↓
Effective Context
```

Where the public API permits an explicit operation override, that value takes precedence over the corresponding active context or model default.

This makes model execution predictable while still allowing controlled operation-level customization.

## Why Effective Context Matters

A model may be structurally configured with:

```text
default collection
default database behavior
model-specific metadata
```

while the active execution contributes:

```text
tenantId
requestId
transaction session
```

and an individual operation may provide a supported override.

Context binding combines those sources into one effective state for that operation.

The model definition itself does not need to mutate.

```text
Shared Model Definition
        │
        ├── Request A → Effective Context A
        │
        ├── Request B → Effective Context B
        │
        └── Worker C  → Effective Context C
```

This allows one model definition to serve many isolated executions.

## Tenant Binding

Tenant binding begins before the model operation.

For adapter-managed requests:

```text
Request
   ↓
TenantResolver
   ↓
tenantId
   ↓
AmbitenContext
```

For example:

```http
x-tenant-id: tenant-a
```

may resolve to:

```ts
AmbitenContext.get().tenantId;
// "tenant-a"
```

The model then consumes that active identity as part of effective context resolution.

```text
AmbitenContext
tenantId = tenant-a
      ↓
AmbitenModel
      ↓
Effective Context
tenantId = tenant-a
```

The model does not own the original tenant-resolution mechanism.

## Tenant Identity vs Tenant Infrastructure

Context binding carries tenant **identity**.

It does not itself represent the tenant's MongoDB infrastructure.

This distinction is fundamental.

```text
TenantResolver
→ Who is this execution for?

AmbitenContext
→ Which tenant belongs to this execution?

AmbitenModel
→ What effective context applies to this operation?

MultiTenantManager
→ What infrastructure belongs to that tenant?
```

A bound context may contain:

```text
tenantId = tenant-a
```

without containing:

```text
MongoDB URI
MongoClient
database handle
connection state
```

Those resources remain infrastructure concerns.

## Tenant-Aware Infrastructure Resolution

Once a model operation requires persistence, the effective tenant identity can be translated into infrastructure.

Conceptually:

```text
AmbitenModel
      ↓
Effective Context
tenantId = tenant-a
      ↓
MultiTenantManager
      ↓
TenantConfig
      ↓
Tenant MongoClient
      ↓
Tenant Database
```

This allows tenant-aware execution without forcing controllers or services to select databases manually.

## Dynamic Tenant Binding

Context binding does not require every tenant to be registered during application startup.

For example, the active context may contain:

```text
tenantId = tenant5
```

while `tenant5` is not currently registered.

Infrastructure resolution can then follow:

```text
tenant5
   ↓
MultiTenantManager.resolveTenant()
   ↓
not registered
   ↓
TenantConfigResolver
   ↓
external lookup
   ↓
register tenant5
   ↓
getClient()
```

The original model call remains unchanged:

```ts
await UserModel.find({});
```

Context binding identifies **which tenant belongs to the operation**.

Dynamic tenant resolution determines **how that tenant's infrastructure becomes available**.

## Provider-Driven Infrastructure Resolution

Providers remain part of the infrastructure-resolution model.

At execution time, a provider may consume effective operation context and resolve resources such as:

```text
database
collection
client
session
runtime overrides
```

Conceptually:

```ts
const db =
  await provider.db(ctx);
```

For tenant-aware operations, provider resolution may cooperate with `MultiTenantManager`.

```text
Effective Context
      ↓
Provider
      ↓
MultiTenantManager
      ↓
Tenant Infrastructure
```

The provider therefore consumes context.

It does not determine the original tenant identity of the request.

## AmbitenClient Relationship

`AmbitenClient` participates after the required runtime infrastructure has been resolved.

Conceptually:

```text
Effective Context
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

By this stage, the runtime should already understand the relevant:

```text
client
database
collection
session
operation options
```

`AmbitenClient` provides the MongoDB-facing bridge.

It should not be confused with request tenant resolution or tenant registry ownership.

## Transaction Binding

Transaction continuity depends on the same context-binding mechanism.

For example:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(
      data
    );

    await AuditLogModel.create(
      log
    );
  }
);
```

The active transaction session becomes part of the runtime execution state.

Conceptually:

```text
Transaction Boundary
      ↓
session S1
      ↓
AmbitenContext
      ↓
UserModel
      ↓
session S1
      ↓
AuditLogModel
      ↓
session S1
```

Participating Ambiten operations can resolve that session without manually passing it through service APIs.

## Transaction Ownership

Context binding makes the transaction session available to participating operations.

It does not make each model operation responsible for transaction completion.

The surrounding transaction boundary owns:

```text
commit
rollback
session lifecycle
```

For example:

```text
withTransaction()
      ↓
Model A
      ↓
Model B
      ↓
callback resolves
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

This keeps transaction participation separate from transaction ownership.

## Adapter-Managed Transaction Binding

Adapters may establish request-wide transaction-aware execution when configured.

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
Application
   ↓
Model Operations
```

From the model's perspective, the source of the transaction does not matter.

It consumes the active transaction state available through effective context.

## Request Metadata Binding

Context binding is not limited to persistence routing.

The active execution may also carry:

```text
requestId
debug metadata
logger metadata
custom execution metadata
```

For example:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();
```

can provide runtime correlation information without requiring those values to appear in every service method signature.

This allows application services to remain focused on application data rather than execution plumbing.

## Observability Context

Runtime instrumentation can consume the same execution context used by model operations.

Conceptually:

```text
AmbitenContext
      ├── tenantId
      ├── requestId
      ├── database
      ├── collection
      └── metadata
            ↓
       instrumentation
```

This makes context-aware logging and telemetry possible across different execution environments.

The runtime provides the metadata required for correlation.

Delivery guarantees of a specific logging or telemetry backend remain part of that backend's own contract.

## Middleware Binding

Middleware executes as part of the same model operation and can therefore observe its effective execution state.

Conceptually:

```text
Effective Context
      ↓
before middleware
      ↓
persistence operation
      ↓
after middleware
```

This allows policies such as:

```text
validation
auditing
normalization
soft-delete behavior
logging
instrumentation
access shaping
```

to operate consistently without requiring framework-specific context propagation.

## Adapter-Managed Binding

For supported frameworks, the adapter establishes the execution boundary before downstream application logic runs.

```text
Framework
      ↓
Adapter
      ↓
Adapter Runtime
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
```

This allows the same model to execute behind:

```text
Express
Fastify
NestJS
GraphQL
AWS Lambda
```

without requiring framework-specific model behavior.

Adapters therefore provide runtime ingress.

They do not change the model contract.

## Explicit Binding Outside Requests

Not every execution begins inside a framework adapter.

Background work can establish context explicitly:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "job-42"
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

This pattern is appropriate for:

```text
queue consumers
scheduled jobs
maintenance workflows
workers
internal tooling
```

The model remains unchanged.

Only the execution boundary is established differently.

## Scoped Providers

Where scoped providers such as `withTenant(...)` are used, infrastructure can also be intentionally bound outside an adapter-managed request flow.

For example:

```ts
const tenantProvider =
  client.withTenant(
    "tenant-a"
  );

const UserModel =
  new AmbitenModel({
    collectionName:
      "users",

    schema:
      userSchema,

    provider:
      tenantProvider
  });
```

This represents an explicitly scoped infrastructure configuration.

It is useful when an application deliberately wants a model/provider relationship bound to a known tenant or execution environment.

It should not be confused with request tenant resolution.

For ordinary request-aware multi-tenant execution, `AmbitenContext` and `MultiTenantManager` remain the primary runtime path.

## Context Binding Across Concurrent Executions

The same model definition can participate in multiple concurrent runtime boundaries.

```text
Request A
tenantId = tenantA
      ↓
UserModel
      ↓
Effective Context A


Request B
tenantId = tenantB
      ↓
UserModel
      ↓
Effective Context B
```

The model definition is shared.

The execution context is not.

This is one of the key properties that allows Ambiten to support multi-tenant concurrency without storing request-specific state directly on shared model instances.

## What Context Binding Prevents

A well-defined binding model reduces several common architectural failure modes.

### Manual Tenant Propagation

Avoid:

```ts
service.execute(
  tenantId,
  data
);
```

solely because the persistence layer needs tenant identity.

### Manual Session Propagation

Avoid:

```ts
service.execute(
  session,
  data
);
```

solely because nested model operations need the active transaction.

### Framework Request Propagation

Avoid passing:

```text
Express Request
Fastify Request
NestJS ExecutionContext
GraphQL Context
Lambda Event
```

through application layers just so a model can determine runtime infrastructure.

### Shared Mutable Execution State

Avoid storing request-specific values in process-global or singleton mutable state.

Context binding gives those values an execution-scoped home.

## What Context Binding Does Not Mean

Context binding does not mean every value in the runtime is immutable.

Supported operation-level context may override lower-precedence context or model defaults where the public API permits it.

Context binding also does not mean:

```text
tenant resolution = authorization
```

or:

```text
tenant identity = physical database topology
```

Those are separate concerns.

The runtime binds execution identity.

Infrastructure resolution interprets that identity according to configured rules.

## Design Guidance

Context-driven model execution should remain the default pattern.

Prefer:

```ts
await UserModel.create(
  data
);
```

inside a valid execution boundary.

Avoid manually attaching runtime infrastructure to every model call merely because the runtime is already able to resolve it.

For example, do not routinely write:

```ts
await UserModel.create(
  data,
  {
    tenantId,
    session,
    dbName
  }
);
```

when those values already belong to the active execution.

Explicit operation context should be used when the operation intentionally needs to override the normal runtime resolution rules.

## Models Should Remain Framework-Independent

An `AmbitenModel` should not need to know whether execution originated from:

```text
Express
Fastify
NestJS
GraphQL
Lambda
worker
```

The host environment establishes the boundary.

The context carries execution state.

The model resolves the effective operation context.

Infrastructure layers determine where persistence occurs.

This separation allows model behavior to remain stable across execution environments.

## Runtime Relationship

<SignalFlow
  aria-label="Context binding runtime relationship"
  :items='[
    "Execution Boundary",
    "AmbitenContext",
    "AmbitenModel",
    "Infrastructure Resolution",
    "MongoDB"
  ]'
/>

The full relationship is:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
AmbitenModel
      ↓
Effective Context
      ↓
Provider / MultiTenantManager
      ↓
AmbitenClient
      ↓
MongoDB
```

The model consumes execution state.

The infrastructure layer interprets it.

MongoDB performs persistence.

## Mental Model

A useful way to think about context binding is:

```text
The boundary establishes state.

The context carries state.

The model resolves effective state.

Infrastructure interprets state.

The client reaches MongoDB.
```

Or, more compactly:

```text
Context defines execution.

Model binds execution to an operation.

Infrastructure determines where it runs.
```

## Summary

Context binding is the mechanism that connects Ambiten's execution context to model operations without forcing runtime infrastructure through application APIs.

It allows model execution to:

- consume tenant identity from the active execution,
- preserve request metadata across supported async execution,
- participate in active transaction sessions,
- combine explicit operation context with runtime state and model defaults,
- resolve tenant infrastructure through `MultiTenantManager`,
- resolve database, collection, client, and session resources through runtime infrastructure,
- remain independent from the host framework.

The complete binding path is:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
AmbitenModel
      ↓
Effective Context
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

The model remains structurally stable.

The context and infrastructure surrounding each operation can change dynamically.

> **Static model definition. Dynamic runtime execution.**

## See Also

- [AmbitenModel](/models/ambiten-model)
- [Defining Models](/models/defining-models)
- [Provider Contract](/models/provider-contract)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [AmbitenClient](/reference/api/ambiten-client)