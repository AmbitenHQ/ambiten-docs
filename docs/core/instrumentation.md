# Instrumentation & Observability

Instrumentation is a foundational capability of the Tenra runtime.

It provides the operational visibility required to manage high-concurrency, multi-tenant systems where execution correctness depends not only on database performance, but on the behavior of the runtime itself.

Unlike traditional query logging, Tenra instrumentation is context-aware. It captures the full execution lifecycle surrounding a model operation, including middleware overhead, infrastructure resolution, transaction participation, and persistence behavior.

This page explains how Tenra measures execution behavior. If you are looking for how these runtime signals become operational insight, see [Director Observability Dashboard](/operations/director).

<InstrumentationOverview />

## The wall-clock strategy

Tenra instruments at the model boundary rather than the MongoDB driver layer.

This distinction is intentional.

Instead of measuring only database execution time, Tenra measures the entire runtime cost of an operation, including middleware execution, cache resolution, tenant routing, transaction binding, persistence, post-processing, and schema lifecycle hooks.

The result is a wall-clock view of the true operational cost of execution.

## Why runtime-level instrumentation matters

In distributed enterprise systems, latency rarely originates from a single source.

A slow operation may be caused by validation layers, RBAC enforcement, cache negotiation, transaction coordination, tenant routing, or middleware chains rather than the database itself.

Without runtime-aware instrumentation, these costs remain fragmented and difficult to diagnose.

Tenra makes the full execution path observable.

## Anatomy of an instrumented operation

Every model operation executes inside a measured runtime boundary.

The `find()` flow below illustrates the structure conceptually:

```ts
async find(filter, ctx, options) {
  return this.runWithModelContext(ctx, async () =>
    measureQuery(
      {
        operation: 'find',
        collectionName: this.resolveCollectionName(ctx),
        filter
      },
      async () => {
        // --- START OF MEASURED BLOCK ---

        // 1. Infrastructure resolution
        // 2. Middleware execution
        // 3. Cache negotiation
        // 4. MongoDB persistence
        // 5. Post-processing hooks

        // --- END OF MEASURED BLOCK ---
      }
    )
  );
}
```

Because the entire execution lifecycle is measured, the reported durationMs reflects the real runtime overhead of the operation rather than only the database latency.

### Runtime-aware telemetry

Instrumentation executes inside TenraContext, allowing telemetry payloads to inherit runtime identity automatically.

Operational metadata such as `tenantId`, `requestId`, `dbName`, `collectionName`, transaction state, and execution context are attached without manual propagation.

This makes telemetry inherently correlated with the execution boundary that produced it.

### Resource budgeting and execution guardrails

Tenra also tracks runtime resource consumption at the request level.

The instrumentation layer monitors query counts, cumulative execution time, and runtime budget consumption across the execution lifecycle.

This is particularly important in shared multi-tenant environments where runaway request chains, excessive middleware execution, or N+1 query patterns can degrade infrastructure stability.

By measuring execution holistically, Tenra can surface operational pressure before it becomes infrastructure failure.

### Non-blocking telemetry

Telemetry emission is asynchronous by design.

```ts
setImmediate(() => {
  observer?.onQuery?.(payload);
  logger?.info?.("[Tenra Query]", payload);
});
```

Instrumentation therefore remains outside the critical execution path and does not block request completion or event-loop progress.

This makes integration with external observability systems such as OpenTelemetry, Datadog, ELK, or custom telemetry pipelines operationally safe under load.

## Observability model

Tenra separates runtime signals into several operational categories.

| Signal Type   | Focus                               | Operational Use                            |
| ------------- | ----------------------------------- | ------------------------------------------ |
| Operational   | `durationMs`, `status`, `operation` | Performance tuning and SLA monitoring      |
| Architectural | Middleware and cache behavior       | Identifying runtime overhead sources       |
| Transactional | Session and budget tracking         | Transaction integrity and resource control |
| Diagnostic    | Filters, pipelines, and errors      | Incident analysis and faster recovery      |

Together, these signals provide visibility into both application behavior and runtime execution health.

### Structured telemetry output

Telemetry payloads are emitted as structured JSON suitable for direct ingestion into observability platforms.

```JSON
{
  "operation": "find",
  "status": "success",
  "tenantId": "enterprise-customer-a",
  "requestId": "req-9921-xyz",
  "durationMs": 45.2,
  "collectionName": "orders",
  "queriesExecuted": 3,
  "totalBudgetUsed": 112.5,
  "filter": { "status": "pending" },
  "cacheHit": false,
  "timestamp": "2026-05-02T10:00:00Z"
}
```

Because telemetry is runtime-aware, every signal remains correlated to the originating execution boundary.

## Logging vs instrumentation

Logging and instrumentation intentionally solve different problems.

Instrumentation is structured, machine-readable, and execution-oriented. It exists to measure runtime behavior and operational health.

Logging remains human-oriented and application-specific.

```ts
const users = await measureQuery(
  {
    operation: "find",
    collectionName: "users",
    filter: { active: true }
  },
  () => UserModel.find({ active: true })
);

logger.info("Users loaded", {
  count: users.length
});
```

The instrumentation describes how the runtime behaved. The log describes what the application was doing.

## Design philosophy

Tenra treats observability as part of the execution architecture rather than as an external concern added after deployment.

Because instrumentation is integrated directly into the runtime boundary, operational visibility remains consistent across adapters, tenants, transactions, and execution environments.

This continuity allows teams to reason about runtime behavior with the same consistency they expect from application logic.

## Director dashboard

[Director](/operations/director) is the operational surface built on top of Tenra instrumentation.

It consumes runtime telemetry and transforms it into higher-level operational insight such as tenant heatmaps, leak detection for unscoped queries, rollback-rate analysis, and execution anomaly tracking.

## Summary

Instrumentation in Tenra transforms data access from a black-box persistence layer into an inspectable runtime system.

By combining structured telemetry with runtime-aware context propagation, Tenra provides visibility into what executed, where it executed, how it behaved, and why it incurred its operational cost.

Observability is therefore not an auxiliary feature of the runtime.

It is part of the runtime contract itself.

## See also

- [Director Observability Dashboard](/operations/director)
- [Events](/features/events)
- [Performance Tuning](/advanced/performance-tuning)
- [Context](/core/context)
- [Middleware Lifecycle](/core/middleware)
- [Multi-tenancy Strategies](/architecture/multi-tenancy)
