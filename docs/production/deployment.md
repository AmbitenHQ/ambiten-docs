# Deployment Guide

Deploying Tenra is not only about starting an application server. It is about operating a context-aware runtime safely under real production conditions.

A production-ready deployment depends on database topology, tenant isolation strategy, connection reuse, transaction boundaries, instrumentation, and explicit runtime scope management.

This page focuses on operating Tenra in production environments. For guarantees inside an execution boundary, see [Execution Guarantees](/architecture/execution-guarantees).

<DocOverviewCards 
eyebrow="Production Runtime"
title="Deploy Tenra as an execution runtime, not only a MongoDB abstraction." description="Production deployment combines stable MongoDB topology, request-scoped execution, connection reuse, observability, tenant isolation, and controlled runtime boundaries."
accent="#16a37b"
:signals='["Replica set", "Tenant isolation", "Connection reuse", "Transactions", "Instrumentation", "Worker scope"
]'
:cards='[
{
"label": "Topology", "title": "Database architecture shapes runtime behavior", "text": "Replica sets enable transactions and resilient production execution, while sharding introduces tenant-scale distribution concerns." 
},
{ "label": "Execution", "title": "Runtime context remains request-scoped", "text": "Tenant identity, sessions, and request metadata live inside TenraContext instead of leaking into global application state."
},
{ "label": "Operations", "title": "Observability and resilience stay first-class", "text": "Structured instrumentation, tenant-aware logging, and explicit worker scope make runtime behavior diagnosable at scale." }
]'
:flow='[
{ "label": "Configure", "title": "Load environment and runtime config" },
{ "label": "Connect", "title": "Initialize reusable clients" },
{ "label": "Isolate", "title": "Apply tenancy boundaries" },
{ "label": "Observe", "title": "Export runtime telemetry" }
]'
/>

## Deployment model

A Tenra application is stateless at the application layer and stateful at the database layer.

```Plain text
Client → Application Runtime → Tenra → MongoDB
```

Each request creates its own execution boundary through `TenraContext`.

Request-specific state is never stored globally, which makes Tenra suitable for horizontally scaled services, containerized deployments, and serverless environments.

## Environment configuration

Production systems should prefer environment-driven configuration.

Typical variables include:

```text
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=app_db
NODE_ENV=production
```

Projects using generated configuration can also rely on:

```sh
tenra.config.json
```

Production configuration should ensure:

- secrets are never committed to version control
- environment overrides remain consistent across environments
- staging and production configurations stay predictable

## MongoDB topology

Database topology directly affects runtime behav

### Standalone

Suitable for development or small local environments, but generally not recommended for production systems where availability matters.

### Replica set

Replica sets are the recommended production baseline.

They provide failover capability, transaction support, and operational reliability.

Tenra transaction support depends on replica set capability.

### Sharded cluster

Sharded deployments support large-scale workloads and tenant distribution strategies.

When using sharding, shard keys should align with query behavior and tenant boundaries rather than being chosen arbitrarily.

### Multi-tenancy deployment strategies

Tenant isolation strategy should match the scale and sensitivity of the system.

#### Database-per-tenant

```Plain text
tenantA → db_tenantA
tenantB → db_tenantB
```

This is usually the recommended production model because it provides strong isolation, cleaner backup boundaries, and lower risk of cross-tenant leakage.

#### Collection-per-tenant

```ts
users_tenantA
users_tenantB
```

Suitable for smaller systems or transitional architectures, though operational complexity grows with tenant count.

### Shared database

```JSON
{ "tenantId": "tenantA" }
```

This model depends heavily on strict filtering discipline and should be chosen intentionally rather than by default.

## Application scaling

Tenra applications are designed for horizontal scaling.

```sh
Load Balancer → App Instance A
              → App Instance B
              → App Instance C
```

Because request identity and runtime state remain scoped to TenraContext, instances can scale independently without sharing in-memory request state.

The important operational concern is connection reuse rather than request coordination.

## Connection management

TenraClient uses pooled MongoDB connections by default.

In production environments:

- initialize clients once
- reuse connections across requests
- avoid creating clients per request
- monitor pool pressure and latency

For multi-tenant systems, tenant-scoped clients should also be reused carefully so connection growth does not scale linearly with tenant count.

## Transactions in production

Transactions should remain focused and deliberate.

They work best when multiple writes must succeed or fail together.

```ts
await TenraContext.withTransaction(async () => {
  await OrderModel.create(order);
  await PaymentModel.create(payment);
});
```

Long-running operations and external API calls should generally stay outside transaction boundaries.

Shorter transactions reduce coordination cost and improve runtime predictability.

## Observability setup

Production systems require visibility into runtime behavior.

Tenra exposes structured instrumentation and runtime-aware event signals that integrate naturally with observability systems such as OpenTelemetry, ELK, or Datadog.

A production observability setup should ensure:

- logs include tenant and request identifiers
- instrumentation remains enabled in production
- latency spikes and failure patterns are measurable
- telemetry can be correlated across runtime boundaries

## Runtime modes

Development and production environments should behave differently.

Development mode usually prioritizes visibility and debugging.

Production mode should prioritize structured telemetry, predictable error handling, and optimized runtime behavior.

Debug-heavy output should not remain enabled in production systems.

## Background jobs and workers

Background processes do not inherit request context automatically.

Instead, execution scope should be created explicitly.

```ts
await TenraContext.run(
  { tenantId: "tenant-a" },
  async () => {
    await JobModel.process();
  }
);
```

Or through scoped providers:

```ts
const tenantProvider = client.withTenant("tenant-a");
```

This keeps runtime behavior predictable outside HTTP request lifecycles.

## Deployment environments

Tenra supports multiple deployment models without changing the runtime contract.

### Containerized environments

Docker and Kubernetes are recommended for most production systems because they provide predictable environments, horizontal scaling, and operational isolation.

### Serverless environments

AWS Lambda and similar platforms are supported through adapters.

These environments require attention to:

- cold start latency
- connection reuse strategy
- short-lived execution boundaries

### Traditional servers

Traditional server deployments remain fully supported, provided that connection reuse, process supervision, and observability are configured properly.

## Failure handling

Production systems should assume failures will happen.

Database errors, transaction failures, tenant-specific issues, and network interruptions should remain observable and diagnosable.

Avoid silent retries or unstructured error handling that hides execution context.

Structured instrumentation should make failure origin visible.

## Production checklist

Use this checklist before deploying a Tenra application:

```text
Is MongoDB running as a replica set or better?
Is TenraClient initialized once and reused?
Is tenant isolation strategy clearly defined?
Is instrumentation enabled in production?
Are transactions kept short and intentional?
Are connection pools monitored?
Is debug mode disabled?
Do background jobs create explicit runtime scope?
```

## Summary

Deploying Tenra successfully means treating it as a runtime system rather than only a database abstraction layer.

When database topology, tenant isolation, connection reuse, transactions, and observability are aligned properly, Tenra remains predictable, scalable, and diagnosable under real production conditions.

## Related pages

- [Execution Guarantees](/architecture/execution-guarantees)
- [Performance Tuning](/advanced/performance-tuning)
- [Multi-Tenancy](/architecture/multi-tenancy)
- [TenraClient](/api/tenra-client)
- [Instrumentation](/core/instrumentation)
