# Elasticsearch Transport

The Elasticsearch transport sends structured runtime events directly into an Elasticsearch index so logs can be searched, filtered, aggregated, and correlated across operational metadata such as tenants, request identifiers, collections, runtime sources, and execution severity.

```ts
import {
  createLogger,
  createElasticTransport
} from '@ambiten/logger';

const logger = createLogger({
  json: true,
  transports: [
    createElasticTransport(
      'http://localhost:9200',
      'ambiten-runtime'
    )
  ]
});
```

When a runtime event is emitted, the transport indexes a structured document into the configured Elasticsearch index.

```ts
logger.info('Order indexed', {
  orderId: 'ord_1001'
});
```

The indexed document preserves the structured runtime entry internally.

```JSON
{
  "@timestamp": "2026-05-14T16:22:10.441Z",
  "level": "info",
  "message": "Order indexed",
  "source": "OrderService",
  "meta": {
    "orderId": "ord_1001"
  },
  "context": {
    "tenantId": "tenant-eu",
    "requestId": "req_82AB",
    "collectionName": "orders"
  }
}
```

Conceptually:

```text
Structured Runtime Event
        ↓
Elasticsearch Transport
        ↓
Indexed Operational Document
```

The runtime structure remains queryable throughout the observability pipeline.

## Structured operational querying

Because runtime fields remain normalized, Elasticsearch queries can operate directly on operational metadata rather than relying on fragile text parsing.

```JSON
{
  "query": {
    "term": {
      "context.tenantId": "tenant-eu"
    }
  }
}
```

This allows teams to correlate runtime activity through explicit operational fields such as:

```text
tenant identity
request identifiers
runtime sources
collections
databases
severity levels
execution flows
```

rather than searching arbitrary formatted strings.

```text
Conceptually:

Operational Metadata
        ↓
Indexed Runtime Fields
        ↓
Queryable Observability
```

This becomes especially valuable in multi-tenant systems and distributed execution environments where runtime continuity must remain searchable across large operational datasets.

## Runtime-aware observability

The Elasticsearch transport integrates naturally with Ambiten’s context-aware logging system.

Execution metadata inherited from `AmbitenContext` remains preserved automatically throughout indexing.

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Event
        ↓
Elasticsearch Document
```

This allows runtime activity generated deep inside repositories, middleware, adapters, transactional flows, queues, or background workers to remain operationally traceable through centralized search infrastructure.

## Relationship with JSON logging

The Elasticsearch transport is designed for structured runtime events and is typically used together with JSON logging.

```ts
const logger = createLogger({
  json: true
});
```

Because the logger pipeline already operates on normalized runtime entries internally, Elasticsearch indexing occurs naturally without reconstructing metadata from console-oriented output.

The transport therefore works directly with transport-ready runtime objects rather than flattened strings.

## Production infrastructure considerations

Elasticsearch should be treated as remote infrastructure.

Network instability, ingestion pressure, authentication failures, cluster overload, or unavailable nodes should never destabilize application execution itself.

For production systems, the transport should usually be protected through the resilience layer.

```ts
const transport = createResilientTransporter(
  createElasticTransport(
    'https://elastic.example.com',
    'ambiten-runtime'
  )
);
```

Conceptually:

```text
Runtime Events
        ↓
Resilience Layer
        ↓
Elasticsearch Cluster
```

Retries and circuit breaker protection help isolate observability instability from request execution.

The application continues operating even when indexing infrastructure becomes unhealthy.

## High-throughput ingestion

In high-throughput systems, direct indexing for every runtime event may create unnecessary transport pressure.

The Elasticsearch transport is therefore commonly combined with async batching.

```text
Runtime Events
        ↓
Async Batch Pipeline
        ↓
Bulk Elasticsearch Delivery
```

Batching significantly reduces outbound request frequency and improves ingestion efficiency under sustained throughput.

Large production deployments often place Elasticsearch behind:

```text
async batching
bulk ingestion APIs
dedicated log shippers
observability gateways
distributed ingestion pipelines
```

rather than performing direct synchronous indexing for every runtime event.

Direct indexing remains simple and effective for smaller systems, but larger deployments generally benefit from controlled ingestion pipelines.

## Operational analytics and incident investigation

The Elasticsearch transport becomes especially valuable when teams require:

```text
structured runtime search
tenant-level visibility
incident investigation
request correlation
operational analytics
distributed runtime tracing
```

across long-lived operational datasets.

Because runtime events remain fully structured, observability teams can query execution behavior directly through operational metadata instead of reconstructing runtime flow from fragmented console output.

This dramatically improves debugging and incident analysis across distributed infrastructure.

## Relationship with the transport pipeline

The Elasticsearch transport participates fully in the broader Ambiten Logger runtime pipeline.

Conceptually:

```text
Runtime Execution
        ↓
Structured Runtime Event
        ↓
Transport Pipeline
        ↓
Elasticsearch Index
```

This means the transport can still benefit from:

```text
buffering
async batching
retry behavior
circuit breaker protection
metrics tracking
graceful shutdown handling
```

without changing application logging logic.

The transport remains composable within the broader observability architecture.

## Summary

The Elasticsearch transport indexes structured runtime events directly into Elasticsearch so operational telemetry remains searchable, filterable, and correlated through normalized runtime metadata.

Execution context propagates automatically into indexed documents, observability systems can query runtime behavior through structured operational fields, resilience layers protect execution from unstable ingestion infrastructure, and high-throughput systems can scale delivery through batching and controlled ingestion pipelines.
