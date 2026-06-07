# Architecture

Ambiten Logger is designed as a runtime-aware observability pipeline rather than a simple output utility.

Instead of coupling application execution directly to console output or file writes, the logger separates runtime event generation from transport delivery. Applications emit structured runtime events while transports determine how, where, and when those events are delivered.

This separation allows logging infrastructure to evolve independently from application logic.

<LoggerPipelineFlow />

At the center of the architecture is the structured runtime entry.

Every log operation eventually resolves into a normalized runtime object containing severity, timestamps, execution metadata, contextual runtime state, and transport-ready payload information. Because the logger operates on structured entries internally, transports never need to understand application-specific execution flow.

Conceptually:

```text
Application → Runtime Event → Transport Pipeline → Destination
```

Applications interact with a deliberately lightweight logging surface.

```ts
logger.info('User authenticated');

logger.warn('Rate limit threshold reached');

logger.error('Database connection failed');
```

Behind that small API surface, the runtime handles formatting, metadata enrichment, batching, retries, buffering, compression, transport routing, and operational telemetry internally.

## Runtime-aware context propagation

Execution context resolution occurs before transport execution begins.

When operating inside the Ambiten runtime ecosystem, the logger automatically consumes the active execution context and enriches emitted runtime events with operational metadata such as:

```text
tenantId
requestId
dbName
collectionName
operation
```

This allows logs generated deep inside repositories, middleware, adapters, GraphQL resolvers, transactional flows, or model execution layers to remain operationally correlated without manually passing metadata through every function boundary.

Conceptually:

```text
Execution Context → Logger → Structured Runtime Event
```

The logger itself remains operationally independent from application architecture while still becoming context-aware whenever runtime context exists.

## Transport-driven delivery

The transport layer is fully composable.

Console logging, rotating files, asynchronous batching, Loki ingestion, Elasticsearch streaming, HTTP delivery, and custom transports all operate through the same runtime transport contract.

```ts
const logger = createLogger({
  transports: [
    consoleTransport(),
    createRotatingFileTransporter(),
    createLokiTransport(...)
  ]
});
```

Because transports remain isolated from runtime event generation, delivery infrastructure can evolve independently from application code.

A development-oriented console logger can later evolve into distributed observability infrastructure without requiring applications to rewrite logging behavior.

Buffered and asynchronous execution

Internally, transports behave as delivery pipelines rather than immediate write operations.

Buffered and asynchronous transports reduce runtime pressure by decoupling application execution from slower storage systems, filesystem operations, network calls, or remote ingestion infrastructure.

This becomes increasingly important in high-throughput environments where synchronous logging can degrade latency under sustained operational load.

Conceptually:

```text
Application Execution
        ↓
Buffered Runtime Events
        ↓
Async Transport Delivery
```

The logger prioritizes preserving execution continuity while allowing delivery infrastructure to operate independently downstream.

## Resilience and fault isolation

The resilience layer exists between batching and transport delivery.

Remote transport failures are isolated through retry policies, buffering strategies, and circuit breaker protection so observability infrastructure failures do not cascade into application instability.

When remote systems become unavailable:

```text
Application continues executing
        ↓
Transport retries independently
        ↓
Circuit breaker isolates unhealthy destinations
```

This prevents logging infrastructure from becoming a runtime dependency capable of destabilizing production execution paths.

Retry pipelines may use exponential backoff strategies while unhealthy destinations can be temporarily short-circuited until recovery conditions are satisfied.

## Metrics and operational telemetry

Metrics tracking exists outside the primary execution path.

The logger records operational telemetry about:

```text
transport throughput
flush activity
file rotations
dropped logs
buffer behavior
transport failures
```

without introducing significant runtime overhead.

These metrics allow operators to observe the health of the logging infrastructure itself rather than treating the logger as a black-box dependency.

Operational telemetry becomes especially valuable in production systems where buffering, batching, remote delivery, and asynchronous transports must remain observable under load.

## Architectural principles

The overall architecture is designed around three operational principles:

<LoggerArchitecturePrinciples />

The logger prioritizes:

- runtime independence
- transport composability
- execution continuity

rather than coupling application execution directly to output infrastructure.

## Relationship with the Ambiten runtime

Ambiten Logger can operate independently in smaller systems, but it becomes significantly more powerful inside the broader Ambiten runtime ecosystem.

```text
AmbitenContext → execution state
Logger       → runtime event generation
Transports   → delivery infrastructure
```

This separation allows the same logger to scale from local development environments into distributed multi-tenant production systems without changing the public logging API.

## Summary

Ambiten Logger functions as a runtime-aware observability layer rather than a console wrapper.

It separates runtime event generation from transport delivery, supports structured operational metadata, propagates execution context automatically, isolates transport failures from application execution, and provides composable infrastructure capable of scaling from lightweight local development into distributed production observability systems.


