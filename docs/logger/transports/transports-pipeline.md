# Transport Pipeline

The transport pipeline controls how runtime events move from application execution into persistence layers, observability systems, ingestion infrastructure, and external telemetry platforms.

Ambiten Logger intentionally separates runtime event generation from transport delivery so applications can emit logs consistently while transports remain independently configurable, composable, and replaceable over time.

When a runtime event is created, it first becomes a structured runtime entry. That entry may then pass through multiple operational stages before finally reaching its destination.

Conceptually:

```text
Runtime Event
      ↓
Context Resolution
      ↓
Metadata Enrichment
      ↓
Filtering
      ↓
Buffering / Batching
      ↓
Resilience Handling
      ↓
Transport Execution
```

This architecture allows the runtime pipeline to remain stable even as observability infrastructure evolves.

## Structured runtime flow

Every log emitted by the runtime becomes a normalized structured entry internally.

The pipeline preserves:

- timestamps
- severity levels
- runtime metadata
- tenant information
- request identifiers
- execution context
- transport metadata

throughout the entire delivery lifecycle.

Conceptually:

```text
Application Execution
        ↓
Structured Runtime Entry
        ↓
Transport Pipeline
        ↓
Observability Infrastructure
```

Because the runtime always operates on structured entries internally, transports never need to reconstruct operational meaning from formatted console text.

## Transport independence

The transport pipeline is intentionally transport-agnostic.

A single logger instance may stream runtime events into multiple destinations simultaneously.

```ts
const logger = createLogger({
  transports: [
    consoleTransport(),
    createRotatingFileTransporter({
      filename: './logs/runtime.log'
    }),
    createLokiTransport(...)
  ]
});
```

Each transport implements the same runtime contract regardless of its internal delivery behavior.

Conceptually:

Conceptually:

```text
Structured Runtime Entry
        ↙      ↓      ↘
 Console   Filesystem   Remote Infrastructure
```

This allows observability infrastructure to evolve independently from application logging logic.

An application may begin with console visibility, later adopt rotating files, and eventually integrate with centralized telemetry platforms without rewriting its runtime logging behavior.

## Runtime-specific transport responsibilities

Different transports exist to solve different operational concerns.

Conceptually:

```text
Console Transport      → immediate runtime visibility
File Transport         → persistent retention
Batch Transport        → throughput optimization
Remote Transport       → centralized observability
Resilience Layer       → infrastructure protection
```

Each transport participates in the same structured runtime pipeline while focusing on a distinct operational responsibility.

This separation keeps the observability architecture composable and operationally predictable.

## Buffering and asynchronous delivery

The transport pipeline supports buffering and asynchronous delivery to reduce execution pressure under sustained throughput.

Instead of forcing every runtime event to execute a direct filesystem or network operation synchronously, transports may temporarily accumulate entries before flushing them together.

Conceptually:

```text
Application Runtime
        ↓
Buffered Transport
        ↓
Async Batch Pipeline
        ↓
Remote Delivery
```

This becomes especially important in systems generating large amounts of runtime telemetry continuously.

Buffering and batching reduce:

- filesystem pressure
- network request volume
- transport overhead
- latency amplification
- remote ingestion cost

while preserving operational telemetry continuity.

The application continues executing normally while delivery occurs independently downstream.

## Context-aware telemetry flow

The transport pipeline is fully context-aware.

Execution metadata inherited from AmbitenContext remains attached to the structured runtime entry throughout the entire transport lifecycle.

A runtime event generated deep inside a repository, middleware layer, transactional operation, adapter, or asynchronous workflow therefore arrives at remote observability infrastructure with its execution state still preserved.

```JSON
{
  "tenantId": "tenant-us",
  "requestId": "req_91AB",
  "collectionName": "orders"
}
```

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Entry
        ↓
Transport Pipeline
        ↓
Remote Observability
```

This allows distributed runtime activity to remain operationally traceable across infrastructure boundaries.

## Transport isolation

Transport execution is intentionally isolated from application execution.

A failure inside one transport does not prevent other transports from continuing to process runtime events.

Conceptually:

```text
Structured Runtime Entry
        ↙              ↘
Filesystem         Remote HTTP
Transport           Transport
                         ↓
                      Failure
```

In this scenario, filesystem persistence may continue normally even while remote ingestion infrastructure is unavailable.

This isolation prevents observability instability from cascading into runtime instability.

## Resilience integration

The transport pipeline also integrates naturally with resilience handling.

Retries, circuit breakers, buffering, and batching can all participate within the delivery lifecycle without changing application logging behavior.

Conceptually:

```text
Runtime Event
      ↓
Buffer / Batch Layer
      ↓
Retry Handling
      ↓
Circuit Breaker
      ↓
Remote Infrastructure
```

This allows the observability pipeline to tolerate temporary infrastructure instability while protecting the runtime itself from excessive downstream pressure.

## Performance and operational balance

The transport pipeline is ultimately designed to balance three operational concerns simultaneously:

```text
runtime performance
operational reliability
observability continuity
```

Direct synchronous logging improves immediacy but may increase execution pressure.

Heavy buffering improves throughput but increases temporary in-memory retention.

Aggressive retry behavior improves delivery persistence but may create infrastructure pressure during outages.

The pipeline architecture exists to manage those tradeoffs safely and predictably across different runtime environments.

## Runtime-oriented observability architecture

The transport pipeline transforms logging from a console utility into a runtime observability architecture.

Conceptually:

```text
Application Runtime
        ↓
Structured Runtime Pipeline
        ↓
Operational Telemetry Flow
        ↓
Persistent Observability Infrastructure
```

The application focuses only on emitting runtime events.

The transport system manages persistence, buffering, delivery, resilience, retention, and operational telemetry flow independently downstream.

## Summary

The transport pipeline in Ambiten Logger controls how structured runtime events move from execution into persistence layers, observability systems, and external telemetry infrastructure.

Runtime entries remain structured throughout the entire lifecycle, context metadata propagates automatically across transport boundaries, buffering and batching improve throughput efficiency, resilience layers isolate infrastructure instability, and transport independence allows observability infrastructure to evolve without changing application logging behavior.
