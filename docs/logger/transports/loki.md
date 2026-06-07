# Loki Transport

The Loki transport sends structured runtime events directly to a Loki push endpoint for centralized log aggregation and Grafana-based observability workflows.

It is especially useful for teams already operating Grafana infrastructure or for systems that require efficient label-based runtime filtering across services, tenants, requests, and execution boundaries.

```ts
import {
  createLogger,
  createLokiTransport
} from '@ambiten/logger';

const logger = createLogger({
  json: true,
  transports: [
    createLokiTransport(
      'http://localhost:3100/loki/api/v1/push',
      {
        service: 'ambiten-runtime'
      }
    )
  ]
});
```

When a runtime event is emitted, the transport sends the structured entry into a Loki stream together with associated labels and runtime metadata.

```ts
logger.info('Query executed', {
  operation: 'findOne'
});
```

A Loki stream may contain labels such as service name, severity, tenant identity, source, request information, or collection metadata depending on transport configuration.

```JSON
{
  "streams": [
    {
      "stream": {
        "service": "ambiten-runtime",
        "level": "info",
        "tenantId": "tenant-eu",
        "collectionName": "orders"
      },
      "values": [
        [
          "1778767201442000000",
          "[2026-05-14T16:40:01.442Z] - [INFO] Query executed"
        ]
      ]
    }
  ]
}
```

Conceptually:

```text
Structured Runtime Event
        ↓
Loki Transport
        ↓
Loki Stream
        ↓
Grafana Querying
```

The runtime event remains operationally queryable throughout the observability pipeline.

## Label-based observability

Loki is fundamentally optimized around labels.

Labels allow runtime events to be filtered efficiently inside Grafana dashboards and observability queries.

```ts
{service="ambiten-runtime", level="error"}
```

Because labels remain indexed operational metadata rather than message text, runtime filtering becomes significantly more efficient and operationally meaningful.

Conceptually:

```text
Runtime Metadata
        ↓
Loki Labels
        ↓
Efficient Runtime Filtering
```

This allows teams to correlate operational behavior directly through structured execution properties instead of relying on message parsing.

## Context-aware labels

The Loki transport integrates naturally with Ambiten’s context-aware runtime system.

Execution metadata inherited from `AmbitenContext` can automatically propagate into Loki labels.

```ts
createLokiTransport(
  'http://localhost:3100/loki/api/v1/push',
  {
    service: 'ambiten-runtime'
  },
  {
    includeContextLabels: true
  }
);
```

This becomes especially valuable in multi-tenant and distributed systems where runtime visibility must remain isolated across shared infrastructure.

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Event
        ↓
Context-Aware Loki Labels
```

Operational continuity remains observable across requests, services, transactions, queues, adapters, and asynchronous workflows.

## Label cardinality considerations

Labels should be designed carefully.

Loki performs best when labels represent controlled operational dimensions rather than highly unique runtime values.

Fields such as:

```text
service names
severity levels
tenant identifiers
runtime sources
collection names
environment names
```

are often appropriate label candidates.

Highly unique values should generally remain inside runtime metadata rather than becoming labels.

Conceptually:

```text
Controlled Runtime Fields → labels
Highly Unique Fields     → metadata
```

Excessive label cardinality can negatively affect query performance and storage efficiency inside Loki clusters.

## Runtime resilience

Loki ingestion infrastructure should be treated as remote infrastructure.

Network instability, ingestion pressure, unavailable nodes, or backend outages should never destabilize application execution.

For production systems, Loki delivery should therefore be protected through resilience handling.

```ts
const transport = createResilientTransporter(
  createLokiTransport(
    'https://loki.example.com/loki/api/v1/push',
    {
      service: 'ambiten-runtime'
    }
  )
);
```

Conceptually:

```text
Runtime Events
        ↓
Resilience Layer
        ↓
Loki Infrastructure
```

Retries and circuit breaker protection isolate ingestion instability from the application runtime itself.

The runtime continues executing while recovery occurs independently downstream.

## High-throughput ingestion

In high-throughput environments, Loki transport is commonly combined with asynchronous batching.

```ts
const transport = new AsyncBatchTransporter({
  batchSize: 100,
  flushInterval: 5000,

  async sendBatch(entries) {
    // send entries to Loki-compatible ingestion layer
  }
});
```

Conceptually:

```text
Runtime Events
        ↓
Async Batch Pipeline
        ↓
Loki Delivery
```

Batching significantly reduces outbound request pressure and improves delivery efficiency across distributed runtime environments.

This becomes especially important in systems generating large volumes of operational telemetry continuously.

## Grafana integration

The Loki transport is particularly effective inside Grafana-centered observability ecosystems.

Because Loki streams preserve structured runtime metadata through labels and contextual fields, dashboards can correlate runtime behavior visually across:

```text
services
tenants
execution boundaries
severity levels
request flows
operational incidents
```

This makes the transport especially valuable for operational diagnostics, incident response, and distributed runtime visibility.

## Relationship with structured logging

The Loki transport operates on normalized structured runtime events internally.

Conceptually:

```text
Structured Runtime Event
        ↓
Loki Stream Serialization
        ↓
Operational Aggregation
```

This allows execution context, runtime metadata, severity information, timestamps, and operational fields to remain preserved throughout the aggregation lifecycle.

The transport therefore participates fully in the broader Ambiten Logger runtime pipeline rather than acting as a standalone output utility.

## Summary

The Loki transport sends structured runtime events into Loki streams for centralized aggregation and Grafana-based observability.

Runtime metadata propagates naturally into labels and structured telemetry fields, operational visibility remains queryable across tenants and execution boundaries, resilience layers isolate ingestion instability from runtime execution, and batching pipelines improve delivery efficiency in high-throughput distributed systems.
