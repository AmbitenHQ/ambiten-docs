---
title: AmbitenModel
description: Understand how AmbitenModel coordinates schema-aware, context-aware, tenant-aware, and transaction-aware MongoDB operations inside the Ambiten runtime.
---

# AmbitenModel

`AmbitenModel` is the runtime execution surface for data operations in Ambiten.

A model represents a collection and its schema-defined behavior, but its role extends beyond being a document or collection wrapper.

Every model operation executes against an **effective runtime context**, allowing tenant identity, database selection, collection behavior, transaction sessions, middleware, and runtime metadata to participate without being manually threaded through application code.

If `AmbitenContext` defines the current execution and runtime infrastructure determines where that execution should persist data, `AmbitenModel` is where application intent enters the persistence pipeline.

> **Context defines execution. Model coordinates the operation. Infrastructure resolution determines where it runs.**

For how model execution receives tenant, database, and session state, see [Context Binding](/models/context-binding).

## What AmbitenModel Is

An `AmbitenModel` is a typed, schema-bound execution surface for MongoDB persistence operations.

It exposes familiar model operations such as:

```ts
await UserModel.find({});

await UserModel.create(data);

await UserModel.updateOne(
  filter,
  update
);
```

but those operations execute inside Ambiten's runtime architecture.

Conceptually:

```text
Application
      ↓
AmbitenModel
      ↓
Effective Context
      ↓
Middleware / Validation
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

The model coordinates the operation.

It does not own the transport layer, tenant-discovery mechanism, connection lifecycle, or application request lifecycle.

## Static Definition, Dynamic Execution

An `AmbitenModel` is structurally defined once.

For example, its definition may establish:

```text
schema
collection name
middleware
model defaults
operation behavior
```

Those concerns belong to model definition.

Execution-specific concerns are resolved later when an operation runs.

```text
MODEL DEFINITION
──────────────
schema
collection defaults
middleware
configuration


OPERATION EXECUTION
───────────────────
tenantId
database
collection override
transaction session
request metadata
runtime infrastructure
```

This distinction is fundamental.

> **Static model definition. Dynamic runtime execution.**

Model initialization does not need to eagerly select the request's tenant database or collection.

Those values are resolved when an operation executes against its effective context.

## Runtime Responsibilities

`AmbitenModel` coordinates the lifecycle surrounding persistence operations.

Depending on the operation and configured model behavior, that can include:

```text
schema validation
effective context resolution
middleware execution
operation preparation
collection resolution
infrastructure resolution
persistence execution
result processing
instrumentation
```

The public model API remains simple even though execution is runtime-aware.

```ts
await UserModel.create({
  username: "Alice"
});
```

Application code does not need to manually provide:

```text
tenant MongoClient
tenant database
transaction session
requestId
provider handle
```

for every operation.

## Context-Aware Execution

A model operation can execute inside an explicitly established runtime boundary.

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

Inside that boundary:

```ts
AmbitenContext.get().tenantId;
// "tenant-a"
```

The model does not rediscover the request tenant.

Instead, it consumes the execution state already established upstream.

Conceptually:

```text
TenantResolver / Explicit Context
        ↓
AmbitenContext
tenantId = tenant-a
        ↓
AmbitenModel
        ↓
Infrastructure Resolution
```

This distinction keeps tenant identification outside the model layer.

## Effective Operation Context

Model execution may combine several sources of runtime state.

The general precedence model is:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

Higher-precedence values override lower-precedence values where the public operation API permits them.

Conceptually:

```text
Operation
   ↓
resolve explicit values
   ↓
merge active runtime context
   ↓
apply model defaults
   ↓
Effective Context
```

The resulting effective context drives downstream execution.

This makes model behavior deterministic without requiring all runtime state to originate from one source.

## Tenant-Aware Execution

When the effective context contains a tenant identity:

```ts
{
  tenantId: "tenant5"
}
```

the model can execute against that tenant's infrastructure.

Conceptually:

```text
AmbitenModel
      ↓
Effective Context
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
TenantConfig
      ↓
Tenant Client
      ↓
Tenant Database
```

The model therefore participates in tenant-aware execution without becoming responsible for discovering who the tenant is.

The separation is:

```text
TenantResolver
→ identifies tenant

AmbitenContext
→ carries tenant identity

AmbitenModel
→ coordinates operation

MultiTenantManager
→ resolves tenant infrastructure
```

## Dynamic Tenants

Model code does not need to distinguish between statically registered and dynamically discovered tenants.

For example:

```ts
await UserModel.find({});
```

may execute for a tenant already present in the runtime registry:

```text
tenant5
   ↓
MultiTenantManager
   ↓
registered
   ↓
getClient()
```

or for an unknown tenant:

```text
tenant5
   ↓
MultiTenantManager
   ↓
not registered
   ↓
TenantConfigResolver
   ↓
external lookup
   ↓
register
   ↓
getClient()
```

The model operation remains identical.

Dynamic tenant discovery belongs to runtime infrastructure rather than model APIs.

## Lazy Tenant Activation

Tenant registration and tenant connection are separate lifecycle concerns.

A model operation may encounter:

```text
tenant5
registered = true
connected = false
lazy = true
```

When persistence requires a usable client:

```text
AmbitenModel
      ↓
MultiTenantManager.getClient()
      ↓
connect tenant client
      ↓
tenant database
```

The model does not need special syntax for lazy tenants.

Infrastructure activation occurs when execution requires it.

## Transaction Participation

When a transaction is active, participating model operations resolve the active transaction session from the runtime context.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(
      data
    );

    await AuditModel.create(
      log
    );
  }
);
```

Conceptually:

```text
Transaction Boundary
      ↓
session S1
      ↓
UserModel
      ↓
session S1
      ↓
AuditModel
      ↓
session S1
```

The session does not need to be manually propagated through each service or model call.

Transaction completion belongs to the surrounding transaction boundary.

Individual model operations do not independently commit or abort the enclosing transaction.

## Explicit and Adapter-Managed Transactions

A model does not need to know whether the transaction was created explicitly:

```ts
AmbitenContext.withTransaction(...)
```

or by an adapter-managed execution boundary.

From the model's perspective, the relevant concern is:

```text
Is there an active transaction session
in the effective execution context?
```

If so, participating operations use that session according to the runtime transaction contract.

This keeps transaction behavior independent from the host framework.

## Middleware Participation

Operations executed through `AmbitenModel` participate in the configured model middleware lifecycle.

Conceptually:

```text
before middleware
      ↓
operation
      ↓
after middleware
```

Middleware can support concerns such as:

```text
validation
normalization
policy enforcement
soft-delete behavior
auditing
operation shaping
logging
instrumentation
result transformation
```

Because middleware executes as part of the same model operation, it can observe the effective runtime context.

For example, middleware may access tenant-aware or request-aware execution information without receiving those values manually from controllers.

## Middleware and Runtime State

Middleware can participate in the same execution state as the operation it surrounds.

Conceptually:

```text
AmbitenContext
tenantId = tenant5
      ↓
before middleware
      ↓
model operation
      ↓
after middleware
```

This allows policies to remain consistent regardless of whether the operation originated from:

```text
Express
Fastify
NestJS
GraphQL
Lambda
worker
scheduled job
```

The entry environment changes.

The model middleware lifecycle does not.

## Schema Participation

An `AmbitenModel` is associated with an `AmbitenSchema`.

The schema defines structural and validation behavior associated with model data.

Conceptually:

```text
AmbitenSchema
      ↓
AmbitenModel
      ↓
Operation
```

The model coordinates schema-aware operation behavior while execution-specific infrastructure remains resolved at runtime.

This prevents schema definition from becoming coupled to one tenant or one request-specific database.

## Infrastructure Resolution

`AmbitenModel` coordinates the operation but delegates concrete infrastructure resolution to the runtime layers responsible for it.

Conceptually:

```text
AmbitenModel
      ↓
Effective Context
      ↓
Provider / Infrastructure Resolution
      ↓
MultiTenantManager when tenant-aware
      ↓
AmbitenClient
      ↓
MongoDB
```

The model does not need to embed:

```text
connection strings
tenant registries
MongoClient creation
framework request objects
```

inside its application-facing APIs.

## Provider Relationship

Where provider abstractions participate, they resolve concrete persistence bindings from the effective operation context.

Conceptually:

```ts
const db =
  await provider.db(ctx);
```

Provider resolution may participate in determining:

```text
database
collection
client
session
runtime overrides
```

For tenant-aware execution, those decisions may involve `MultiTenantManager`.

The provider consumes runtime state.

It does not determine the request's tenant identity.

## MultiTenantManager Relationship

`MultiTenantManager` is responsible for tenant infrastructure rather than model behavior.

Its concerns include:

```text
tenant registration
tenant configuration
dynamic tenant discovery
lazy connection activation
tenant MongoDB clients
runtime tenant state
```

The relationship is:

```text
AmbitenModel
      ↓
tenant-aware operation
      ↓
MultiTenantManager
      ↓
tenant infrastructure
```

This keeps tenant resource management out of the model definition itself.

## AmbitenClient Relationship

`AmbitenClient` bridges Ambiten's resolved runtime infrastructure to MongoDB.

By the time an operation reaches the client layer, the runtime should already have determined the relevant:

```text
client
database
collection
session
operation options
```

Conceptually:

```text
AmbitenModel
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB Driver
```

`AmbitenClient` is therefore part of the persistence bridge.

It should not be confused with tenant identity resolution.

## MongoDB Relationship

AmbitenModel ultimately operates against MongoDB semantics.

Ambiten intentionally preserves concepts such as:

```text
collections
queries
updates
aggregations
indexes
sessions
transactions
MongoDB driver behavior
```

rather than replacing them with an unrelated persistence model.

The model adds a runtime-aware execution layer around MongoDB operations.

It does not make MongoDB itself disappear.

## Runtime Relationship

<AmbitenModelRuntimeFlow />

The complete relationship is:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application Logic
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

Each layer owns a distinct responsibility.

```text
Execution Boundary
→ establishes execution

AmbitenContext
→ carries execution state

AmbitenModel
→ coordinates model operations

Provider
→ resolves infrastructure bindings

MultiTenantManager
→ owns tenant resources

AmbitenClient
→ bridges to MongoDB

MongoDB
→ performs persistence
```

## Application Services Remain Infrastructure-Independent

A service can remain focused on application behavior:

```ts
export async function createUser(
  input: CreateUserInput
) {
  return UserModel.create(
    input
  );
}
```

It does not need:

```ts
createUser(
  tenantId,
  db,
  session,
  requestId,
  input
);
```

simply so runtime infrastructure can reach the model.

This is one of the main architectural benefits of context-aware model execution.

## Framework Independence

The same model can execute from different host environments.

```text
Express Route ──────┐
Fastify Handler ────┤
NestJS Service ─────┤
GraphQL Resolver ───┤
Lambda Handler ─────┤
Worker ──────────────┘
                    ↓
               AmbitenModel
```

The model does not need framework-specific APIs.

The host environment establishes execution.

The model consumes the resulting runtime state.

## Model Initialization vs Model Execution

Model initialization and model execution have different responsibilities.

### Initialization

Model initialization prepares structural behavior such as:

```text
schema association
collection configuration
middleware
model defaults
runtime registration
```

### Execution

Model execution resolves:

```text
effective context
tenant infrastructure
database
collection
session
operation-specific state
```

Conceptually:

```text
STARTUP
───────
register model definition


REQUEST / JOB
─────────────
resolve operation context
      ↓
resolve infrastructure
      ↓
execute operation
```

This distinction prevents bootstrap from prematurely binding a model to request-specific infrastructure.

## Runtime Overrides

Supported operation-level context can override lower-precedence runtime or model defaults.

Conceptually:

```text
explicit operation context
        ↓
AmbitenContext
        ↓
model defaults
```

This allows controlled operation-specific behavior without changing the structural model definition.

Overrides should be treated as part of the effective-context contract rather than as mutation of global model state.

## Execution Isolation

Concurrent operations can use the same model definition while resolving different execution contexts.

```text
Request A
tenantId = tenantA
      ↓
UserModel
      ↓
db_tenantA


Request B
tenantId = tenantB
      ↓
UserModel
      ↓
db_tenantB
```

The model definition is shared.

The execution state is not.

This is why tenant-specific state should not be stored as mutable state directly on shared model instances.

## Failure Propagation

Failures that occur during:

```text
validation
middleware
context resolution
tenant infrastructure resolution
MongoDB execution
transaction execution
```

propagate through the model operation to the enclosing execution boundary.

The model does not silently switch persistence targets or tenant scope in response to an infrastructure failure.

The caller or host environment determines how that failure is surfaced.

## What AmbitenModel Does Not Own

`AmbitenModel` does not own:

```text
HTTP routing
framework middleware
request authentication
tenant authorization
tenant discovery policy
MongoDB cluster availability
process lifecycle
distributed transactions
external service coordination
```

Those concerns belong to other architectural layers.

Keeping these boundaries explicit prevents the model layer from becoming an all-purpose application runtime.

## Why This Architecture Matters

Without a context-aware model runtime, infrastructure concerns often spread through application code.

For example:

```text
Controller
   ↓ tenantId
Service
   ↓ tenantId + session
Repository
   ↓ database
Model
```

Ambiten instead allows:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Service
      ↓
AmbitenModel
      ↓
Infrastructure Resolution
```

Application APIs describe application behavior.

Runtime layers coordinate execution infrastructure.

This separation becomes increasingly valuable as systems introduce:

```text
multiple frameworks
multiple tenants
dynamic tenant configuration
transactions
background jobs
serverless execution
runtime instrumentation
```

## Relationship with Other Concepts

<AmbitenModelConceptMap />

## Design Principles

<AmbitenModelPrinciples />

## Recommended Mental Model

Think of `AmbitenModel` as the point where an application operation becomes a runtime-aware persistence operation.

```text
Application intent
      ↓
AmbitenModel
      ↓
effective execution context
      ↓
middleware + validation
      ↓
infrastructure resolution
      ↓
MongoDB operation
```

Or more simply:

```text
Context defines execution.

Model coordinates the operation.

MultiTenantManager owns tenant resources.

Provider resolves infrastructure.

AmbitenClient reaches MongoDB.
```

## Summary

`AmbitenModel` is the schema-bound runtime execution surface for Ambiten data operations.

It:

- exposes model persistence operations,
- consumes the active execution context,
- resolves an effective operation context,
- participates in transaction-aware execution,
- executes deterministic middleware,
- coordinates schema-aware behavior,
- participates in tenant-aware infrastructure resolution,
- delegates tenant resource ownership to `MultiTenantManager`,
- delegates concrete persistence access through providers and `AmbitenClient`,
- remains independent from the host framework.

The complete model path is:

```text
Application
      ↓
AmbitenModel
      ↓
Effective Context
      ↓
Middleware / Validation
      ↓
Infrastructure Resolution
      ↓
MultiTenantManager / Provider
      ↓
AmbitenClient
      ↓
MongoDB
```

The model stays structurally stable.

The runtime execution around it changes according to the active context.

> **Static model definition. Dynamic runtime execution.**

## See Also

- [Defining Models](/models/defining-models)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Middleware](/core/middleware)
- [AmbitenClient](/reference/api/ambiten-client)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Architecture](/architecture/whitepaper)