# Events

Events in Tenra expose the runtime as a stream of structured execution signals.

They are not designed as a lightweight pub/sub helper or a wrapper around emitters. Events exist to describe runtime behavior in a context-aware way, allowing systems to observe what happened, where it happened, and under which execution conditions it occurred.

Because events are emitted inside the runtime itself, they automatically inherit tenant scope, request metadata, transaction boundaries, and execution context.

<DocOverviewCards 
eyebrow="Runtime Signals"
title="Events describe what happened inside a known execution context." description="Tenra events are structured runtime records that carry tenant, request, database, collection, duration, and outcome metadata without pushing reporting logic into application code." accent="#E10098" :signals='["Model operations", "Middleware lifecycle", "Transaction flow", "Request scope", "Observer export"
]'
:cards='[
{ "label": "Context-first", "title": "Metadata travels with the event", "text": "Tenant identity, request scope, and database resolution are inherited from TenraContext automatically." }, { "label": "Structured", "title": "Payloads align with observability systems", "text": "Events correlate naturally with logs, metrics, traces, and audit pipelines instead of becoming loose runtime messages." }, { "label": "Non-blocking", "title": "Signals stay outside the execution path", "text": "Observers can react to runtime activity while the main operation remains focused on persistence and results." }
]'
:flow='[
{ "label": "Boundary", "title": "Operation occurs" },
{ "label": "Context", "title": "Runtime metadata enriches payload" },
{ "label": "Emit", "title": "Observers receive structured event" },
{ "label": "Export", "title": "Telemetry and audit systems consume it" }
]'
/>

## Runtime-aware signaling

Tenra applications execute through a consistent runtime path:

```text
Adapter → Context → Model → Middleware → Persistence → Result
```

Events exist across this entire lifecycle.

They allow runtime activity to become observable without forcing services, controllers, or resolvers to handle reporting concerns directly. Application logic remains focused on outcomes while the runtime exposes execution behavior in a consistent way.

## What an event represents

A Tenra event is a structured record of runtime activity.

Events can originate from model operations, middleware execution, transaction boundaries, or instrumentation hooks. Because these layers execute inside the same runtime context, every emitted signal remains aligned to the same execution scope.

This means an event is never simply:

```PlainText
Something happened
```

It is always:

```PlainText
Something happened within a known runtime boundary
```

That distinction becomes critical in distributed and multi-tenant systems where execution context matters as much as the operation itself.

## Event lifecycle

An event begins at a runtime boundary, inherits execution metadata, and is then emitted to observers or external systems.

Conceptually:

```text
Operation → Context Enrichment → Event Emission → Observer / Export
```

The important detail is that enrichment happens automatically. Developers do not need to manually attach tenant IDs, request IDs, or database names. The runtime already knows this information and includes it as part of the event payload.

## Event structure

Tenra events are intentionally structured and predictable so they can integrate cleanly with telemetry and audit systems.

A typical payload may resemble:

```JSON
{
  "operation": "create",
  "status": "success",
  "tenantId": "tenant-a",
  "requestId": "req-123",
  "collectionName": "users",
  "durationMs": 18.4,
  "dbName": "tenant_a_db",
  "timestamp": "2026-05-03T10:00:00Z"
}
```

The structure aligns closely with instrumentation data so logs, metrics, traces, and runtime events can correlate naturally instead of existing as disconnected systems.

## Relationship with instrumentation

Instrumentation and events operate together but serve different purposes.

Instrumentation measures runtime behavior. It captures duration, query budgets, execution cost, and operational characteristics.

Events describe runtime activity. They communicate what occurred and under which conditions it occurred.

In practice, instrumentation often produces the measurements that events carry forward into logging, analytics, or observability systems.

## Subscribing to runtime events

Observers allow applications to react to runtime activity without interfering with execution flow.

```ts
observer.onQuery((event) => {
  console.log("Query executed:", event);
});

observer.onQueryError((event) => {
  console.error("Query failed:", event);
});
```

This pattern allows systems to attach diagnostics, auditing, analytics, or telemetry export without embedding those concerns into model logic itself.

## Tenant and transaction awareness

Because events inherit execution context automatically, tenant identity and transaction scope remain consistent across the full operation lifecycle.

This is especially important in multi-tenant systems where understanding which tenant triggered an operation is often as important as the operation outcome itself.

When operations execute inside transactions, emitted events can also reflect shared transaction boundaries, making it easier to diagnose rollback behavior, partial failures, or long-running units of work.

## Operational use

Events become significantly more valuable when treated as operational signals rather than console output.

They can power:

- audit trails
- runtime analytics
- security monitoring
- compliance reporting
- distributed tracing
- tenant-aware diagnostics

Because events are already structured and context-aware, they integrate naturally into larger observability and governance systems.

## Runtime relationship

```PlainText
Adapter → Context → Event Emission → Observer → External Systems
```

Events are embedded directly into the runtime execution model rather than existing as a disconnected subsystem.

This allows runtime activity to remain observable regardless of whether execution originates from Express, Fastify, GraphQL, NestJS, Lambda, background jobs, or scheduled workflows.

## Mental model

```PlainText
Instrumentation measures execution.
Events describe execution.
Observers react to execution.
```

## Summary

Events turn Tenra into an observable runtime system rather than a passive persistence layer.

By emitting structured, context-aware signals at execution boundaries, Tenra allows teams to trace, audit, analyze, and react to runtime behavior without pushing observability concerns into business logic.

## Related pages

- [Instrumentation](/core/instrumentation)
- [Transactions](/core/transactions)
- [Multi-Tenancy](/architecture/multi-tenancy)
- [Performance Tuning](/advanced/performance-tuning)
