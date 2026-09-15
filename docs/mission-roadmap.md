# Mission & Roadmap

Ambiten exists to improve how modern applications coordinate execution around MongoDB.

Most systems begin with queries and collections, then gradually accumulate tenant routing, transaction handling, runtime metadata, middleware behavior, instrumentation, and operational policy.

As applications grow, those concerns can become fragmented across services, frameworks, workers, and infrastructure layers until execution correctness depends heavily on convention and repeated application plumbing.

Ambiten approaches this differently.

It treats persistence as part of the execution architecture itself.

<DocOverviewCards
  eyebrow="Platform Direction"
  title="Ambiten is evolving from a MongoDB runtime into a broader execution platform."
  description="The roadmap focuses on stronger execution boundaries, transaction continuity, tenant-aware infrastructure, instrumentation, policy integration, and operational insight built around one coherent runtime model."
  accent="#4568f2"
  :signals='[
    "Context",
    "Transactions",
    "Tenancy",
    "Instrumentation",
    "Events",
    "Policy"
  ]'
  :cards='[
    {
      "label": "Foundation",
      "title": "Make execution easier to reason about",
      "text": "Context propagation, model binding, transaction participation, middleware behavior, and provider resolution establish a clear runtime foundation."
    },
    {
      "label": "Visibility",
      "title": "Expose runtime behavior more clearly",
      "text": "Instrumentation, events, metadata, and operational insight can make execution easier to observe, diagnose, and understand."
    },
    {
      "label": "Platform",
      "title": "Expand runtime coordination",
      "text": "Future work may extend policy integration, audit-oriented evidence, tenant infrastructure coordination, and operational intelligence around the existing execution model."
    }
  ]'
  :flow='[
    {
      "label": "Now",
      "title": "Execution foundation"
    },
    {
      "label": "Next",
      "title": "Runtime visibility and policy"
    },
    {
      "label": "Later",
      "title": "Broader runtime coordination"
    }
  ]'
/>

## The Ambiten thesis

Ambiten is built around a simple idea:

```text
Data access should participate
in a clear execution model.
```

Execution should not require tenant identity, transaction sessions, request metadata, database scope, and runtime state to be manually threaded through every service boundary.

Those concerns need defined runtime ownership.

Ambiten therefore centers model execution around:

```text
execution-scoped context
model context binding
transaction session propagation
tenant-aware infrastructure resolution
middleware participation
provider contracts
structured runtime metadata
```

The objective is not only cleaner application code.

The objective is to make execution easier to understand and coordinate as systems become more complex.

## The execution model

Ambiten's current architectural direction is:

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

Each layer owns a different responsibility.

```text
AmbitenContext
→ execution-scoped state

AmbitenModel
→ operation coordination
  and context binding

ModelContext
→ persistence-facing
  operation state

AmbitenSchema
→ structure and
  persistence behavior

MultiTenantManager
→ tenant infrastructure

AmbitenClient
→ MongoDB capability

Transaction Boundary
→ transaction lifecycle
```

The roadmap builds outward from this model rather than replacing it with unrelated features.

## What Ambiten is becoming

Ambiten is not intended to become only another query builder or document-mapping abstraction.

Its direction is toward a runtime platform around MongoDB execution.

That means keeping the execution model consistent across environments such as:

```text
HTTP applications
GraphQL resolvers
background workers
scheduled jobs
serverless invocations
CLI processes
maintenance workflows
```

The entry point may change.

The runtime model does not need to change with it.

Framework adapters can establish supported execution boundaries, while non-framework work can create them explicitly through `AmbitenContext.run(...)`.

## Current direction

The current priority is strengthening the execution foundation.

That includes continued work around:

```text
context propagation
model context binding
transaction continuity
multi-tenant infrastructure
middleware behavior
provider resolution
instrumentation
runtime lifecycle
package boundaries
framework integration
```

The priority is to keep those foundations understandable before introducing broader runtime capabilities.

Higher-level systems are only useful if the execution underneath them remains predictable.

## Context as the runtime foundation

`AmbitenContext` provides execution-scoped state.

That can include:

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

Model operations do not simply consume that state blindly.

They derive an Effective `ModelContext`:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

This distinction remains central to the roadmap.

Future runtime capabilities should build on clearly defined execution state rather than introduce parallel context mechanisms.

## Transaction continuity

Transactions are another foundational concern.

Ambiten's transaction model is:

```text
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Participating Operations
```

The transaction boundary owns:

```text
start
commit
rollback
completion
```

Participating Ambiten operations can reuse the active MongoDB session without application layers manually passing it through every call.

The roadmap may improve transaction coordination and diagnostics, but the fundamental boundary remains MongoDB transaction semantics.

Ambiten does not attempt to make arbitrary external side effects automatically transactional.

## Multi-tenancy direction

Multi-tenancy remains a major part of Ambiten's architecture.

The runtime separates tenant identity from tenant infrastructure.

```text
Who is this execution for?
→ TenantResolver

Carry tenant identity
→ AmbitenContext

Where does the tenant live?
→ TenantConfigResolver /
  MultiTenantManager

Give me the MongoClient
→ TenantClientResolver /
  MultiTenantManager
```

This allows tenant-aware execution without forcing application code to discover database infrastructure manually.

Future work can improve:

```text
tenant discovery
tenant configuration resolution
client lifecycle
lazy activation
resource visibility
tenant infrastructure diagnostics
distributed configuration sources
```

Tenant-aware runtime behavior should not be described as automatic tenant isolation.

Actual isolation depends on:

```text
authentication
authorization
storage topology
query policy
database configuration
infrastructure design
```

The runtime provides the execution path through which those policies can be applied consistently.

## Near-term roadmap

The next stage of Ambiten focuses on making runtime behavior easier to observe and govern.

Areas of direction include:

```text
richer instrumentation
runtime events
execution diagnostics
policy integration
tenant infrastructure visibility
resource usage signals
failure context
operational metadata
```

The goal is not to add disconnected subsystems.

The goal is to make the existing execution model more visible and easier to reason about under production workloads.

## Runtime intelligence

Operational intelligence should emerge from execution data rather than from unrelated instrumentation scattered throughout the application.

The runtime already has access to useful execution metadata:

```text
tenant identity
request identity
operation metadata
query timing
runtime budget
provider state
transaction state
error context
```

Over time, this can support deeper operational analysis.

Examples may include:

```text
execution diagnostics
runtime health signals
query behavior analysis
tenant resource insight
policy decision context
capacity signals
```

These capabilities should remain grounded in observable runtime state rather than opaque automation.

## Policy-aware execution

Another direction is deeper policy integration.

Some policies naturally belong near the persistence boundary:

```text
soft-delete behavior
query shaping
lifecycle rules
mutation normalization
runtime budgets
```

Other policies belong at the application boundary:

```text
authentication
authorization
billing
approval
business eligibility
```

Ambiten's direction is not to move every policy into the runtime.

It is to make the boundary between runtime policy and application policy clearer.

Future policy capabilities should preserve that separation.

## Events and runtime signals

Execution events can provide another way to understand what the runtime is doing.

A future event model may expose signals around areas such as:

```text
operation start
operation completion
operation failure
tenant resolution
transaction lifecycle
provider resolution
runtime budgets
resource usage
```

The purpose of events is not to turn Ambiten into a message broker.

They provide structured runtime signals that other operational systems can consume.

## Audit-oriented evidence

Some applications need stronger evidence around execution history.

Future Ambiten capabilities may help expose structured runtime events or metadata that can contribute to:

```text
audit workflows
operational review
change investigation
incident analysis
compliance evidence pipelines
```

Ambiten should not claim to provide complete regulatory compliance by itself.

Compliance depends on the larger system:

```text
identity
authorization
data retention
storage
access control
logging
policy
organizational process
```

The runtime can provide useful execution evidence within that broader architecture.

## Observability direction

Ambiten's goal is to make execution metadata available where instrumentation needs it.

That includes information such as:

```text
tenantId
requestId
operation
collection
duration
errors
runtime metadata
query observer state
budget usage
```

Ambiten can provide the execution context.

Observability systems remain responsible for:

```text
export
transport
buffering
storage
retention
visualization
alerting
cross-service correlation
```

The roadmap may improve integration points and runtime signals, but Ambiten should not be described as automatically providing distributed tracing or guaranteed telemetry delivery.

## Broader runtime coordination

Longer-term, Ambiten may extend beyond a single-process MongoDB runtime into broader coordination around execution infrastructure.

Possible areas include:

```text
distributed tenant configuration
runtime policy distribution
execution metadata propagation
tenant infrastructure discovery
operational control surfaces
cross-runtime diagnostics
runtime health aggregation
```

This direction should remain compatible with the current execution model.

The goal is not to hide distributed-system boundaries.

It is to make those boundaries more explicit and easier to coordinate.

## Cross-process execution remains explicit

`AmbitenContext` is local to an execution.

It does not automatically cross:

```text
HTTP boundaries
message queues
worker processes
service boundaries
serverless invocations
```

When work moves between processes, the receiving execution should establish its own context from explicitly propagated information.

For example:

```text
Service A
      ↓
tenantId
requestId
correlation metadata
      ↓
Transport
      ↓
Service B
      ↓
AmbitenContext.run(...)
```

This explicit boundary is important even if future Ambiten capabilities make propagation easier.

## Design philosophy

Ambiten follows a small set of architectural principles.

### Execution state should have a defined owner

Execution-specific state should live in `AmbitenContext` rather than being scattered through application signatures.

### Model operations should receive explicit persistence state

`AmbitenModel` binds runtime state into Effective `ModelContext`.

### Infrastructure should be reusable

MongoDB clients, providers, models, and tenant infrastructure should normally live at process scope rather than request scope.

### Transaction ownership should remain clear

The transaction boundary owns commit and rollback.

Models participate.

### Tenant identity and tenant infrastructure should remain separate

Identifying a tenant is different from resolving its MongoDB resources.

### Observability should consume execution metadata

Instrumentation should be able to understand the execution that produced an operation without becoming embedded throughout business logic.

### Runtime guarantees should remain bounded

Ambiten should clearly state what it owns and what remains the responsibility of the application, MongoDB, deployment platform, or external infrastructure.

## What Ambiten does not aim to hide

A runtime platform should make boundaries clearer, not pretend they do not exist.

Ambiten does not remove the need to reason about:

```text
MongoDB topology
authentication
authorization
network boundaries
external side effects
capacity planning
distributed coordination
observability infrastructure
deployment operations
```

Instead, Ambiten aims to give MongoDB execution a consistent structure inside that larger system.

## Why this matters

As applications grow, the difficult questions are often not query syntax questions.

They are execution questions.

```text
Which tenant did this execution belong to?

Which database did this operation use?

Which session participated in this transaction?

Why did this middleware change the operation?

Where was time spent?

Which provider resolved the database?

What runtime metadata existed when this failed?
```

Ambiten is designed to make those questions easier to answer through explicit execution boundaries and structured runtime state.

That is the long-term direction of the platform.

## Roadmap principles

The roadmap should follow three rules.

```text
1. Strengthen foundations before adding abstraction.

2. Add capabilities that reinforce the runtime model.

3. Do not hide system boundaries behind promises the runtime cannot own.
```

This means new features should fit naturally into:

```text
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

rather than creating parallel execution systems.

## Direction, not a compatibility promise

The roadmap describes Ambiten's architectural direction.

Individual features, APIs, package boundaries, and delivery order may evolve as the platform matures.

Applications should rely on documented, released behavior rather than treating future roadmap items as already available runtime guarantees.

The mission remains stable even as implementation details evolve:

```text
Make execution around MongoDB
clearer, more structured,
and easier to reason about.
```

## Summary

Ambiten is building a runtime where MongoDB access participates in a broader execution architecture.

The current foundation focuses on:

```text
context
model binding
tenant-aware infrastructure
transactions
middleware
providers
instrumentation
runtime lifecycle
```

The roadmap extends that foundation toward:

```text
richer runtime visibility
policy integration
execution events
tenant infrastructure intelligence
audit-oriented evidence
broader runtime coordination
```

The goal is not to make execution magically automatic.

The goal is to make runtime responsibilities explicit, composable, observable, and easier to reason about as systems grow.

Ambiten's direction can be summarized as:

```text
Now
→ strengthen execution foundations

Next
→ improve runtime visibility and policy

Later
→ expand runtime coordination
```

The foundation remains the same:

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

### Related pages

- [Why Ambiten](/why-ambiten)
- [Architecture](/architecture/whitepaper)
- [Execution Guarantees](/architecture/execution-guarantees)