# Director Observability Dashboard

Director is the planned operational intelligence layer for Ambiten runtime systems.

It is designed to consume structured execution telemetry and turn runtime signals into views that help teams understand tenant behavior, query activity, transaction outcomes, execution cost, and operational patterns.

<DirectorDashboardPreview />

> Director is shown here as a product preview. The dashboard represents the direction of Ambiten's operational tooling and the kinds of signals that can be derived from runtime context, instrumentation, query metadata, transaction events, and tenant-aware execution. Individual metrics, APIs, exporters, and dashboard features may evolve before release.

## Why Director exists

Production systems often generate large amounts of telemetry while still making application execution difficult to understand.

Infrastructure dashboards can answer questions such as:

```text
Is MongoDB available?

How much CPU is the service using?

How many requests are reaching the application?

How much memory is the process consuming?
```

Those signals are important.

But an execution-aware runtime creates a different set of questions:

```text
Which tenant produced this workload?

Which operations were part of this execution?

Where was execution time spent?

Which transaction aborted?

How many queries were executed?

Which execution exceeded an expected budget?

Which operations ran without tenant identity?
```

Director is intended to make those execution-level questions easier to investigate.

It complements infrastructure monitoring rather than replacing it.

## Runtime telemetry model

<DocOverviewCards
  eyebrow="Operational Intelligence"
  title="Director turns runtime signals into execution-level visibility."
  description="The dashboard is designed to organize telemetry around tenant identity, execution scope, model operations, transaction outcomes, runtime cost, and operational behavior."
  accent="#d38a49"
  :signals='[
    "Tenant latency",
    "Transaction outcomes",
    "Unscoped execution",
    "Runtime cost",
    "Execution budget"
  ]'
  :cards='[
    {
      "label": "Tenant Activity",
      "title": "Understand workload by tenant",
      "text": "Execution metadata can be grouped by tenant to help teams compare latency, query activity, and resource pressure across tenant workloads."
    },
    {
      "label": "Scope Visibility",
      "title": "Surface operations without expected tenant identity",
      "text": "Operations that execute without tenant identity can be classified separately so teams can determine whether they are intentional system work or unexpected runtime behavior."
    },
    {
      "label": "Transaction Diagnostics",
      "title": "Inspect transaction outcomes",
      "text": "Transaction lifecycle signals can help teams identify abort patterns, repeated failures, and workflows that deserve closer operational investigation."
    }
  ]'
  :flow='[
    {
      "label": "Capture",
      "title": "Execution signals"
    },
    {
      "label": "Correlate",
      "title": "Tenant and execution scope"
    },
    {
      "label": "Analyze",
      "title": "Runtime behavior"
    },
    {
      "label": "Act",
      "title": "Investigate or tune"
    }
  ]'
/>

Director is designed around structured telemetry produced by Ambiten instrumentation and runtime integrations.

Ambiten execution state can already contain information such as:

```text
tenantId
requestId
dbName
collectionName
loggerMeta
meta
observer
budget
session
```

Model and instrumentation layers can also expose operation-specific information such as:

```text
operation
duration
collection
query outcome
error state
application metadata
```

Director's role is to correlate those signals into operational views.

It should not be assumed that every field shown in the product preview is emitted automatically by Ambiten Core without corresponding instrumentation.

## Example telemetry

A Director-compatible telemetry event could look like:

```json
{
  "operation": "find",
  "status": "success",
  "tenantId": "enterprise-customer-a",
  "requestId": "req-9921-xyz",
  "durationMs": 45.2,
  "collectionName": "orders",
  "queriesExecuted": 3,
  "timestamp": "2026-05-02T10:00:00Z"
}
```

Additional instrumentation could attach information such as:

```json
{
  "budget": {
    "maxQueries": 10,
    "queriesExecuted": 3,
    "totalTimeMs": 112.5
  }
}
```

Transaction lifecycle telemetry could separately describe an outcome such as:

```json
{
  "transaction": {
    "status": "committed"
  }
}
```

The exact event schema remains part of Director's evolving product design.

## Execution-level visibility

Director is intended to focus on execution behavior rather than only infrastructure state.

Possible signals include:

```text
operation latency
query count
tenant identity
execution identity
collection activity
transaction outcome
runtime budget usage
middleware timing
provider resolution
error context
```

This provides a different perspective from host-level or database-level monitoring.

The two layers complement each other.

```text
Infrastructure Monitoring
→ what the platform is doing

Director
→ how Ambiten executions are behaving
```

## Tenant activity

Tenant-aware runtime metadata creates the possibility of analyzing workload by tenant.

Conceptually:

```text
Execution Telemetry
      ↓
tenantId
      ↓
Aggregate Runtime Signals
      ↓
Tenant Activity View
```

A Director tenant view could help teams compare:

```text
operation volume
latency
query count
transaction outcomes
budget consumption
failure patterns
```

This can help identify unusual or disproportionately expensive workloads.

It should not be interpreted as a billing system or exact cost-allocation engine unless the application provides the accounting inputs required for those calculations.

## Tenant heatmaps

A tenant heatmap could combine multiple execution-level measurements rather than relying only on MongoDB query duration.

For example:

```text
request duration
query duration
query count
middleware time
transaction retries
cache behavior
application metadata
```

This can help distinguish a slow MongoDB query from a slow execution caused by other application behavior.

The exact scoring model remains a Director-level concern.

Ambiten Core provides execution signals; Director can derive higher-level operational interpretations from them.

## Unscoped execution visibility

An operation without tenant identity is not automatically a defect.

Some workflows may intentionally execute outside tenant scope.

Examples include:

```text
system maintenance
administrative jobs
global configuration
shared infrastructure tasks
migration workflows
```

The important operational question is whether the missing tenant identity was intentional.

Director can classify these executions explicitly.

| State | Meaning |
|---|---|
| Tenant scoped | Execution contains tenant identity |
| System scoped | Execution intentionally operates without tenant identity |
| Unclassified | Execution has no tenant identity and no known system classification |

This is more precise than treating every missing `tenantId` as a tenant leak.

Director can make unscoped execution visible so teams can investigate it.

It does not prove tenant isolation by itself.

## Tenant isolation remains an architectural responsibility

Director can observe runtime identity.

It does not enforce the application's complete tenant security model.

Actual isolation can depend on:

```text
authentication
authorization
tenant resolution
database topology
collection design
query filtering
infrastructure configuration
```

For example:

```text
Database-per-tenant
```

and:

```text
Shared collection + tenant filter
```

are different isolation architectures.

Director can make runtime behavior around those architectures visible, but visibility is not the same thing as enforcement.

## Transaction diagnostics

Transaction telemetry can provide useful operational insight.

Possible signals include:

```text
transaction started
transaction committed
transaction aborted
duration
retry count
failure context
participating operations
```

The transaction execution model remains:

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

Director can use transaction lifecycle events to help teams investigate repeated aborts or unusual execution patterns.

Repeated transaction failures may have many causes:

```text
write conflicts
application errors
middleware failures
MongoDB errors
retry behavior
workflow design
infrastructure conditions
```

Director should surface evidence around those failures rather than claim to determine their cause automatically.

## Runtime budget visibility

Ambiten context can carry runtime budget information.

For example:

```ts
interface AmbitenQuotaBudget {
  maxQueries: number;
  queriesExecuted: number;
  totalTimeMs: number;
}
```

This provides a foundation for Director views around execution budgets.

Conceptually:

```text
Execution
      ↓
Budget State
      ↓
Queries Executed
      ↓
Runtime Cost Signals
      ↓
Director
```

Possible views may include:

```text
query-budget usage
execution time
high-query executions
tenant-level budget patterns
budget threshold events
```

Budget telemetry is an operational signal.

It should not automatically be interpreted as financial cost unless a separate cost model is provided.

## Middleware visibility

Middleware participates in the model execution path:

```text
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Persistence Operation
```

Where timing or event instrumentation exists, Director could make middleware behavior visible.

Examples may include:

```text
middleware duration
middleware failures
operation transformation
policy invocation
hook frequency
```

This can help teams understand whether runtime behavior is being influenced by persistence middleware rather than by MongoDB alone.

## Instrumentation relationship

Director does not replace Ambiten instrumentation.

The relationship is:

```text
Ambiten Runtime
      ↓
Instrumentation
      ↓
Structured Execution Signals
      ↓
Exporter / Transport
      ↓
Director
```

Ambiten instrumentation is responsible for making execution signals available.

Director is responsible for interpreting and presenting those signals.

The transport between them should remain replaceable.

## Product positioning

Director represents a higher-level operational product built on top of the Ambiten runtime.

The Core runtime remains focused on primitives such as:

```text
AmbitenContext
AmbitenModel
ModelContext
AmbitenSchema
AmbitenClient
MultiTenantManager
transactions
middleware
providers
instrumentation
```

Director builds on those primitives to provide:

```text
runtime analytics
tenant workload visibility
transaction diagnostics
execution-budget analysis
operational investigation
runtime trend analysis
```

This separation allows Ambiten Core to remain usable without requiring Director.

## Runtime first, Director second

Director depends on runtime signals.

The runtime does not depend on Director.

```text
Ambiten Core
      ↓
Execution Metadata
      ↓
Instrumentation
      ↓
Optional Director Integration
```

An application can use Ambiten with:

```text
OpenTelemetry
structured logs
custom metrics
an internal analytics system
another APM product
```

without deploying Director.

Director is intended to provide Ambiten-specific operational interpretation on top of those runtime concepts.

## Relationship with future operational products

Director may also become the visual surface for future Ambiten operational capabilities.

Potential areas include:

```text
runtime analytics
tenant workload insight
execution budgets
operational alerts
policy events
audit-oriented evidence
runtime health signals
```

These areas should be understood as product direction rather than already available guarantees.

Any future packaging or bundle structure may evolve independently from the runtime APIs.

## Deployment architecture

Director is intended to remain separate from application execution.

A conceptual architecture is:

```text
Ambiten Runtime
      ↓
Instrumentation
      ↓
Telemetry Exporter
      ↓
Director Ingestion
      ↓
Operational Data Store
      ↓
Director Dashboard
```

This keeps observability processing outside the request or model execution path.

The runtime should not require a Director dashboard to complete ordinary MongoDB operations.

## Exporter model

A future exporter contract should allow execution telemetry to leave the runtime without coupling Ambiten Core to one storage or dashboard implementation.

Conceptually:

```text
Runtime Event
      ↓
Exporter Interface
      ├─ Director
      ├─ OpenTelemetry
      ├─ Structured Logs
      └─ Custom Backend
```

The exact exporter API remains part of the evolving instrumentation design.

Director should not require applications to abandon existing observability systems.

## Hosted and self-managed direction

Director may support different deployment models as the product develops.

Possible forms include:

```text
hosted service
self-managed deployment
private infrastructure integration
```

The final supported deployment options will depend on the product implementation and release model.

The important architectural goal is to keep telemetry production separate from telemetry storage and visualization.

## What Director does not replace

Director is not intended to replace:

```text
MongoDB monitoring
host metrics
Kubernetes monitoring
network observability
application logging
distributed tracing
security monitoring
authorization systems
```

Those systems answer different questions.

Director focuses on Ambiten-specific execution behavior.

## What Director represents

Director is intended to become an execution-intelligence surface for Ambiten applications.

Its purpose is to help answer questions such as:

```text
Which tenant generated this workload?

Which operations consumed the most execution time?

Which executions exceeded their query budget?

Which transactions aborted repeatedly?

Which operations ran without an expected tenant scope?

Which collections dominate runtime activity?

Where are execution failures concentrated?
```

These are execution questions rather than generic infrastructure questions.

That distinction defines Director's role.

## Boundaries of interpretation

Director can surface evidence.

It should not claim more certainty than the telemetry supports.

For example:

```text
High latency
≠ automatically a MongoDB problem

Missing tenantId
≠ automatically a security breach

Transaction abort
≠ automatically a runtime defect

High query count
≠ automatically inefficient behavior
```

Operational intelligence should help teams investigate.

It should not hide system complexity behind unsupported conclusions.

## Direction, not released behavior

Director is currently presented as a product direction.

The dashboard preview illustrates the type of operational experience Ambiten is being designed to support.

Individual capabilities such as:

```text
transaction scoring
tenant heatmaps
runtime alerts
budget enforcement
hosted deployment
audit evidence
policy dashboards
```

should not be treated as released APIs or compatibility guarantees until they are documented as available product features.

## Summary

Director is the planned operational intelligence layer built around Ambiten execution telemetry.

Its purpose is to transform structured runtime signals into views around:

```text
tenant activity
execution scope
query behavior
transaction outcomes
runtime budgets
failure patterns
operational trends
```

Ambiten Core provides the execution model and runtime metadata.

Instrumentation exposes signals from that execution.

Director is designed to correlate and present those signals in a form teams can investigate and act on.

The architectural relationship is:

```text
Execution
      ↓
Context
      ↓
Instrumentation
      ↓
Telemetry
      ↓
Director
      ↓
Operational Insight
```

Director does not make runtime correctness, tenant isolation, or transaction integrity automatic.

It makes the available evidence around those concerns easier to see.

## Related pages

- [Instrumentation & Observability](/core/instrumentation)
- [Events](/features/events)
- [Transactions](/core/transactions)
- [Context](/core/context)
- [Multi-Tenancy](/architecture/multi-tenancy)