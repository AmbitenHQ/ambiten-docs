# Structured Logging

Traditional logging systems often treat logs as formatted strings intended primarily for human reading.

While this approach may work for smaller applications, it becomes increasingly difficult to operate at scale because observability infrastructure cannot reliably interpret, correlate, aggregate, or query free-form text consistently across distributed systems.

Ambiten Logger approaches logging differently.

Every emitted log is treated as structured runtime data.

Rather than flattening execution state into formatted strings, the logger preserves runtime information as normalized serializable fields that remain queryable throughout the entire transport pipeline.

```ts
logger.info('Payment processed', {
  paymentId: 'pay_201',
  currency: 'EUR',
  amount: 240
});
```

The resulting runtime event retains its structured representation internally.

```JSON
{
  "timestamp": "2026-05-14T13:14:12.112Z",
  "level": "info",
  "message": "Payment processed",
  "meta": {
    "paymentId": "pay_201",
    "currency": "EUR",
    "amount": 240
  }
}
```

Because the runtime pipeline operates on structured entries rather than formatted strings, transports can serialize, batch, compress, retry, stream, or forward runtime events safely without reconstructing metadata afterward.

Conceptually:

```text
Runtime Event
        ↓
Structured Runtime Entry
        ↓
Transport Pipeline
        ↓
Observability Infrastructure
```

The runtime structure remains preserved throughout the full delivery lifecycle.

## Runtime-aware operational fields

Structured logging becomes significantly more valuable when combined with runtime context propagation.

Execution metadata such as request identifiers, tenant information, databases, collections, operations, and execution sources remain preserved as explicit runtime fields rather than becoming embedded inside human-readable strings.

```JSON
{
  "requestId": "req_82AA1",
  "tenantId": "tenant-eu",
  "collectionName": "orders"
}
```

This allows observability systems to correlate runtime behavior directly through structured operational fields instead of relying on fragile text-search patterns.

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Event
        ↓
Queryable Operational Metadata
```

Operational continuity remains preserved even across distributed execution boundaries.

## Queryable observability

Because runtime fields remain normalized internally, observability systems can filter, aggregate, and correlate runtime events directly by operational properties.

This significantly improves runtime visibility inside systems such as:

```text
Elasticsearch
Loki
OpenSearch
Datadog
cloud telemetry pipelines
distributed observability infrastructure
```

Structured runtime entries become especially valuable in environments involving:

```text
distributed systems
multi-tenant infrastructure
asynchronous workflows
transactional pipelines
centralized observability
incident investigation
```

where operational continuity depends heavily on reliable runtime correlation.

## Runtime normalization before formatting

Ambiten Logger supports both human-readable console output and structured JSON output because formatting occurs after runtime normalization.

The logger first creates a structured runtime event internally. Formatting decisions occur later during transport delivery.

Conceptually:

```text
Structured Runtime Entry
        ↓
Formatting Layer
        ↓
Console Output or JSON Delivery
```

This allows developers to maintain readable console logs during development while still preserving fully structured observability data in production environments.

```ts
const logger = createLogger({
  json: process.env.NODE_ENV === 'production'
});
```

The runtime logging API remains stable while output formatting adapts to the operational environment.

## Transport interoperability

Structured runtime entries also improve interoperability across transport systems.

Because transports receive normalized runtime objects instead of formatted strings, delivery pipelines can safely:

```text
serialize
batch
compress
retry
stream
buffer
forward
```

runtime telemetry without attempting to reconstruct operational state afterward.

This significantly simplifies remote ingestion pipelines and reduces observability complexity across distributed infrastructure.

The logger therefore treats structured runtime entries as transport-ready operational telemetry rather than console-oriented output.

## Relationship with context awareness

Structured logging and context awareness are deeply connected.

Execution context enriches runtime events with operational metadata automatically, while structured runtime entries preserve that metadata throughout the observability pipeline.

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Event
        ↓
Transport Pipeline
        ↓
Operational Correlation
```

This allows runtime behavior generated deep inside middleware, repositories, adapters, transactions, queues, or asynchronous workflows to remain operationally traceable across the full execution lifecycle.

## Structured logging as runtime infrastructure

Ambiten Logger does not treat structured logging as a formatting preference layered onto console output.

Structured runtime events are the internal foundation of the entire logging architecture.

The logger pipeline, transport system, resilience layer, batching infrastructure, metrics system, and observability integrations all operate on normalized runtime entries internally.

Conceptually:

```text
Structured Runtime Entry
        ↓
Core Runtime Pipeline
        ↓
Transport Infrastructure
```

This allows every layer of the observability system to operate consistently regardless of destination, framework, or runtime environment.

## Summary

Structured logging in Ambiten Logger preserves runtime events as normalized operational data rather than flattening execution state into formatted strings.

Runtime metadata remains queryable throughout the transport pipeline, execution context propagates automatically into structured runtime entries, observability systems can correlate operational behavior directly through normalized fields, and transports can deliver telemetry safely without reconstructing metadata from human-oriented output.
