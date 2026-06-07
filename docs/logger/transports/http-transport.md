# HTTP Transport

The HTTP transport sends structured runtime events to a remote ingestion endpoint through HTTP requests.

It is useful when applications need to forward runtime telemetry into centralized logging gateways, internal observability platforms, cloud ingestion systems, telemetry APIs, or vendor-neutral monitoring pipelines.

```ts
import {
  createLogger,
  createHttpTransport
} from '@ambiten/logger';

const logger = createLogger({
  json: true,
  transports: [
    createHttpTransport('https://logs.example.com/ingest')
  ]
});
```

When a runtime event is emitted, the transport forwards the structured entry to the configured endpoint.

```ts
logger.info('Payment completed', {
  paymentId: 'pay_1001'
});
```

The remote endpoint receives a fully structured payload containing execution metadata, severity, timestamps, runtime context, and transport-ready telemetry fields.

```JSON
{
  "timestamp": "2026-05-14T16:10:21.442Z",
  "level": "info",
  "message": "Payment completed",
  "formattedMessage": "[2026-05-14T16:10:21.442Z] - [INFO] Payment completed",
  "meta": {
    "paymentId": "pay_1001"
  },
  "context": {
    "tenantId": "tenant-eu",
    "requestId": "req_82AB"
  }
}
```

Conceptually:

```text
Structured Runtime Event
        ↓
HTTP Transport
        ↓
Remote Ingestion Endpoint
```

The runtime structure remains preserved throughout the delivery pipeline.

## Structured remote telemetry

Because the HTTP transport operates on normalized runtime entries internally, execution metadata remains queryable after delivery.

Operational fields such as:

```text
request identifiers
tenant information
severity levels
runtime sources
database metadata
collection names
execution context
```

remain preserved automatically inside the remote payload.

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Event
        ↓
Remote Telemetry Payload
```

This allows centralized ingestion systems to correlate runtime activity without reconstructing operational state from formatted strings.

## Authentication and request configuration

The HTTP transport supports custom headers and request options for authenticated or specialized ingestion systems.

```ts
createHttpTransport('https://logs.example.com/ingest', {
  headers: {
    authorization: `Bearer ${process.env.LOG_TOKEN}`
  },
  timeout: 5000
});
```

This allows the transport to integrate cleanly with:

```text
authenticated telemetry gateways
internal ingestion APIs
cloud observability services
custom monitoring platforms
multi-tenant logging infrastructure
```

without modifying application logging logic.

## High-throughput delivery

Sending every runtime event as an individual HTTP request is generally inefficient in high-throughput environments.

For sustained production workloads, HTTP delivery is usually combined with asynchronous batching.

```ts
const batchTransport = new AsyncBatchTransporter({
  batchSize: 100,
  flushInterval: 5000,

  async sendBatch(entries) {
    await fetch('https://logs.example.com/batch', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(entries)
    });
  }
});
```

Conceptually:

```text
Runtime Events
        ↓
Async Batch Pipeline
        ↓
HTTP Delivery
        ↓
Remote Ingestion
```

Batching significantly reduces outbound request pressure while improving throughput efficiency across distributed systems.

## Runtime resilience

Remote HTTP infrastructure is inherently exposed to operational instability.

Network interruptions, authentication failures, backend saturation, latency spikes, and ingestion outages should never destabilize application execution.

For production systems, HTTP delivery should therefore be protected through retry and circuit breaker behavior.

Remote logging endpoints can fail because of network instability, service outages, authentication issues, or ingestion pressure. For production systems, HTTP delivery should therefore be protected with retry and circuit breaker behavior.

```ts
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

Conceptually:

```text
HTTP Failure
      ↓
Retry With Backoff
      ↓
Repeated Failure
      ↓
Circuit Opens
      ↓
Recovery Attempt
```

This allows temporary failures to recover gracefully while preventing unstable downstream infrastructure from creating excessive runtime pressure.

The application continues executing while the resilience layer manages recovery independently.

## Vendor-neutral observability

The HTTP transport is especially useful for teams operating their own ingestion infrastructure or requiring vendor-neutral telemetry delivery.

Because the transport simply forwards structured runtime events through HTTP, it can integrate with virtually any remote ingestion system capable of receiving structured JSON payloads.

Conceptually:

```text
Ambiten Runtime
        ↓
HTTP Transport
        ↓
Any Compatible Ingestion System
```

This makes the transport highly adaptable across internal platforms, proprietary telemetry systems, and evolving observability architectures.

## Relationship with dedicated transports

The HTTP transport provides a generalized delivery mechanism.

Dedicated transports such as Elasticsearch or Loki transports may provide deeper integration with platform-specific ingestion behavior, indexing strategies, or optimized delivery pipelines.

Conceptually:

```text
HTTP Transport        → generic remote delivery
Elasticsearch         → search-oriented indexing
Loki                  → label-based log aggregation
```

The HTTP transport therefore works best when flexibility and transport independence are prioritized.

## Runtime-oriented delivery

The HTTP transport exists to decouple runtime execution from centralized observability delivery.

Conceptually:

```text
Application Runtime
        ↓
Structured Runtime Events
        ↓
HTTP Delivery Pipeline
        ↓
Centralized Telemetry Infrastructure
```

This allows runtime telemetry to move beyond the local process boundary while preserving structured operational continuity.

## Summary

The HTTP transport forwards structured runtime events to remote ingestion endpoints through HTTP requests while preserving execution metadata, runtime context, and structured operational telemetry.

It integrates naturally with async batching, resilience protection, centralized ingestion systems, vendor-neutral observability pipelines, and distributed telemetry infrastructure without coupling application execution directly to remote delivery behavior.
