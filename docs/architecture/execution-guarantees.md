---
title: Execution Guarantees
description: The runtime invariants Ambiten preserves inside an execution boundary, including context isolation, tenant routing, transaction continuity, middleware ordering, and explicit limits of responsibility.
---

# Execution Guarantees

Execution guarantees define what applications can rely on while work executes inside the Ambiten runtime.

They establish the boundaries of correctness, isolation, consistency, and lifecycle behavior that Ambiten preserves across supported execution environments.

This page is intentionally explicit.

It describes both:

```text
what Ambiten guarantees
```

and:

```text
where that guarantee ends
```

If you are looking for the order in which execution moves through the runtime, see [Runtime Execution Flow](/architecture/runtime-execution-flow).

<DocOverviewCards
  eyebrow="Runtime Contract"
  title="Ambiten guarantees runtime invariants inside an execution boundary."
  description="The runtime isolates execution context, preserves supported async continuity, keeps participating transactional operations on the active session, resolves tenant infrastructure deterministically, and maintains predictable operation lifecycles."
  accent="#6d5dfc"
  :signals='[
    "Context isolation",
    "Async continuity",
    "Transaction continuity",
    "Tenant routing",
    "Deterministic resolution"
  ]'
  :cards='[
    {
      "label": "Isolated",
      "title": "Execution state belongs to one boundary",
      "text": "Concurrent requests, operations, jobs, and invocations receive independent AmbitenContext state even when they reuse the same runtime infrastructure."
    },
    {
      "label": "Deterministic",
      "title": "Runtime resolution follows defined precedence",
      "text": "Models resolve effective context and infrastructure from explicit operation state, the active runtime context, and model defaults according to defined resolution rules."
    },
    {
      "label": "Bounded",
      "title": "The guarantee stops at distributed boundaries",
      "text": "Processes, queues, networks, external side effects, and infrastructure availability require explicit application or platform coordination."
    }
  ]'
  :flow='[
    { "label": "Boundary", "title": "AmbitenContext" },
    { "label": "Execution", "title": "Application + Models" },
    { "label": "Resolution", "title": "Tenant + Infrastructure" },
    { "label": "Persistence", "title": "MongoDB" }
  ]'
/>

## Why Guarantees Matter

In simple applications, execution behavior can appear obvious from the call stack.

Runtime-driven systems are different.

Correctness depends on behavior across:

```text
asynchronous boundaries
concurrent requests
tenant resolution
transaction sessions
framework lifecycles
dynamic infrastructure
package boundaries
```

Without a defined contract, applications are forced to depend on assumptions.

Those assumptions can become subtle production failures such as:

```text
tenant context leaking between requests
operations leaving an active transaction
different layers resolving different databases
background work inheriting invalid request state
framework adapters losing context during async execution
```

Ambiten defines its execution guarantees so runtime behavior can be reasoned about, tested, and composed deliberately.

# Guaranteed Behavior

## 1. Execution Context Isolation

Each Ambiten execution boundary receives its own execution context.

Conceptually:

```text
Request A
→ AmbitenContext A

Request B
→ AmbitenContext B

Job C
→ AmbitenContext C
```

Context state from one active execution is not intended to become the execution state of another concurrent boundary.

For example:

```ts
await Promise.all([
  AmbitenContext.run(
    {
      tenantId: "tenant-a"
    },

    async () => {
      await UserModel.find({});
    }
  ),

  AmbitenContext.run(
    {
      tenantId: "tenant-b"
    },

    async () => {
      await UserModel.find({});
    }
  )
]);
```

Each operation resolves its own active tenant context.

This remains true even when both executions reuse long-lived runtime infrastructure such as MongoDB clients.

The important distinction is:

```text
runtime resources
→ may be shared

execution state
→ remains scoped
```

## 2. Async Context Continuity

Within a supported active execution boundary, `AmbitenContext` remains associated with asynchronous work that belongs to that execution.

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },

  async () => {
    const before =
      AmbitenContext.get();

    await someAsyncOperation();

    const after =
      AmbitenContext.get();
  }
);
```

The same logical execution continues to observe its runtime state across supported asynchronous boundaries.

This allows:

```text
controller
   ↓
service
   ↓
await
   ↓
repository
   ↓
model
```

to remain context-aware without manually passing execution state through every function.

This guarantee applies only while work still belongs to the active execution boundary.

It does not automatically extend across:

```text
process boundaries
network calls
message queues
future independent jobs
external event systems
```

Those boundaries require explicit propagation and reconstruction.

## 3. Framework Boundary Continuity

Supported framework adapters establish Ambiten context around the framework's actual downstream execution lifecycle.

Conceptually:

```text
Express
→ downstream middleware / route execution

Fastify
→ downstream lifecycle / handler execution

NestJS
→ downstream Observable execution

GraphQL
→ operation / resolver execution

Lambda
→ invocation handler execution
```

Once execution has entered the Ambiten boundary, downstream Ambiten-aware application work participates in the active runtime context.

The framework-specific mechanism differs.

The runtime contract does not.

## 4. Context Resolution Precedence

When model execution combines multiple sources of runtime state, Ambiten resolves the effective operation context according to defined precedence.

Conceptually:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

Higher-precedence values override lower-precedence defaults where the public API permits overrides.

This means model behavior does not depend on arbitrary lookup order.

Given the same:

```text
operation context
active runtime context
model configuration
```

Ambiten applies the same resolution rules.

## 5. Tenant Identity Continuity

When a runtime boundary contains a resolved tenant identity, downstream Ambiten-aware operations inherit that identity unless an explicit supported operation-level override changes the effective context.

For example:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant5"
  },

  async () => {
    await UserModel.find({});
    await AuditModel.create(...);
  }
);
```

Both operations resolve from the active execution containing:

```text
tenantId = tenant5
```

Application code does not need to repeatedly rediscover the tenant from the incoming transport.

The request source may have been:

```text
header
JWT claim
subdomain
cookie
gateway metadata
custom resolver
```

Once resolved, `AmbitenContext` represents the runtime identity.

## 6. Tenant Infrastructure Resolution

Tenant identity and tenant infrastructure are deliberately separated.

```text
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
TenantConfig
      ↓
MongoDB client
      ↓
tenant database
```

When a tenant-aware operation requires persistence, Ambiten resolves infrastructure through the configured tenant-management rules.

This may involve:

```text
local registry lookup
dynamic TenantConfigResolver discovery
lazy client activation
database selection
```

Application code does not need to manually reproduce those decisions.

## 7. Dynamic Tenant Resolution Consistency

If a tenant is not already registered and a `TenantConfigResolver` is configured, Ambiten can resolve that tenant through the manager's dynamic-resolution path.

Conceptually:

```text
tenantId
   ↓
resolveTenant()
   ↓
local registry?
   │
   ├── yes → use registered configuration
   │
   └── no
        ↓
   TenantConfigResolver
        ↓
   register result
```

After successful resolution, the tenant becomes part of the current runtime registry and subsequent infrastructure access uses that registered tenant state.

Dynamic discovery does not require application model code to change.

## 8. Tenant Routing Determinism

For the same effective tenant context and tenant configuration, tenant-aware model operations resolve through the same tenant infrastructure rules.

For example:

```text
tenantId = tenant5
        ↓
MultiTenantManager
        ↓
db_tenant5
```

Ambiten does not silently select an unrelated tenant because another request is executing concurrently.

Tenant routing is derived from the active effective context, not from mutable process-global request state.

This is a runtime-routing guarantee.

It is not an authorization guarantee.

## 9. Request State Is Not Stored as Shared Global Identity

Execution-specific identity belongs to `AmbitenContext`.

It should not depend on mutable process-global variables such as:

```ts
let currentTenantId:
  string | undefined;
```

Ambiten's execution model allows long-lived infrastructure to coexist with short-lived isolated execution state.

```text
LONG-LIVED
──────────
AmbitenRuntime
MultiTenantManager
MongoDB clients


EXECUTION-SCOPED
────────────────
tenantId
requestId
session
metadata
```

This distinction is especially important for concurrent servers and warm serverless environments.

## 10. Transaction Session Continuity

When an Ambiten transaction boundary is active, participating Ambiten model operations resolve the active MongoDB session from that transaction context.

For example:

```ts
await AmbitenContext
  .withTransaction(
    async () => {
      await UserModel.create(
        data
      );

      await ProfileModel.create(
        profile
      );
    }
  );
```

Conceptually:

```text
withTransaction()
      ↓
session S1
      ↓
UserModel
      ↓
session S1
      ↓
ProfileModel
      ↓
session S1
```

The application does not need to manually pass the session between those model operations.

## 11. Transaction Boundary Ownership

The component that creates the transaction boundary owns its completion.

For explicit transactions:

```ts
await AmbitenContext
  .withTransaction(
    async () => {
      // transactional work
    }
  );
```

the transaction completes when the callback completes.

Conceptually:

```text
callback resolves
→ commit

callback rejects
→ abort / rollback
```

For adapter-managed request-wide transactions:

```text
Adapter
   ↓
Transaction Boundary
   ↓
downstream execution
   ↓
completion / failure
   ↓
commit / rollback
```

Individual model operations do not independently commit the surrounding transaction.

## 12. Nested Transaction-Aware Operations Share Runtime State

When multiple participating model operations execute inside one transaction-aware runtime boundary, they observe the same active execution state and session.

```text
Transaction
   ↓
Service A
   ↓
Model A
   ↓
Service B
   ↓
Model B
```

This allows transaction continuity to survive service-layer composition without manually threading the MongoDB session through business APIs.

## 13. Model Operations Do Not Automatically Escape the Active Transaction

Ambiten-aware model operations executed normally inside the active transaction resolve the transaction session from runtime context.

That protects application code from accidentally losing the session merely because execution crossed:

```text
service functions
repository functions
await boundaries
model boundaries
```

This guarantee applies to operations that participate in Ambiten's runtime resolution.

It does not turn arbitrary direct MongoDB driver calls or unrelated external clients into transaction-aware operations automatically.

## 14. Model Execution Is Framework-Independent

`AmbitenModel` does not require transport-specific request objects in order to resolve runtime state.

The same operation:

```ts
await UserModel.find({});
```

can execute inside:

```text
Express
Fastify
NestJS
GraphQL
Lambda
worker
scheduled job
```

provided a valid Ambiten execution boundary has been established.

This allows model and service code to remain independent from the ingress framework.

## 15. Infrastructure Resolution Follows Effective Context

Database, collection, tenant, client, and session resolution are driven by the effective operation context and configured runtime rules.

Conceptually:

```text
Effective Context
      ↓
Infrastructure Resolution
      ↓
Client
Database
Collection
Session
```

Ambiten does not require controllers or services to manually select those resources for every operation.

Resolution remains explainable from the inputs and runtime configuration that produced it.

## 16. Lazy Tenant Clients Do Not Change Execution Identity

A tenant may be registered without an active database connection.

For example:

```text
tenant5
registered = true
connected = false
lazy = true
```

When persistence later requires a client:

```text
getClient("tenant5")
      ↓
connect
      ↓
connected = true
```

The infrastructure lifecycle may change.

The execution tenant identity does not.

This separates:

```text
who the operation belongs to
```

from:

```text
whether the tenant client is currently connected
```

## 17. Middleware Ordering Is Deterministic

Within a model operation, registered middleware follows the runtime's defined execution ordering.

Conceptually:

```text
before middleware
      ↓
operation
      ↓
after middleware
```

Hooks within a supported phase execute according to their registration order.

This allows behavior such as:

```text
validation
policy enforcement
operation shaping
logging
result transformation
```

to be composed predictably.

Middleware should not rely on unspecified ordering outside the runtime's documented lifecycle.

## 18. Operation Failures Propagate Through the Runtime Boundary

If tenant resolution, validation, model execution, provider resolution, transaction execution, or persistence fails, Ambiten propagates that failure to the enclosing execution boundary.

Conceptually:

```text
Runtime Operation
      ↓
failure
      ↓
reject / throw
      ↓
host environment
```

The hosting environment can then map that failure into its own semantics:

```text
HTTP error
GraphQL error
Lambda failure
worker retry
queue rejection
```

Ambiten does not silently convert failed persistence into successful execution.

## 19. Missing Required Tenant Resolution Fails the Execution

When tenancy is configured as part of an adapter execution and a tenant cannot be resolved, downstream tenant-aware execution should not silently continue under an unrelated default tenant.

Conceptually:

```text
Request
   ↓
Tenant Resolution
   ↓
no tenant
   ↓
execution fails
```

This avoids accidentally routing an unidentified tenant request into another tenant's database.

Applications that intentionally support non-tenant execution should configure that behavior explicitly rather than depend on an implicit fallback.

## 20. Runtime Resource Reuse Does Not Extend Context Lifetime

Resources such as MongoDB clients may outlive many runtime executions.

For example:

```text
MongoDB Client
   ├── Request A
   ├── Request B
   └── Request C
```

That does not mean the corresponding contexts are shared.

Each request still owns its own:

```text
tenantId
requestId
session
metadata
```

This guarantee is particularly important in:

```text
long-running HTTP servers
concurrent workloads
warm AWS Lambda environments
```

## 21. Execution Boundary Lifetime Is Finite

A runtime boundary begins when execution enters:

```ts
AmbitenContext.run(...)
```

or an adapter-established equivalent.

It ends when that execution scope completes.

Conceptually:

```text
enter boundary
      ↓
application work
      ↓
model operations
      ↓
completion
      ↓
leave boundary
```

Context state is not guaranteed to remain valid after execution leaves that boundary.

Do not capture runtime context and assume it remains the active logical execution indefinitely.

## 22. Detached Work Requires a New Boundary

Work that intentionally outlives the original execution should capture the identity it needs and establish a new runtime context.

For example:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();

await queue.publish({
  tenantId,
  requestId,
  payload
});
```

The consumer establishes:

```ts
await AmbitenContext.run(
  {
    tenantId:
      message.tenantId,

    requestId:
      message.requestId
  },

  async () => {
    await processMessage();
  }
);
```

The guarantee is not:

```text
context crosses the queue
```

The guarantee is:

```text
a newly established boundary
has its own correctly scoped context
```

## 23. Public Package Boundaries Preserve Supported Runtime Composition

Ambiten packages are intended to be consumed through their public exports.

For supported ESM consumers:

```text
ESM Application
      ↓
ESM Adapter
      ↓
ESM adapter-runtime
      ↓
ESM Core
```

For supported CommonJS consumers:

```text
CommonJS Application
      ↓
CommonJS Adapter
      ↓
CommonJS adapter-runtime
      ↓
CommonJS Core
```

This package relationship is important because execution context must remain coherent across the adapter/runtime/Core graph.

Applications should not bypass public exports with internal paths such as:

```text
@ambiten/core/dist/...
@ambiten/adapter-runtime/dist/...
```

Package-internal imports fall outside the supported public runtime contract.

# Observability Contract

Observability is associated with execution rather than with one particular framework.

Runtime metadata can include information such as:

```text
operation
tenantId
requestId
database
collection
duration
outcome
```

This allows instrumentation to correlate runtime behavior across:

```text
Express
Fastify
NestJS
GraphQL
Lambda
workers
```

The exact delivery, buffering, persistence, and failure characteristics of a telemetry backend depend on the configured instrumentation implementation.

Therefore the core execution guarantee should be understood as:

```text
runtime execution exposes structured context
for instrumentation
```

rather than:

```text
every external telemetry destination
will always receive an event
```

## Telemetry Must Not Be Confused with Execution Correctness

Application correctness should not depend on an external telemetry backend successfully accepting an event.

For example:

```text
MongoDB operation succeeded
```

and:

```text
remote telemetry transport succeeded
```

are separate concerns.

Where instrumentation is configured to operate asynchronously or non-blockingly, that behavior belongs to the instrumentation contract and should be documented there specifically.

# Non-Guaranteed Behavior

Ambiten is equally explicit about what falls outside its runtime guarantee.

## Cross-Process Context Propagation

`AmbitenContext` does not automatically cross:

```text
process boundaries
worker-thread boundaries
network boundaries
message queues
external event systems
```

Required identity must be propagated explicitly and a new execution boundary established on the receiving side.

## Cross-Service Transactions

Ambiten does not provide one MongoDB transaction spanning independent services or processes.

A MongoDB transaction belongs to the session and infrastructure participating in the active transaction scope.

Distributed coordination requires application or infrastructure patterns such as:

```text
sagas
outbox patterns
idempotency
workflow orchestration
compensation
```

when appropriate.

## Network Reliability

Ambiten does not guarantee:

```text
network availability
DNS availability
MongoDB reachability
cloud-provider availability
external API responsiveness
```

Those concerns belong to infrastructure resilience and application error handling.

## MongoDB Cluster Availability

Ambiten does not make an unavailable MongoDB deployment available.

MongoDB durability, replication, failover, read concern, write concern, transaction support, and topology behavior remain governed by MongoDB and its configuration.

## Authorization

Tenant resolution does not prove that the caller is authorized to act for that tenant.

For example:

```http
x-tenant-id: tenant5
```

may correctly resolve:

```text
tenant5
```

while the authenticated caller is not allowed to access it.

Applications remain responsible for:

```text
authentication
authorization
tenant membership
permission policy
```

## Global Consistency Across Tenants

Ambiten does not automatically coordinate independent tenants into one consistency domain.

For example:

```text
tenantA database
+
tenantB database
```

do not become one atomic unit because both are managed by Ambiten.

Cross-tenant workflows require explicit application coordination.

## External Side-Effect Atomicity

MongoDB transactions cannot automatically make unrelated external systems transactional.

For example:

```ts
await AmbitenContext
  .withTransaction(
    async () => {
      await chargeCustomer();

      await OrderModel.create(
        order
      );
    }
  );
```

The payment provider does not become part of the MongoDB transaction.

If MongoDB later aborts, Ambiten cannot automatically undo an already completed external charge unless the application implements compensating behavior.

## Direct Driver Calls Outside Runtime Resolution

If application code bypasses Ambiten and directly performs operations through unrelated MongoDB clients or sessions, those operations are outside Ambiten's automatic context and transaction guarantees.

For example:

```text
Ambiten transaction
      ↓
AmbitenModel operation
      → runtime-aware

unrelated raw MongoClient
      → application-managed
```

Ambiten can only guarantee behavior for operations participating in its runtime contract.

## Arbitrary Mutable Global State

Ambiten does not protect application code that stores execution identity in shared mutable globals.

For example:

```ts
let currentTenant:
  string | undefined;
```

can create its own concurrency bugs regardless of Ambiten's context isolation.

Execution-scoped state should remain inside the appropriate execution boundary.

## Unbounded Execution

Ambiten does not guarantee safety for:

```text
infinite loops
unbounded background work
excessively long transactions
handlers that never resolve
uncontrolled memory growth
```

Applications remain responsible for execution limits, timeouts, cancellation strategy, and workload design.

## Detached Async Work After Boundary Completion

Ambiten does not guarantee that async work intentionally detached from a completed execution continues to represent that original logical request correctly.

If work must outlive the boundary:

```text
capture required identity
      ↓
schedule / publish work
      ↓
create a new AmbitenContext
```

Do not treat an expired request context as a durable job context.

## Permanent Dynamic Tenant Registry State

`MultiTenantManager` maintains runtime registry state for the lifetime of the current process or execution environment.

It is not a durable tenant database.

A process restart, deployment replacement, or Lambda cold start may rebuild that runtime state.

Dynamic tenants that must be rediscoverable should have a durable source behind `TenantConfigResolver`.

# Guarantee Boundaries

A useful way to understand the contract is by boundary type.

| Boundary | Ambiten Guarantee |
| --- | --- |
| Same `AmbitenContext` execution | Context continuity |
| Concurrent executions | Context isolation |
| Supported async chain | Runtime state continuity |
| Active transaction scope | Session continuity for participating operations |
| Tenant-aware model execution | Context-driven tenant routing |
| Dynamic tenant lookup | Defined manager/resolver lifecycle |
| Model middleware | Defined execution order |
| Framework adapter | Correct runtime entry boundary |
| Process / queue boundary | No automatic propagation |
| External API | No transactional guarantee |
| Different services | No shared runtime context |
| Infrastructure outage | No availability guarantee |

# Design Intent

Ambiten's guarantees are deliberately focused on **execution correctness within a defined runtime boundary**.

The runtime aims to make the following dependable:

```text
context is isolated
async execution retains its runtime identity
tenant routing follows the effective context
dynamic tenant resolution follows defined rules
transactional model operations share the active session
middleware executes predictably
resource reuse does not cause context reuse
failures propagate rather than silently changing scope
```

At the same time, Ambiten deliberately does not claim ownership over:

```text
distributed consensus
network reliability
external side-effect atomicity
application authorization
infrastructure availability
cross-service transactions
```

Those belong to higher-level system design.

## Runtime Correctness vs System Correctness

This distinction is central.

```text
Ambiten Runtime
→ guarantees its execution contract

Application
→ defines business correctness

MongoDB
→ provides database semantics

Infrastructure
→ provides deployment reliability

Distributed architecture
→ coordinates independent systems
```

No individual runtime can guarantee correctness for every layer of a distributed application.

Ambiten instead guarantees the part of the system it actually controls.

# Mental Model

```text
Inside the boundary,
Ambiten owns runtime consistency.

Across boundaries,
identity and coordination must be explicit.
```

Another way to express it:

```text
Ambiten guarantees
execution correctness.

The application and infrastructure
guarantee system correctness.
```

# Summary

Execution guarantees define the contract between Ambiten and applications built on top of it.

Inside a valid runtime boundary, applications can rely on:

- isolated execution context,
- supported asynchronous context continuity,
- deterministic context resolution,
- tenant-aware infrastructure routing,
- dynamic tenant resolution through defined manager rules,
- transaction session continuity for participating operations,
- predictable middleware ordering,
- failure propagation,
- framework-independent model execution,
- resource reuse without execution-state leakage.

Those guarantees end at boundaries Ambiten does not control, including:

- separate processes,
- network calls,
- message queues,
- unrelated external systems,
- infrastructure outages,
- distributed transactions,
- application authorization policy.

The key contract is therefore:

```text
Ambiten guarantees correctness
inside its runtime boundary.

Crossing that boundary
requires explicit coordination.
```

## See Also

- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Instrumentation](/core/instrumentation)
- [Adapters Overview](/framework-adapters/overview)
- [Adapter Usage Patterns](/framework-adapters/usage-patterns)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)