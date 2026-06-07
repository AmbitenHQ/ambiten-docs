# Recommended Setups

Logging strategy should evolve with the shape of the runtime.

A local development server, a distributed SaaS platform, a worker system, and a serverless runtime do not operate under the same infrastructure conditions. Runtime visibility, transport pressure, retention behavior, and observability requirements change significantly depending on execution environment and traffic characteristics.

Ambiten Logger is intentionally composable so production setups can remain lightweight at first while scaling naturally as operational complexity grows.

Conceptually:

```text
Runtime Shape
      ↓
Operational Requirements
      ↓
Logging Strategy
```

The safest setup is usually the one that matches the operational reality of the system rather than the most complex possible configuration.

## Local development

For local development, console visibility is usually sufficient.

```ts
const logger = createLogger({
  level: 'debug',
  colorize: true,
  transports: [
    consoleTransport()
  ]
});
```

Conceptually:

```text
Development Runtime
        ↓
Console Visibility
```

Readable console output is often more valuable during active development than persistence or centralized ingestion.

Colorized output and lower log levels help developers inspect runtime behavior quickly while debugging middleware, requests, adapters, and application flow.

## Standard production API

For a standard production API, structured JSON combined with rotating files provides a strong operational baseline.

```ts
const logger = createLogger({
  level: 'info',
  json: true,
  transports: [
    createRotatingFileTransporter({
      filename: './logs/runtime.log',
      frequency: 'daily',
      backupCount: 7,
      compress: true
    })
  ]
});
```

Conceptually:

```text
Structured Runtime Events
            ↓
Rotating Persistence
            ↓
Operational Retention
```

This setup provides:

- structured telemetry
- persistent operational history
- predictable archive rotation
- compressed retention
- stable production visibility

without introducing unnecessary infrastructure complexity early.

## High-throughput services

High-throughput systems should prioritize batching and asynchronous delivery.

```ts
const logger = createLogger({
  level: 'info',
  json: true,
  transports: [
    new AsyncBatchTransporter({
      batchSize: 100,
      flushInterval: 5000,
      async sendBatch(entries) {
        await sendLogs(entries);
      }
    })
  ]
});
```

Conceptually:

```text
High Runtime Throughput
          ↓
Batch Aggregation
          ↓
Async Delivery
```

This setup reduces:

```text
network overhead
filesystem pressure
transport latency
runtime blocking
```

while preserving structured operational telemetry under sustained load.

High-throughput systems benefit significantly from reducing synchronous transport activity wherever possible.

## Multi-tenant Ambiten applications

Multi-tenant runtimes benefit heavily from context-aware execution metadata.

```ts
const logger = createLogger({
  json: true,
  contextProvider: () => {
    const ctx = AmbitenContext.get();

    return ctx
      ? {
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
          dbName: ctx.dbName,
          collectionName: ctx.collectionName,
          meta: ctx.loggerMeta
        }
      : undefined;
  }
});
```

Conceptually:

```text
Runtime Context
        ↓
Automatic Metadata Propagation
        ↓
Tenant-Aware Observability
```

This preserves execution continuity automatically across:

- requests
- transactions
- repositories
- middleware
- background jobs
- distributed execution flows


without manually passing runtime identifiers across layers.

Context-aware logging becomes especially valuable during operational investigation in shared infrastructure environments.

## Remote observability pipelines

Remote observability infrastructure should generally be protected through resilience handling.

```ts
const logger = createLogger({
  json: true,
  transports: [
    createResilientTransporter(
      createHttpTransport(process.env.LOG_INGEST_URL!)
    )
  ]
});
```

Conceptually:

```text
Runtime Events
        ↓
Resilience Layer
        ↓
Remote Observability Infrastructure
```

Retry handling and circuit breaker protection help isolate:

```text
network instability
ingestion outages
backend pressure
temporary transport failures
```

from the application runtime itself.

Remote logging infrastructure should never become a direct source of application instability.

## Serverless environments

Serverless runtimes usually benefit from structured console logging without long-running background activity.

```ts
const logger = createLogger({
  json: true,
  transports: [
    consoleTransport(false)
  ]
});
```

Conceptually:

```text
Ephemeral Runtime
        ↓
Structured Stdout
```

Because serverless environments are short-lived and execution-scoped, maintaining long-running flush intervals, timers, or large local archives is often operationally inefficient.

Most serverless observability systems already aggregate stdout automatically into centralized telemetry infrastructure.

## Safe production defaults

For most production systems, the safest baseline generally combines:

```text
structured JSON logging
context-aware metadata
graceful shutdown handling
persistent retention or resilient remote delivery
```

Conceptually:

```text
Structured Telemetry
          +
Runtime Context
          +
Reliable Delivery
          +
Graceful Lifecycle Handling
```

This provides strong operational visibility without prematurely overengineering the transport pipeline.

## Evolving operational complexity

Logging infrastructure should evolve incrementally alongside runtime complexity.

Conceptually:

```text
Simple Runtime
      ↓
Simple Logging
      ↓
Growing Traffic
      ↓
Expanded Observability
```

Most systems benefit from starting with:

```text
structured logging
predictable retention
minimal transport complexity
```

then gradually adding:

- batching
- remote ingestion
- centralized observability
- resilience layers
- metrics
- advanced retention strategies

as operational requirements become clearer.

The logging architecture should remain proportional to the operational maturity of the system itself.

## Summary

Recommended Ambiten Logger setups are designed around matching runtime architecture to operational observability requirements.

Development environments benefit from simple console visibility, production APIs from structured rotating retention, high-throughput systems from asynchronous batching, multi-tenant runtimes from context-aware metadata propagation, remote observability pipelines from resilience handling, and serverless environments from lightweight structured stdout delivery.

The safest production strategy is usually the simplest architecture capable of preserving reliable operational visibility under the actual runtime conditions of the system.
