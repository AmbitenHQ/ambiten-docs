# Why Ambiten

Many MongoDB libraries focus on data access.

Ambiten focuses on the execution surrounding that access.

Modern applications already know how to create, read, update, and delete documents. The harder problem begins when the same application must also carry tenant identity, transaction sessions, request metadata, middleware behavior, database scope, and instrumentation context through services, handlers, resolvers, workers, and model operations.

Ambiten provides a runtime structure for carrying that execution state and binding it to persistence operations without forcing application code to manually propagate every infrastructure value.

## The problem: execution state leaks into application code

MongoDB applications rarely become difficult because teams cannot write queries.

They become difficult when the operational state surrounding those queries is coordinated differently across different parts of the system.

A growing application may need to preserve:

```text
tenant identity
request identity
database scope
transaction session
runtime metadata
middleware behavior
instrumentation context
```

through nested asynchronous execution.

Without a shared runtime model, that state often travels through application signatures:

```ts
await createUser(
  data,
  tenantId,
  session,
  requestId,
  dbName
);
```

The problem becomes more visible as the system grows.

A service forwards the tenant.

Another forwards the session.

A worker reconstructs database state differently.

A route adds logging metadata.

A background process forgets one of those values entirely.

The application begins paying an infrastructure plumbing cost.

This is not primarily a document-modeling problem.

It is an execution-model problem.

## The Ambiten shift: execution-scoped runtime state

Ambiten treats persistence as part of a larger execution model rather than as a collection of unrelated database calls.

Instead of manually passing execution state through every application layer, that state can be established at an execution boundary:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },
  async () => {
    await UserModel.create(data);
  }
);
```

The application operation remains focused:

```ts
await UserModel.create(data);
```

while the model can inherit the execution state established around it.

Conceptually:

```text
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
Schema / Middleware
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

The model call stays small.

The runtime around it remains explicit.

## AmbitenContext and ModelContext

A central part of Ambiten's execution model is the separation between full execution state and operation-facing persistence state.

`AmbitenContext` carries the broader execution:

```text
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

When a model operation runs, `AmbitenModel` derives the Effective `ModelContext` used by that operation.

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

That context can then participate in:

```text
schema behavior
middleware
collection resolution
provider execution
tenant-aware database resolution
transaction participation
```

The goal is not to hide execution state.

The goal is to give it a defined place to live.

## Strategic positioning

Traditional MongoDB data layers often concentrate on mapping documents and making queries easier to express.

Ambiten adds an execution layer around those operations.

| Capability | Traditional ODM / data-access approach | Ambiten approach |
|---|---|---|
| Primary focus | Document modeling and query ergonomics | Execution-aware MongoDB runtime |
| Execution state | Often passed manually or handled by application conventions | Carried through `AmbitenContext` |
| Model operation state | Usually assembled at the call site | Bound through Effective `ModelContext` |
| Multi-tenancy | Often implemented through filters, repositories, or custom routing | Tenant-aware execution and infrastructure resolution |
| Transactions | Explicit session passing is common | Session propagation through execution context |
| Middleware | Usually tied to model or framework hooks | Participates in the model runtime |
| Instrumentation | Commonly added around individual calls | Can consume structured runtime metadata |
| Framework integration | Application-specific | Adapter-driven execution ingress |
| Direct MongoDB usage | Often separate from higher abstractions | `AmbitenClient` remains a first-class path |

Ambiten does not replace MongoDB's capabilities.

It coordinates how application execution reaches them.

## Why this matters as systems grow

The value of a runtime model becomes more visible when the same operation must behave consistently across many execution paths.

For example:

```text
HTTP request
GraphQL resolver
background worker
scheduled task
CLI process
serverless invocation
```

These entry points are different.

The persistence behavior underneath them does not need to become different as well.

Ambiten gives those execution paths a common way to establish runtime state before reaching the model layer.

## Transactions should not depend on manual session threading

MongoDB transactions become harder to reason about when every nested operation must remember to receive and forward the active session.

For example:

```ts
await UserModel.create(
  userData,
  { session }
);

await ProfileModel.create(
  profileData,
  { session }
);
```

Ambiten can instead carry the session through the active execution:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(
      userData
    );

    await ProfileModel.create(
      profileData
    );
  }
);
```

The session path becomes:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Participating Operations
```

Participating Ambiten model operations can therefore reuse the active MongoDB session without requiring every application layer to forward it manually.

The enclosing transaction boundary still owns:

```text
start
commit
rollback
completion
```

And MongoDB transaction semantics still apply only to participating MongoDB operations.

External APIs, queues, file writes, and other side effects do not become transactional simply because they run inside the same application callback.

## Tenant boundaries should be explicit by design

Many multi-tenant systems begin by treating tenancy as a query convention:

```ts
await users.find({
  tenantId: "acme"
});
```

That can be appropriate for a shared-collection topology.

But not every multi-tenant architecture uses the same storage model.

Ambiten separates tenant identity from tenant infrastructure.

```text
Who is this execution for?
→ TenantResolver

Carry tenant identity
→ AmbitenContext

Where does this tenant live?
→ TenantConfigResolver /
  MultiTenantManager

Give me the MongoClient
→ TenantClientResolver /
  MultiTenantManager
```

A model operation can then inherit the active tenant identity through the Effective `ModelContext`.

```text
AmbitenContext.tenantId
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.tenantId
      ↓
Tenant Infrastructure
      ↓
MongoDB
```

This reduces the amount of tenant-routing logic that must be repeated through application services.

It does not mean that tenant identity alone guarantees isolation.

Actual tenant isolation still depends on:

```text
authentication
authorization
storage topology
tenant resolution
query policy
database configuration
infrastructure design
```

Ambiten gives tenant execution a defined runtime path.

The application architecture still determines how isolation is enforced.

## Runtime portability should not require a different model layer

An application's entry points can change as the system evolves.

The same persistence model may eventually be used behind:

```text
Express routes
Fastify handlers
NestJS applications
GraphQL resolvers
Lambda functions
background workers
scheduled jobs
```

Ambiten separates execution ingress from model execution.

```text
Framework / Invocation
      ↓
Adapter or Explicit Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
```

Framework adapters establish the execution boundary for supported environments.

Non-framework execution can establish the same boundary explicitly with `AmbitenContext.run(...)`.

This lets the model layer remain independent from any one framework's request object.

## Direct usage remains first-class

Ambiten is not useful only after an application adopts the complete runtime stack.

A small application can begin with:

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

Then introduce additional structure when needed:

```text
AmbitenClient
      ↓
AmbitenContext
      ↓
AmbitenSchema + AmbitenModel
      ↓
Framework Adapters
      ↓
Multi-Tenant Runtime
      ↓
Transactions and Instrumentation
```

This progressive path is intentional.

Scripts, small services, migrations, internal tools, educational examples, and larger applications can use the same underlying runtime primitives at different levels of abstraction.

## Middleware belongs near persistence behavior

Some behavior needs to remain consistent regardless of which application entry point initiated an operation.

Examples include:

```text
timestamps
normalization
soft-delete behavior
query shaping
persistence metadata
lifecycle policy
```

Ambiten schema middleware gives those concerns a place close to the model and persistence boundary.

```text
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Persistence Operation
```

Middleware should not become a dumping ground for every business concern.

Authentication, authorization, payment rules, approval workflows, and broader application policy still belong at the appropriate application boundary.

## Instrumentation should understand execution

A database call is often more useful operationally when it can be related to the execution that produced it.

`AmbitenContextState` can carry metadata such as:

```text
tenantId
requestId
loggerMeta
debug
meta
observer
budget
```

That gives instrumentation a consistent execution context.

Ambiten provides the runtime metadata boundary and instrumentation points.

The actual logging, metrics, tracing, export, storage, and cross-service correlation behavior belongs to the observability system being used.

This distinction matters.

Runtime metadata makes instrumentation possible.

It does not automatically create distributed tracing or guaranteed telemetry delivery.

## What Ambiten owns

Ambiten is responsible for the execution model around MongoDB operations.

That includes responsibilities such as:

```text
execution-scoped context
model context binding
middleware participation
provider contracts
tenant-aware infrastructure resolution
transaction session propagation
MongoDB client capability
runtime metadata
```

Other responsibilities remain outside the runtime.

```text
Authentication
→ application / identity system

Authorization
→ application policy

MongoDB durability
→ MongoDB topology

Cross-service coordination
→ system architecture

External side-effect consistency
→ workflow design

Telemetry delivery
→ observability backend
```

This separation is intentional.

Ambiten should make its own guarantees clear without pretending to own the guarantees of the entire distributed system.

## What Ambiten becomes as the application grows

Ambiten can begin as a direct MongoDB capability:

```text
AmbitenClient
      ↓
MongoDB
```

It can then become the execution foundation around the persistence layer:

```text
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
Schema / Middleware
      ↓
Tenant / Provider Infrastructure
      ↓
AmbitenClient
      ↓
MongoDB
```

The same runtime model can support increasingly demanding application requirements without forcing infrastructure state into every application method signature.

The goal is not to make every concern automatic.

The goal is to make execution responsibilities explicit, composable, and easier to reason about.

## Mental model

```text
Without a runtime model

Execution state
travels through
application code.
```

```text
With Ambiten

Execution Boundary
      ↓
AmbitenContext
      ↓
Model Binding
      ↓
Infrastructure Resolution
      ↓
MongoDB
```

Or more simply:

```text
Context carries execution.

Model binds execution
to an operation.

ModelContext carries
operation state.

Infrastructure resolves
resources.

MongoDB performs
persistence.
```

## Summary

Ambiten exists because MongoDB access is only part of the problem.

As applications grow, the harder challenge is coordinating the execution around that access:

```text
tenant identity
transaction sessions
runtime metadata
middleware
database scope
provider resolution
instrumentation
```

Ambiten gives those concerns a structured runtime model while keeping application-facing database operations straightforward.

It does not replace application security, MongoDB topology, distributed coordination, or observability infrastructure.

It provides the execution foundation that allows those systems to meet the persistence layer through clear boundaries.

That is the difference between using MongoDB through isolated calls and operating MongoDB through an execution-aware runtime.