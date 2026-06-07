# Async Batch Transport

The async batch transport is designed for high-throughput runtime environments where logs must be delivered asynchronously to external infrastructure without blocking application execution.

Instead of sending every runtime event individually, the transport accumulates structured runtime entries into batches and flushes them together through a user-defined asynchronous delivery function.

```ts
import {
  AsyncBatchTransporter
} from '@ambiten/logger';

const transport = new AsyncBatchTransporter({
  batchSize: 50,
  flushInterval: 5000,

  async sendBatch(entries) {
    // send entries to remote system
  }
});
```

This significantly reduces transport overhead in environments where remote delivery operations involve network latency, authentication, serialization cost, ingestion throttling, or distributed observability infrastructure.

Conceptually:

```PlainText
Application Runtime
        ↓
Async Batch Buffer
        ↓
Batch Flush
        ↓
Remote Delivery
```

The runtime continues executing while delivery occurs independently in the background.

## Batch lifecycle

Runtime events are temporarily accumulated inside an internal in-memory batch buffer.

A batch flush occurs when one of three conditions is reached:

```text
configured batch size reached
flush interval expires
manual flush triggered
```

This allows runtime throughput to remain decoupled from transport latency.

Instead of executing outbound delivery operations for every individual runtime event, the transport groups multiple events into a single asynchronous delivery operation.

Conceptually:

```text
Multiple Runtime Events
        ↓
Single Batch Payload
        ↓
Async Transport Delivery
```

This dramatically reduces delivery pressure in distributed systems where remote ingestion infrastructure may already be operating under heavy load.

## Remote delivery pipelines

The async batch transport is especially valuable for remote observability infrastructure such as:

```text
centralized ingestion systems
cloud telemetry pipelines
distributed observability platforms
high-volume event streams
remote monitoring gateways
```

A typical remote ingestion workflow may resemble the following:

```ts
const transport = new AsyncBatchTransporter({
  batchSize: 100,
  flushInterval: 3000,

  async sendBatch(entries) {
    await fetch('https://logs.example.com/ingest', {
      method: 'POST',
      body: JSON.stringify(entries)
    });
  }
});
```

Because the transport operates on normalized runtime entries internally, every batch preserves structured metadata automatically.

Operational context such as:

```JSON
{
  "requestId": "req_821",
  "tenantId": "tenant-eu",
  "collectionName": "orders"
}
```

remains intact throughout the batching and delivery lifecycle.

This allows remote observability infrastructure to retain execution continuity even across distributed runtime environments.

## Structured runtime preservation

The async batch transport does not batch formatted strings.

It batches structured runtime events.

Conceptually:

```text
Structured Runtime Events
        ↓
Batch Aggregation
        ↓
Serialized Delivery Payload
```

Because batching occurs after runtime normalization, every event preserves:

```text
timestamps
severity levels
runtime metadata
execution context
tenant information
request correlation
transport metadata
```

throughout the delivery pipeline.

This significantly improves observability correlation inside distributed telemetry systems.

## Relationship with resilience

Async batching is commonly combined with resilience protection.

Remote ingestion infrastructure is inherently exposed to network instability, backend pressure, latency spikes, and intermittent failures.

Batch transports therefore benefit significantly from retry systems and circuit breaker protection.

```ts
const transport = new AsyncBatchTransporter({
  batchSize: 50,
  flushInterval: 5000,

  async sendBatch(entries) {
    await resilientTransport(entries);
  }
});
```

Conceptually:

```text
Runtime Events
        ↓
Batch Pipeline
        ↓
Resilience Layer
        ↓
Remote Infrastructure
```

This helps prevent unstable observability systems from creating excessive execution pressure during production incidents.

The runtime continues processing requests while transport recovery occurs independently downstream.

## Throughput optimization

The async batch transport exists primarily to optimize remote throughput behavior.

Unlike buffered transports, which focus mainly on reducing local transport pressure, async batching is specifically oriented around asynchronous remote delivery and controlled ingestion flow.

This distinction becomes increasingly important in systems where:

```text
network latency is high
remote ingestion is rate-limited
observability traffic is expensive
runtime throughput is sustained
distributed infrastructure is involved
```

Batching reduces transport frequency while preserving operational telemetry continuity.

## Graceful shutdown handling

Because runtime events may remain temporarily buffered in memory, graceful shutdown handling becomes important.

Before application termination, pending runtime events should be flushed explicitly.

```ts
await transport.flush();
await transport.stop();
```

This ensures buffered runtime events are delivered before process shutdown occurs.

Graceful shutdown handling becomes especially important in:

```text
containerized deployments
worker systems
background processors
autoscaling infrastructure
serverless runtimes
```

where abrupt termination could otherwise result in lost telemetry.

## Relationship with runtime execution

The async batch transport is fundamentally designed to decouple runtime execution from remote delivery latency.

Conceptually:

```text
Application Execution
        ↓
Structured Runtime Events
        ↓
Async Batch Transport
        ↓
Independent Delivery Pipeline
```

This separation allows high-throughput systems to preserve observability continuity without tightly coupling request execution to remote ingestion performance.

The application focuses on execution. The transport pipeline manages delivery independently downstream.

## Summary

The async batch transport provides asynchronous high-throughput delivery for structured runtime events.

Runtime entries are accumulated into batches, flushed independently from request execution, delivered through asynchronous pipelines, protected through resilience layers, and preserved as structured operational telemetry throughout the full observability lifecycle.
