# Concepts

Ambiten Logger is built around the idea that logs should preserve runtime meaning rather than merely record output messages.

Instead of treating logs as isolated console text, the logger models every emitted log as structured execution data flowing through a runtime pipeline. This distinction becomes increasingly important in systems where execution crosses middleware layers, asynchronous workflows, adapters, queues, transactional boundaries, GraphQL resolvers, workers, and distributed infrastructure.

In those environments, plain console output quickly loses operational continuity.

Ambiten Logger solves this by organizing runtime behavior around a small set of architectural concepts.

## Structured runtime entries

Every log emitted by the runtime becomes a normalized runtime entry internally.

Even when logs appear as formatted console output during development, the underlying runtime representation remains structured.

A typical runtime entry resembles the following:

```JSON
{
  "timestamp": "2026-05-14T12:41:21.441Z",
  "level": "info",
  "message": "Order processed",
  "source": "OrderService",
  "context": {
    "requestId": "req_82A1",
    "tenantId": "tenant-eu"
  },
  "meta": {
    "orderId": "ord_1002"
  }
}
```

Because the logger always operates on structured runtime objects internally, transports can serialize, compress, batch, retry, buffer, or stream runtime events without reconstructing metadata from formatted text output.

Conceptually:

```text
Application Event → Structured Runtime Entry → Transport Pipeline
```

The runtime event remains stable regardless of how delivery infrastructure evolves.

## Runtime context propagation

The logger can automatically inherit execution state from the active Ambiten runtime context.

When execution enters the runtime boundary, contextual information such as request identifiers, tenants, database targets, collection names, and execution metadata become available through `AmbitenContext`.

Any log created during that execution flow can then inherit that state automatically.

```ts
logger.info('Fetching user profile');
```

The application does not need to manually attach request identifiers or tenant metadata to every logging call. The runtime resolves that operational state automatically whenever a context exists.

This preserves execution continuity across middleware, repositories, services, adapters, transactions, asynchronous workflows, and distributed runtime boundaries.

Conceptually:

```text
Execution Context → Logger → Contextual Runtime Event
```

The logger remains operationally independent while still becoming runtime-aware when execution context exists.

## Transports

A transport determines where runtime events are delivered after they pass through the logging pipeline.

Ambiten Logger intentionally separates runtime event generation from transport execution so applications can evolve observability infrastructure without rewriting logging behavior.

A single logger may simultaneously write to:

```text
console streams
rotating files
async batch pipelines
Elasticsearch
Loki
remote HTTP endpoints
```

Because transports share the same runtime contract, they remain composable and interchangeable.

```ts
const logger = createLogger({
  transports: [
    consoleTransport(),
    createRotatingFileTransporter()
  ]
});
```

Applications focus on generating runtime events. Transport infrastructure handles delivery independently downstream.

## Buffering and batching

Writing every runtime event synchronously can create unnecessary execution pressure under sustained throughput.

To reduce this overhead, the logger supports buffering and asynchronous batching.

Buffered transports temporarily accumulate runtime entries before flushing them to downstream infrastructure. Batch transports group multiple runtime events into a single delivery operation.

Conceptually:

```text
Application Execution
        ↓
Buffered Runtime Events
        ↓
Async Delivery Pipeline
```

This allows application execution to continue while the logger independently manages filesystem writes, compression, batching, remote delivery, or network transmission downstream.

The runtime remains responsive even when observability infrastructure becomes slower under load.

## Resilience and fault isolation

Remote observability infrastructure is not always reliable.

Network instability, ingestion outages, filesystem pressure, or downstream transport failures should not destabilize application execution.

The logger therefore includes retry pipelines, buffering strategies, and circuit breaker protection that isolate transport failures from the primary execution path.

```ts
const resilient =
  createResilientTransporter(
    createHttpTransport(endpoint)
  );
```

When downstream infrastructure becomes unhealthy:

```text
Application execution continues
        ↓
Transport retries independently
        ↓
Circuit breaker isolates failures
```

This prevents observability infrastructure problems from cascading into broader runtime instability.

Retry strategies may use exponential backoff while unhealthy destinations can be temporarily short-circuited until recovery conditions are satisfied.

## Transport independence

Applications should not become tightly coupled to a single logging backend.

Ambiten Logger intentionally treats transports as replaceable operational infrastructure.

A system may begin with formatted console output during development, later adopt rotating files in production, and eventually stream runtime telemetry into centralized observability systems without changing application logging logic.

The logging pipeline remains stable while transport infrastructure evolves independently.

Conceptually:

```text
Application Logic → Stable Runtime Pipeline
Transport Layer   → Replaceable Infrastructure
```

This separation keeps operational evolution independent from business logic.

## Runtime lifecycle participation

The logger participates in the broader runtime lifecycle rather than behaving as a detached utility.

Buffered transports, asynchronous delivery systems, rotating file pipelines, and batch infrastructures may maintain internal timers, buffers, streams, or background resources that require controlled shutdown behavior.

The runtime therefore exposes lifecycle operations such as flushing, stopping, and graceful shutdown handling to ensure runtime events are safely persisted before termination occurs.

This becomes particularly important in:

```text
worker systems
containerized deployments
serverless runtimes
high-throughput services
distributed production infrastructure
```

where abrupt process termination could otherwise result in runtime event loss.

## Conceptual runtime flow

At a high level, the logger architecture operates conceptually like this:

```text
Execution Context
        ↓
Structured Runtime Event
        ↓
Logger Pipeline
        ↓
Buffering / Batching
        ↓
Transport Infrastructure
        ↓
Observability Destination
```

Each layer remains intentionally isolated so runtime behavior, transport infrastructure, resilience strategies, and operational telemetry can evolve independently.

## Summary

Ambiten Logger treats logging as structured runtime telemetry rather than console output.

Runtime events remain structured internally, execution context propagates automatically, transports remain composable, buffering and batching reduce execution pressure, resilience layers isolate infrastructure failures, and lifecycle participation ensures observability infrastructure behaves predictably inside production runtime environments.