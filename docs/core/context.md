---
title: Context
description: Understand how AmbitenContext carries execution-scoped tenant identity, transaction state, request metadata, observability state, and runtime metadata across asynchronous execution.
---

# Context

`AmbitenContext` is the execution-state backbone of Ambiten.

It provides ambient, execution-scoped state across supported asynchronous boundaries so runtime components can participate in the same operation without forcing tenant identity, transaction sessions, request metadata, database scope, and runtime metadata through every application function.

It can represent an HTTP request:

```text
Request
   ↓
AmbitenContext
```

but it is not limited to requests.

The same execution model applies to:

```text
GraphQL operations
Lambda invocations
queue consumers
scheduled jobs
workers
scripts
maintenance tasks
custom runtimes
```

The central idea is:

> **Context belongs to an execution, not to a framework.**

If you are looking specifically for how model operations consume context, see [Context Binding](/models/context-binding).

## Why Context Exists

Without an execution-context layer, infrastructure state tends to spread through application APIs.

For example:

```ts
await createUser(
  tenantId,
  requestId,
  dbName,
  session,
  data
);
```

Those values then move through:

```text
controller
   ↓
service
   ↓
repository
   ↓
model
```

even though they are not application data.

This creates several problems:

```text
tenant identity becomes plumbing
transaction sessions require manual propagation
request metadata leaks into service signatures
database routing spreads through application code
framework-specific state reaches domain layers
```

Ambiten moves that state into an execution boundary.

Inside a valid runtime scope:

```ts
await UserModel.create(data);
```

can participate in the execution without the application manually forwarding its runtime infrastructure through every layer.

## What AmbitenContext Represents

`AmbitenContext` stores `AmbitenContextState`.

The runtime contract includes:

```ts
export interface AmbitenContextState {
  tenantId?: string;
  requestId?: string;
  dbName?: string;
  collectionName?: string;
  session?: ClientSession;
  loggerMeta?: Record<string, any>;
  logger?: AmbitenLoggerLike;
  debug?: boolean;
  meta?: AmbitenOperationMeta;
  observer?: AmbitenQueryObserver;
  budget?: AmbitenQuotaBudgetInput;
}
```

These fields describe the current **execution**.

They do not describe the application's business domain.

Conceptually:

```text
AmbitenContextState
├── execution identity
│   ├── tenantId
│   └── requestId
│
├── persistence scope
│   ├── dbName
│   ├── collectionName
│   └── session
│
├── observability
│   ├── logger
│   ├── loggerMeta
│   ├── debug
│   └── observer
│
└── runtime control
    ├── meta
    └── budget
```

## Execution-Scoped, Not Merely Request-Scoped

It is useful to call `AmbitenContext` execution-scoped rather than only request-scoped.

An HTTP request is one kind of execution:

```text
HTTP Request
      ↓
AmbitenContext
```

but so is:

```text
Queue Message
      ↓
AmbitenContext
```

or:

```text
Scheduled Job
      ↓
AmbitenContext
```

or:

```text
Script
   ↓
AmbitenContext.run(...)
```

The scope lasts for the execution boundary that created it.

## Execution Model

Ambiten's context propagation is built on Node.js `AsyncLocalStorage`.

Conceptually:

```text
Execution Boundary
      ↓
AsyncLocalStorage
      ↓
AmbitenContextState
      ↓
Async Call Chain
```

State remains associated with the active asynchronous execution rather than being stored as mutable process-global request state.

This allows concurrent operations to remain isolated.

```text
Execution A
tenantId = tenant-a
requestId = req-a
      │
      └── async work A


Execution B
tenantId = tenant-b
requestId = req-b
      │
      └── async work B
```

Both executions may use the same services and models while retaining different runtime state.

## Creating an Execution Boundary

Use `AmbitenContext.run(...)` when establishing execution explicitly.

```ts
import {
  AmbitenContext
} from "@ambiten/core";

await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },

  async () => {
    await UserModel.create({
      name: "John"
    });
  }
);
```

Everything participating in the supported asynchronous call chain executes within that context boundary.

This pattern is useful for:

```text
background jobs
queue consumers
scheduled tasks
scripts
maintenance workflows
custom runtimes
tests
```

Framework integrations normally establish the boundary through their adapters.

## Reading the Active Context

Use `AmbitenContext.get()` to inspect the current execution state.

```ts
const ctx =
  AmbitenContext.get();

console.log(
  ctx.tenantId
);

console.log(
  ctx.requestId
);
```

This is useful for infrastructure and cross-cutting runtime concerns such as:

```text
logging
instrumentation
auditing
runtime diagnostics
custom middleware
quota tracking
query observation
```

Application services should still avoid reading context unnecessarily when their behavior does not depend on execution state.

## Runtime Flow

<ContextBindingFlow />

At a high level:

```text
Ingress
   ↓
Execution Boundary
   ↓
AmbitenContext
   ↓
Application Logic
   ↓
AmbitenModel
   ↓
Effective ModelContext
   ↓
Infrastructure Resolution
   ↓
MongoDB
```

Not every layer consumes `AmbitenContext` in exactly the same way.

That distinction is important.

## AmbitenContextState vs ModelContext

`AmbitenContextState` and `ModelContext` are related but have different responsibilities.

### AmbitenContextState

This is the full execution-scoped runtime contract.

It includes concerns such as:

```text
tenant identity
request identity
database scope
transaction session
logger
logger metadata
debug state
operation metadata
query observer
quota budget
```

### ModelContext

`ModelContext` is the operation-facing context used by the model runtime.

```ts
export type ModelContext = {
  tenantId?: string;
  requestId?: string;
  dbName?: string;
  db?: Db;
  collectionName?: string;
  config?: AmbitenConfig;
  session?: ClientSession;
  withDeleted?: boolean;
  onlyDeleted?: boolean;
  hardDelete?: boolean;
};
```

It contains the subset of execution state relevant to model persistence plus model-specific operation controls.

Conceptually:

```text
AmbitenContextState
        ↓
model projection / merge
        ↓
ModelContext
```

These are not competing context systems.

`ModelContext` is the model-operation view of execution state.

## Model Context Binding

`AmbitenModel` connects the two contracts.

The model resolves an effective operation context using:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
```

Conceptually:

```text
AmbitenContext.get()
        +
explicit operation context
        +
model defaults
        ↓
AmbitenModel.mergeCtx()
        ↓
Effective ModelContext
```

That effective context can then participate in:

```text
schema behavior
middleware
model operation
provider resolution
transaction participation
```

The important distinction is:

> **AmbitenContext carries execution state. AmbitenModel binds the relevant state to a model operation.**

## Why the Projection Exists

The complete runtime context contains values that do not necessarily belong in every persistence operation.

For example:

```text
logger
observer
budget
debug
```

may belong to the wider execution system.

Meanwhile, a model operation may require additional persistence-specific controls:

```text
withDeleted
onlyDeleted
hardDelete
db
config
```

`ModelContext` therefore gives the model runtime a focused operation contract without forcing every provider or schema API to depend on the entire execution-state interface.

## Context-Aware Model Execution

Consider:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123",
    dbName: "tenant_a_db"
  },

  async () => {
    await UserModel.find({});
  }
);
```

The model operation can derive:

```text
tenantId = tenant-a
requestId = req-123
dbName = tenant_a_db
```

into its effective `ModelContext`.

The flow is:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext
      ↓
Schema / Middleware
      ↓
DbProvider
```

The provider does not need to reconstruct the original request context.

## Tenant Identity

`tenantId` represents the tenant identity associated with the current execution.

For adapter-managed applications:

```text
Request
   ↓
TenantResolver
   ↓
tenantId
   ↓
AmbitenContext
```

For explicit jobs:

```ts
await AmbitenContext.run(
  {
    tenantId: job.tenantId
  },

  async () => {
    // tenant-aware work
  }
);
```

The context carries the identity after it has been established.

It does not itself authenticate or authorize the caller.

## Tenant Resolution Is Not Authorization

These concerns should remain separate:

```text
Authentication
→ Who is the caller?

Tenant Resolution
→ Which tenant belongs to this execution?

Authorization
→ May this caller act for that tenant?
```

Having:

```ts
AmbitenContext.get().tenantId
```

does not by itself prove that the caller is authorized for that tenant.

That remains an application security responsibility.

## Tenant Infrastructure

`AmbitenContext` carries tenant identity.

It does not store the entire tenant infrastructure lifecycle.

Conceptually:

```text
AmbitenContext
tenantId = tenant-a
      ↓
Model / Runtime
      ↓
MultiTenantManager
      ↓
TenantConfig
      ↓
MongoDB Client
      ↓
Tenant Database
```

The separation is:

```text
AmbitenContext
→ tenant identity

MultiTenantManager
→ tenant infrastructure
```

This keeps connection lifecycle and tenant registry state out of execution context.

## Dynamic Tenants

An execution can carry a tenant that has not yet been registered locally.

```text
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager.resolveTenant()
      ↓
TenantConfigResolver
      ↓
register tenant
      ↓
getClient()
```

The context does not change merely because infrastructure had to be discovered dynamically.

Identity and infrastructure resolution remain separate.

## Database Scope

`dbName` can represent the database scope associated with an execution.

```ts
await AmbitenContext.run(
  {
    dbName: "analytics"
  },

  async () => {
    // execution
  }
);
```

For model operations, that value can participate through the effective `ModelContext`.

```text
AmbitenContext.dbName
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.dbName
      ↓
DbProvider
```

An explicit operation-level override may take precedence where the public API permits it.

## Collection Scope

`collectionName` can also be carried as execution state where a runtime collection override is required.

```text
AmbitenContext.collectionName
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.collectionName
      ↓
effective collection resolution
```

The model still owns its normal collection boundary.

Context provides a supported runtime override rather than redefining the model itself.

## Request Identity

`requestId` provides an execution correlation identifier.

```ts
await AmbitenContext.run(
  {
    requestId: "req-123"
  },

  async () => {
    // execution
  }
);
```

Runtime-aware logging or instrumentation can consume it:

```ts
const {
  requestId
} =
  AmbitenContext.get();

logger.info(
  "User created",
  {
    requestId
  }
);
```

This allows correlation information to remain execution-scoped instead of being threaded through every service signature.

## Logging Context

`AmbitenContextState` can carry:

```text
logger
loggerMeta
```

This allows logging infrastructure to enrich events with execution metadata.

For example:

```text
requestId
tenantId
operation metadata
custom logger metadata
```

The context makes correlation information available.

It does not guarantee delivery, buffering, storage, or transport behavior of the configured logging backend.

Those properties belong to the logger or instrumentation implementation.

## Debug State

The `debug` field allows debug-related runtime behavior to participate in the execution scope.

```ts
const {
  debug
} =
  AmbitenContext.get();
```

Because debug state is execution-scoped, one request or job does not need to mutate global debug behavior for unrelated concurrent executions.

## Runtime Metadata

`meta` allows operation metadata to participate in execution.

Conceptually:

```text
Execution
   ↓
AmbitenContext.meta
   ↓
runtime instrumentation
middleware
diagnostics
```

Metadata should describe execution behavior rather than become a general-purpose store for arbitrary domain objects.

## Query Observation

The context can carry an `observer`:

```ts
export interface AmbitenQueryObserver {
  onQuery?: (
    payload: Record<string, any>
  ) => void | Promise<void>;

  onQueryError?: (
    payload: Record<string, any>
  ) => void | Promise<void>;
}
```

This provides an execution-aware observation hook for query behavior.

Conceptually:

```text
Model Operation
      ↓
Query Execution
      ↓
AmbitenQueryObserver
      ├── onQuery(...)
      └── onQueryError(...)
```

Observer behavior remains part of instrumentation.

It should not be confused with persistence correctness or transaction ownership.

## Query Budgets

The execution context can also carry quota/budget information.

```ts
export interface AmbitenQuotaBudgetInput {
  maxQueries?: number;
  queriesExecuted?: number;
  totalTimeMs?: number;
}
```

This makes execution-level accounting possible without storing budget state as process-global mutable data.

Conceptually:

```text
Execution Boundary
      ↓
AmbitenContext.budget
      ↓
runtime operations
      ↓
query accounting
```

Budget enforcement behavior depends on the runtime components that consume this state.

## Transaction-Aware Execution

Transaction continuity is one of the major uses of `AmbitenContext`.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create({
      name: "Alice"
    });

    await OrderModel.create({
      item: "Starter Kit"
    });
  }
);
```

Conceptually:

```text
Transaction Boundary
      ↓
ClientSession S1
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
participating operations
```

The session does not need to be manually passed through each service method.

## Transaction Participation vs Ownership

The context carries the active transaction session.

It does not mean each model operation owns the transaction lifecycle.

The surrounding transaction boundary owns:

```text
session creation
commit
rollback
session completion
```

Participating model operations consume the active session.

```text
withTransaction()
      ↓
session S1
      ↓
Model A
      ↓
Model B
      ↓
boundary completes
```

This keeps transaction participation separate from transaction ownership.

## Adapter-Managed Transactions

Adapters may establish execution-wide transactions where configured.

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

From the model's perspective, the important fact is that an active session exists in the effective operation context.

The model does not need to know whether that transaction was created manually or through an adapter boundary.

## Adapter Integration

Supported framework adapters normally establish `AmbitenContext` before application work begins.

Conceptually:

```text
Framework Request / Invocation
      ↓
Adapter
      ↓
Adapter Runtime
      ↓
AmbitenContext.run(...)
      ↓
Application
```

Adapters may resolve:

```text
tenantId
requestId
dbName
collectionName
debug state
logger metadata
custom metadata
```

according to their configuration before invoking application logic.

The exact integration differs by framework, but the execution-state contract remains the same.

## Framework Boundaries

Examples include:

```text
Express
→ middleware boundary

Fastify
→ lifecycle boundary

NestJS
→ interceptor / Observable subscription boundary

GraphQL
→ operation context boundary

AWS Lambda
→ invocation boundary
```

The adapter is responsible for keeping the actual application execution inside the active Ambiten boundary.

## Explicit Execution Without an Adapter

Adapters are not required for every Ambiten execution.

For background or custom runtime work:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "job-42"
  },

  async () => {
    await executeJob();
  }
);
```

This gives non-framework execution the same context model used by adapter-managed requests.

## Background Jobs

For a job carrying tenant identity:

```ts
await AmbitenContext.run(
  {
    tenantId: job.tenantId,
    requestId: job.id
  },

  async () => {
    await processJob(job);
  }
);
```

The job creates a **new execution boundary**.

Do not assume the `AsyncLocalStorage` context from the producer process automatically appears in a worker process.

## Queues and Process Boundaries

`AsyncLocalStorage` propagates through supported asynchronous work inside one process execution chain.

It does not automatically cross:

```text
message queues
worker processes
HTTP service boundaries
separate Node.js processes
external event systems
```

Execution identity must be propagated explicitly across those boundaries.

For example:

```text
Service A Context
      ↓
message payload / headers
      ↓
Queue
      ↓
Worker B
      ↓
new AmbitenContext.run(...)
```

This is an important distinction between **async continuity** and **distributed propagation**.

## Detached Work

Work that intentionally outlives the execution boundary should establish its own context.

Avoid conceptually relying on:

```text
Request Context
      ↓
fire-and-forget task
      ↓
continues after request boundary
```

Instead:

```text
Request
   ↓
enqueue explicit execution identity
   ↓
Worker
   ↓
new AmbitenContext
```

An execution boundary should remain finite.

## Context and AmbitenClient

`AmbitenClient` can interact with execution state in more than one way.

### Through the Model Runtime

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext
      ↓
AmbitenClient.db(ctx)
```

Here, the model performs the context binding.

### Through Ambient Client Helpers

Certain client helpers can read `AmbitenContext` directly.

Conceptually:

```text
AmbitenContext
      ↓
AmbitenClient.resolveRuntime()
      ↓
runtime infrastructure
```

These paths should not be conflated.

Not every `AmbitenClient` method independently reads ambient context.

## Context and Schema

The schema participates through the model's effective operation context.

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
AmbitenSchema / Middleware
```

The schema does not independently resolve the original request context or tenant.

This allows schema behavior to remain framework-independent.

## Context and Middleware

Middleware can consume runtime-aware model context during operation execution.

For example:

```text
Effective ModelContext
      ↓
before middleware
      ↓
model operation
      ↓
after middleware
```

This allows persistence-oriented policies to observe values such as:

```text
tenantId
requestId
session
soft-delete controls
database scope
```

without requiring controllers to forward them manually.

## Context and Providers

The provider consumes the effective `ModelContext` prepared by the model.

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext
      ↓
DbProvider
      ↓
AmbitenClient
```

The provider resolves database/client/session infrastructure.

It does not own the original execution boundary.

## What Belongs in Context

Good context values describe execution.

Examples:

```text
tenant identity
request identity
database override
collection override
transaction session
logging metadata
debug state
operation metadata
query observer
runtime budget
```

These values answer questions such as:

```text
Who does this execution belong to?

What infrastructure scope applies?

What transaction is active?

How should this execution be observed?

What runtime constraints apply?
```

## What Does Not Belong in Context

Avoid using context as a hidden domain-data store.

Examples that generally should remain in ordinary application data flow:

```text
user form payloads
orders
shopping carts
business entities
large request bodies
domain aggregates
application workflow state
```

Context should describe **how execution behaves**, not replace function arguments for business data.

## Common Runtime Pattern: Tenant Identity

```ts
const {
  tenantId
} =
  AmbitenContext.get();

console.log(
  tenantId
);
```

This is appropriate for runtime infrastructure that needs the current execution identity.

Application authorization should still be handled explicitly by the security layer.

## Common Runtime Pattern: Logging

```ts
const {
  requestId,
  tenantId
} =
  AmbitenContext.get();

logger.info(
  "User created",
  {
    requestId,
    tenantId
  }
);
```

Context makes correlation metadata available without changing every service signature.

## Common Runtime Pattern: Auditing

```ts
const {
  requestId,
  tenantId
} =
  AmbitenContext.get();

await AuditLogModel.create({
  requestId,
  tenantId,
  event: "user.created"
});
```

This can associate application audit data with the active execution.

Whether and what to audit remains an application policy decision.

## Concurrent Execution

Because context state is execution-scoped, concurrent operations can carry different identities.

```text
Request A
tenantId = tenant-a
requestId = req-a
      ↓
shared services
      ↓
shared models


Request B
tenantId = tenant-b
requestId = req-b
      ↓
shared services
      ↓
shared models
```

Shared application objects should not copy tenant or request state into mutable instance fields.

Read execution state from the current boundary where necessary.

## Process Lifetime vs Execution Lifetime

This distinction is central to Ambiten.

```text
PROCESS LIFETIME
────────────────
AmbitenRuntime
AmbitenClient
MongoDB connections
MultiTenantManager
provider configuration
logging infrastructure
```

```text
EXECUTION LIFETIME
──────────────────
AmbitenContext
tenantId
requestId
dbName
collectionName
session
logger metadata
debug state
operation metadata
observer
budget
```

Long-lived resources should be reusable.

Execution-specific state should remain isolated.

## Context Does Not Make Infrastructure Request-Scoped

A context may be short-lived while the infrastructure it selects is long-lived.

For example:

```text
Request A
      ↓
tenant-a context
      ↓
shared tenant-a MongoClient
```

and later:

```text
Request B
      ↓
tenant-a context
      ↓
same reusable tenant-a MongoClient
```

Context isolation does not require creating a new database client for every execution.

## Important Runtime Rules

Context exists only within the boundary that established it.

For supported request-driven environments:

```text
use the framework adapter
```

For standalone execution:

```text
use AmbitenContext.run(...)
```

For explicit transactions:

```text
use AmbitenContext.withTransaction(...)
```

For detached or cross-process work:

```text
propagate execution identity explicitly
and establish a new boundary
```

Inside ordinary model execution, prefer runtime propagation:

```ts
await UserModel.create(data);
```

instead of repeatedly reconstructing execution state:

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

unless an explicit operation-level override is intentional.

## Operation-Level Overrides

Context is not an unconditional immutable lock on every model value.

Where the model API supports explicit operation context, the precedence is:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

This allows controlled overrides while preserving deterministic resolution.

An override belongs to that operation.

It should not mutate the active context for unrelated operations.

## Context Isolation

Avoid storing context-derived request state on shared process objects.

For example, avoid:

```ts
service.tenantId =
  AmbitenContext.get().tenantId;
```

when `service` is shared across concurrent executions.

That turns execution-scoped state into mutable process state.

Prefer reading the active context when needed or allowing the model runtime to derive its effective `ModelContext`.

## Troubleshooting Context Loss

When execution state appears missing, inspect the execution boundary first.

Typical causes include:

```text
application work executed outside the adapter boundary
background work never established AmbitenContext
queue/process boundary expected AsyncLocalStorage to cross automatically
detached asynchronous work outlived its boundary
framework subscription occurred outside the active context
transaction started outside the intended execution scope
```

The useful debugging question is:

> **Is the code that needs the state still executing inside the boundary that created it?**

If not, a new explicit execution boundary may be required.

## Relationship with the Runtime

<SignalFlow
  aria-label="AmbitenContext runtime relationship"
  :items='[
    "Execution Boundary",
    "AmbitenContext",
    "AmbitenModel",
    "Infrastructure Resolution",
    "MongoDB"
  ]'
/>

The detailed relationship is:

```text
Execution Boundary
      ↓
AmbitenContextState
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel.mergeCtx()
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
```

Different runtime components consume context at different levels.

`AmbitenContext` carries the full execution state.

`AmbitenModel` derives operation state.

Providers and infrastructure layers resolve the resources needed to execute that operation.

## Mental Model

A useful mental model is:

```text
Boundary creates execution.

Context carries execution.

Model binds execution to an operation.

ModelContext carries operation state.

Infrastructure interprets operation state.
```

Or more compactly:

```text
AmbitenContextState
= full execution state

AmbitenContext
= execution-state propagation

ModelContext
= model-operation state

AmbitenModel
= context binding + operation coordination
```

## Summary

`AmbitenContext` is Ambiten's execution-scoped state mechanism.

It carries runtime information such as:

- tenant identity,
- request identity,
- database scope,
- collection scope,
- transaction sessions,
- logger metadata,
- debug state,
- operation metadata,
- query observers,
- execution budgets.

Its role is to make execution state available across supported asynchronous work without turning application services into infrastructure carriers.

For model execution:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema / Middleware / Provider
```

For runtime infrastructure that reads context directly:

```text
AmbitenContext
      ↓
runtime helper
      ↓
infrastructure behavior
```

Across process, queue, or service boundaries, execution identity must be propagated explicitly and a new context boundary established.

The architectural principle is:

> **Context carries execution state. It does not replace application data, authorization, infrastructure ownership, or distributed coordination.**

## Related Pages

- [Context Binding](/models/context-binding)
- [AmbitenModel](/models/ambiten-model)
- [Schema](/models/schema)
- [Provider Contract](/models/provider-contract)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [AmbitenClient](/reference/api/ambiten-client)
- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Architecture](/architecture/whitepaper)