# Resilience Model

Logging should support runtime execution, not become another reason the runtime fails.

Ambiten Logger treats transport instability as an operational condition that must remain isolated from application execution.

A remote ingestion endpoint may become unavailable. A network request may timeout. A filesystem stream may stall. An observability backend may reject writes under pressure.

Those failures should remain observable, but they should never destabilize request execution or block the runtime itself.

The resilience model exists to protect execution continuity from unstable observability infrastructure.

## Transport resilience

Remote transports can be wrapped with retry and circuit breaker protection.

```ts
import {
  createHttpTransport,
  createResilientTransporter
} from '@ambiten/logger';

const transport = createResilientTransporter(
  createHttpTransport('https://logs.example.com/ingest'),
  {
    retryAttempts: 3,
    retryDelay: 500,
    failureThreshold: 5,
    cooldownPeriod: 10_000
  }
);
```

The resilience layer operates between runtime event generation and transport delivery.

Conceptually:

```text
Runtime Event
        ↓
Resilience Layer
        ↓
Transport Delivery
```

The application continues executing even while transport infrastructure becomes unstable.

## Retry behavior

Retry handling exists primarily for temporary failures.

Short-lived network interruptions, intermittent ingestion failures, transient timeouts, or brief infrastructure instability should not immediately result in permanent delivery failure.

When a transport operation fails temporarily, the logger can retry delivery using controlled backoff behavior before abandoning the attempt.

Conceptually:

```text
Temporary Failure
        ↓
Retry Attempt
        ↓
Backoff Delay
        ↓
Recovery Success
```

Retries allow observability infrastructure to recover gracefully during transient instability without immediately losing runtime telemetry.

The retry system focuses on preserving operational continuity while avoiding excessive execution pressure.

## Circuit breaker protection

Retries alone are not sufficient when downstream infrastructure becomes persistently unhealthy.

Repeated retries against failing destinations can create retry storms, increased latency, transport saturation, and cascading operational instability.

Circuit breaker protection exists to isolate those failure conditions.

When transport failures exceed configured thresholds, the circuit opens temporarily and stops attempting delivery against the failing destination.

Conceptually:

```text
Healthy Transport
      ↓
Temporary Failure
      ↓
Retry With Backoff
      ↓
Repeated Failure
      ↓
Circuit Opens
      ↓
Cooldown Period
      ↓
Recovery Attempt
```

Once the cooldown period expires, the transport may re-enter a recovery state and allow delivery attempts again.

This protects the runtime from repeatedly executing against unhealthy observability infrastructure.

## Runtime protection

The resilience model is fundamentally about protecting runtime execution.

Observability infrastructure is valuable, but it should remain operationally subordinate to application stability.

Conceptually:

```text
Application Runtime
        ↑
Protected From
        ↓
Transport Instability
```

The logger therefore prioritizes:

```text
execution continuity
controlled degradation
failure isolation
incremental recovery
runtime stability
```

rather than guaranteeing perfect delivery under every infrastructure condition.

## Remote transport reliability

The resilience layer becomes especially important for remote delivery infrastructure.

HTTP ingestion systems, Elasticsearch clusters, Loki pipelines, OpenSearch backends, cloud telemetry gateways, and distributed observability systems are inherently more exposed to:

```text
network instability
backend saturation
ingestion throttling
latency spikes
partial outages
distributed infrastructure failures
```

than local transports.

Because of this, remote delivery pipelines benefit significantly from retry isolation, batching, buffering, and circuit breaker protection.

Local transports may fail as well, but remote infrastructure typically experiences greater operational variability under production conditions.

## Failure observability

Transport failures remain observable even though they are isolated from application execution.

The logger exposes lifecycle hooks that allow applications to inspect, report, count, or react to failed delivery operations without forcing those failures into request control flow.

```ts
const logger = createLogger({
  transports: [transport],
  hooks: {
    onError(error, entry) {
      // report, inspect, or monitor transport failures
    }
  }
});
```

This allows observability infrastructure problems to remain visible operationally while the runtime continues processing requests normally.

The logger surfaces transport instability without allowing that instability to dominate execution flow.

## Relationship with batching

In high-throughput systems, resilience protection is usually most effective when combined with batching.

Batch transports reduce outbound request frequency while resilience layers isolate unstable delivery infrastructure.

```ts
const logger = createLogger({
  json: true,
  transports: [
    new AsyncBatchTransporter({
      batchSize: 50,
      flushInterval: 5000,
      sendBatch: async (entries) => {
        // send entries to remote ingestion layer
      }
    })
  ]
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
Remote Delivery
```

This significantly reduces transport pressure while improving operational stability under sustained throughput.

## Controlled degradation

The resilience model is intentionally designed around controlled degradation rather than absolute delivery guarantees.

Under severe infrastructure instability:

```text
healthy transports continue operating
buffers absorb temporary pressure
retries attempt recovery
circuit breakers isolate failures
runtime execution continues
```

The objective is not perfect observability under all failure conditions.

The objective is predictable runtime behavior under operational pressure.

Ambiten Logger therefore focuses on preserving as much telemetry continuity as reasonably possible without allowing observability infrastructure to destabilize the execution environment itself.

## Relationship with metrics

The resilience layer integrates naturally with the metrics system.

Operational telemetry can expose indicators such as:

```text
transport failures
retry pressure
dropped runtime events
buffer saturation
flush frequency
delivery instability
```

before instability escalates into broader operational incidents.

This allows teams to tune retry policies, transport throughput, buffering strategies, and resilience thresholds proactively.

## Summary

The resilience model in Ambiten Logger exists to isolate transport instability from runtime execution.

Retries, buffering, batching, circuit breaker protection, transport isolation, and controlled degradation strategies work together to preserve operational telemetry continuity while ensuring unstable observability infrastructure cannot dominate or destabilize application execution itself.
