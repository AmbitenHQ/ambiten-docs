# Production

Production logging requirements are fundamentally different from local development visibility.

Under real traffic, runtime telemetry must balance observability continuity, execution performance, storage lifecycle management, transport resilience, and infrastructure stability simultaneously. Logging is no longer simply about seeing messages appear in a console. It becomes part of the operational behavior of the system itself.

Ambiten Logger is designed for sustained production workloads where runtime events may be generated continuously across requests, adapters, background workers, transactional execution, queues, distributed services, and multi-tenant infrastructure boundaries.

Conceptually:

```text
Application Runtime
        ↓
Structured Runtime Events
        ↓
Production Transport Pipeline
        ↓
Operational Observability Infrastructure
```

The logger focuses on preserving runtime continuity while minimizing operational pressure under real infrastructure conditions.

## Structured JSON logging

Structured JSON logging should generally be enabled in production environments.

```ts
const logger = createLogger({
  json: true
});
```

Structured runtime events allow observability platforms to index operational metadata directly instead of relying on fragile string parsing.

Conceptually:

```text
Structured Runtime Events
        ↓
Indexed Operational Fields
        ↓
Queryable Observability
```

This becomes increasingly important when correlating runtime activity across:

```text
requests
tenants
databases
collections
services
transactions
distributed execution flows
```

JSON output preserves operational meaning throughout the entire telemetry pipeline.

## Persistent production transports

Production systems should generally avoid relying exclusively on console output.

While console visibility remains useful during development and debugging, operational environments typically require persistent retention layers.

```ts
const logger = createLogger({
  json: true,
  transports: [
    createRotatingFileTransporter({
      filename: './logs/runtime.log',
      frequency: 'daily',
      compress: true
    })
  ]
});
```

Conceptually:

```text
Runtime Events
        ↓
Persistent Transport
        ↓
Operational Retention
```

Rotating transports help prevent uncontrolled filesystem growth while preserving historical runtime visibility across deployments, crashes, incidents, and infrastructure failures.

## High-throughput batching

For high-throughput systems, asynchronous batching is strongly recommended.

Direct synchronous delivery for every runtime event can introduce unnecessary filesystem or network pressure under sustained traffic.

```ts
new AsyncBatchTransporter({
  batchSize: 100,
  flushInterval: 5000,
  sendBatch: async (entries) => {
    // remote ingestion
  }
});
```

Conceptually:

```text
Runtime Events
        ↓
Batch Aggregation
        ↓
Controlled Delivery
```

Batching reduces:

- network overhead
- filesystem pressure
- transport latency
- ingestion request volume
- runtime execution pressure

while stabilizing delivery throughput during heavy operational load.

## Resilience protection

Production observability infrastructure is not immune to operational instability.

Remote ingestion services may become unavailable, overloaded, or network-partitioned during runtime execution. Logging infrastructure failures should never cascade into application instability.

Remote transports should therefore generally be protected through resilience handling.

```ts
const transport =
  createResilientTransporter(
    createHttpTransport(endpoint)
  );
```

Conceptually:

```text
Runtime Events
        ↓
Resilience Layer
        ↓
Remote Observability Infrastructure
```

Retry handling and circuit breaker protection isolate transport instability from application execution itself.

The runtime continues processing requests while observability infrastructure recovers independently.

## Production metrics

Metrics tracking should also be enabled selectively in production systems.

```ts
const logger = createLogger({
  enableMetrics: {
    enabled: true,
    logInterval: 60_000
  }
});
```

Metrics expose operational visibility into the behavior of the logging system itself.

Conceptually:

```text
Runtime Telemetry
        ↓
Transport Metrics
        ↓
Operational Visibility
```

Metrics can reveal:

```text
transport pressure
batching behavior
flush frequency
rotation activity
delivery throughput
transport failures
dropped entries
```

without requiring direct inspection of internal transport state.

This becomes especially valuable in production environments where observability infrastructure itself may become a source of operational pressure.

## Context-aware runtime tracing

Applications using context-aware execution should allow runtime context to propagate naturally through the request lifecycle.

Execution metadata becomes significantly more valuable during incident analysis and distributed tracing workflows.

```JSON
{
  "tenantId": "tenant-eu",
  "requestId": "req_82AB",
  "collectionName": "orders"
}
```

Conceptually:

```text
Request Lifecycle
        ↓
Context Propagation
        ↓
Structured Runtime Telemetry
```

Request identifiers, tenants, databases, collections, transaction state, and runtime metadata allow operators to reconstruct execution paths across distributed infrastructure boundaries.

Without runtime continuity, large production systems become dramatically harder to debug under operational pressure.

## Graceful shutdown handling

Production shutdown behavior is another critical operational concern.

Buffered and asynchronous transports may still contain pending runtime events during:

```text
deployment restarts
container recycling
worker shutdowns
autoscaling termination
infrastructure failover
```

Applications should therefore flush and close transports gracefully before process termination.

```ts
await logger.shutdown();
```

Conceptually:

```text
Pending Runtime Events
        ↓
Flush Operations
        ↓
Transport Shutdown
        ↓
Safe Process Exit
```

Graceful shutdown handling helps prevent telemetry loss during operational lifecycle transitions.

## Test environment behavior

In test environments, background intervals and metrics timers should usually remain disabled.

Conceptually:

```text
Test Runtime
        ↓
Minimal Background Activity
```

This helps avoid:

```text
open handles
noisy output
unnecessary timers
resource leakage
unstable test shutdown
```

while keeping automated test execution predictable.

Production behavior and test behavior should remain intentionally separated.

## Operational logging philosophy

Production logging is ultimately an operational discipline rather than a development utility.

Conceptually:

```text
Execution Continuity
        ↓
Reliable Telemetry
        ↓
Operational Visibility
        ↓
Incident Recovery
```

The logger therefore prioritizes:

```text
runtime stability
transport resilience
observability continuity
predictable delivery behavior
operational consistency
```

under real infrastructure pressure.

The goal is not simply to record runtime events, but to preserve meaningful operational visibility safely across continuously evolving production systems.

## Summary

Ambiten Logger’s production architecture is designed for sustained operational workloads where runtime telemetry must remain structured, resilient, performant, and operationally predictable under real infrastructure pressure.

Structured JSON logging preserves observability continuity, persistent transports provide operational retention, batching improves throughput efficiency, resilience layers isolate infrastructure instability, context-aware execution enables distributed tracing, graceful shutdown handling protects pending telemetry, and metrics expose the health of the logging pipeline itself across production runtime environments.
