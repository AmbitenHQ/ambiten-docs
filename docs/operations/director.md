# Director Observability Dashboard

Director is Tenra’s operational control plane for tenant-aware runtime systems.

It consumes the structured telemetry emitted by instrumentation, transactions, middleware, and runtime context, then transforms that execution data into operational insight teams can act on.

<DirectorDashboardPreview />

> The current dashboard preview represents an early operational concept built on top of Tenra’s runtime telemetry model.

## Why Director exists

Most production systems eventually become data-rich but insight-poor.

Teams may already have logs, metrics, traces, and infrastructure dashboards, yet still struggle to understand runtime behavior inside multi-tenant execution systems. Questions about tenant cost, transaction instability, request scope, and runtime overhead are often difficult to answer because traditional monitoring tools operate at the infrastructure layer rather than the execution layer.

Director exists to bridge that gap.

Instead of treating observability as a disconnected monitoring concern, Director treats runtime behavior itself as a structured operational signal. It exposes how execution behaves inside Tenra rather than only how servers or databases behave underneath it.

## Runtime telemetry model

<DocOverviewCards
  eyebrow="Operational Intelligence"
  title="Director transforms runtime telemetry into actionable system visibility."
  description="The dashboard groups execution signals by tenant, request scope, collection, transaction state, runtime cost, and operational outcome."
  accent="#d38a49"
  :signals='["Tenant latency", "Rollback rate", "Leak detection", "Runtime overhead", "Request budget"]'
  :cards='[
    {
      "label": "Tenant Heatmap",
      "title": "Identify operationally expensive tenants",
      "text": "Director groups runtime latency and request cost by tenant so teams can isolate noisy workloads and infrastructure pressure early."
    },
    {
      "label": "Leak Detection",
      "title": "Expose unscoped runtime activity",
      "text": "Operations without tenant identity are surfaced separately so runtime hygiene issues never become invisible."
    },
    {
      "label": "Transaction Integrity",
      "title": "Track rollback patterns across workflows",
      "text": "Rollback visibility helps teams identify unstable transaction boundaries, repeated conflicts, and failing execution paths."
    }
  ]'
  :flow='[
    { "label": "Emit", "title": "Runtime telemetry" },
    { "label": "Group", "title": "Tenant and request scope" },
    { "label": "Score", "title": "Latency and integrity" },
    { "label": "Act", "title": "Alert, tune, or enforce" }
  ]'
/>

Director is built around the telemetry Tenra already emits internally. Runtime activity becomes measurable because execution boundaries already understand tenant identity, request scope, transaction state, and middleware participation.

Example payload:

```json
{
  "operation": "find",
  "status": "success",
  "tenantId": "enterprise-customer-a",
  "requestId": "req-9921-xyz",
  "durationMs": 45.2,
  "collectionName": "orders",
  "queriesExecuted": 3,
  "totalBudgetUsed": 112.5,
  "cacheHit": false,
  "transaction": {
    "active": true,
    "status": "committed"
  },
  "timestamp": "2026-05-02T10:00:00Z"
}
```

Rather than limiting visibility to infrastructure metrics, Director focuses on execution-level signals such as runtime cost, transaction continuity, request integrity, middleware overhead, and tenant isolation behavior.

## Tenant heatmap

Director ranks operational cost using runtime-aware latency instead of database duration alone.

That distinction matters because expensive execution paths may originate from middleware behavior, cache misses, transaction retries, tenant routing overhead, or request amplification rather than MongoDB query time itself.

The heatmap is intended to expose which tenants generate the highest operational pressure so teams can identify unstable workloads before they become production incidents. Runtime visibility becomes tied to actual execution behavior instead of isolated infrastructure metrics.

## Leak detection

A query without tenant identity is operationally dangerous inside a tenant-aware system.

Some unscoped operations may be legitimate system-level workflows, but they should never become invisible. Director surfaces those operations explicitly so teams can continuously verify runtime hygiene and execution safety.

| State | Meaning |
| --- | --- |
| Missing tenant | No tenant identity was attached to execution context |
| System scope | Operation intentionally runs outside tenant boundaries |
| Unknown scope | Runtime could not resolve execution ownership |

This allows tenant isolation to become observable and measurable instead of depending entirely on engineering discipline.

## Transaction integrity

Rollback rate is one of the clearest early indicators of runtime instability.

Repeated rollbacks may signal transaction conflicts, invalid workflow ordering, failing middleware behavior, or unsafe retry patterns. Director correlates those failures across tenants, request flows, collections, and execution boundaries so operational problems can be traced back to the runtime paths responsible for them.

The purpose is not only to record failure, but to expose unstable execution behavior before it evolves into broader operational incidents.

## Product positioning

Director represents the operational intelligence layer built on top of Tenra’s runtime foundation.

The core runtime remains focused on execution primitives such as context propagation, models, adapters, middleware, transactions, and instrumentation. Director extends that foundation into operational visibility, runtime analytics, request budgeting, and execution governance.

This separation allows the runtime to remain broadly accessible while operational tooling evolves into higher-level platform capabilities for scaling teams.

## Relationship with future bundles

Director naturally aligns with future operational and governance-focused bundles.

The Insights Bundle focuses on runtime analytics, tenant cost visibility, quotas, and operational alerts. The Safety Bundle focuses on audit trails, evidence collection, policy enforcement, and compliance reporting.

Together, these systems move Tenra beyond traditional ODM tooling and toward runtime governance and operational intelligence.

## Deployment architecture

Director is designed to support both hosted and self-hosted deployment models.

The runtime itself remains deployment-agnostic. It only needs to emit structured telemetry through a stable exporter contract.

```text
Tenra Runtime
      ↓
Telemetry Exporter
      ↓
Director Ingest API
      ↓
Metrics Store
      ↓
Operational Dashboard
```

This separation allows the observability pipeline to evolve independently from the runtime while keeping instrumentation behavior stable across environments.

## What Director represents

Director is not intended to become a generic metrics dashboard.

It is designed as an execution intelligence layer for tenant-aware runtime systems.

The focus is on exposing runtime correctness, execution integrity, tenant operational behavior, transaction stability, and request-level cost visibility through the same execution model Tenra already understands internally.

That distinction is what separates Director from traditional infrastructure monitoring systems.

## Summary

Director transforms Tenra’s runtime telemetry into operational visibility teams can reason about.

By combining tenant-aware execution data, transaction integrity, request scope, and structured instrumentation, Director allows teams to understand how applications behave under real production conditions rather than only how infrastructure behaves underneath them.

The result is a clearer operational model where runtime behavior becomes measurable, traceable, and actionable as systems grow in scale and complexity.

## Related pages

- [Instrumentation & Observability](/core/instrumentation)
- [Events](/features/events)
- [Transactions](/core/transactions)
- [Context](/core/context)
- [Multi-Tenancy](/architecture/multi-tenancy)