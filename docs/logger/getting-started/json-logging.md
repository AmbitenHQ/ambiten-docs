# JSON Logging

Structured JSON logging is the recommended output format for production environments.

Rather than emitting human-oriented console strings, Ambiten Logger serializes runtime events into machine-readable structured objects that can be indexed, searched, aggregated, correlated, and transported across distributed observability infrastructure.

Enable JSON mode by setting the `json` option when creating the logger.

```ts
import { createLogger } from '@ambiten/logger';

const logger = createLogger({
  json: true
});

logger.info('User authenticated');
```

A runtime event emitted in JSON mode typically resembles the following structure:

```JSON
{
  "timestamp": "2026-05-14T11:42:12.221Z",
  "level": "info",
  "message": "User authenticated",
  "source": "AuthService",
  "context": {
    "requestId": "req_821AA",
    "tenantId": "tenant-eu"
  },
  "meta": {
    "userId": "usr_1001"
  }
}
```

Unlike plain-text console output, structured logs preserve execution metadata as queryable runtime fields rather than collapsing operational state into formatted strings.

This distinction becomes increasingly important as systems scale operationally.

Observability platforms can filter, correlate, aggregate, and analyze runtime behavior directly from structured fields without relying on fragile string parsing or inconsistent formatting conventions.

Conceptually:

```text
Runtime Event → Structured JSON → Observability Infrastructure
```

Because Ambiten Logger internally operates on normalized runtime entries, switching between formatted console output and structured JSON does not require rewriting application logging logic.

```ts
const logger = createLogger({
  json: process.env.NODE_ENV === 'production'
});
```

The logger API remains unchanged while output formatting adapts to the operational environment.

## Runtime-aware structured events

When operating inside the Ambiten runtime ecosystem, execution context automatically propagates into structured log output whenever an active runtime boundary exists.

Contextual runtime metadata such as:

```text
tenantId
requestId
dbName
collectionName
operation
```

can flow automatically into emitted runtime events without requiring repetitive manual attachment throughout the application.

Example:

```ts
logger.info('Order completed', {
  orderId: 'ord_201'
});
```

Resulting output:

```JSON
{
  "timestamp": "2026-05-14T11:52:01.117Z",
  "level": "info",
  "message": "Order completed",
  "context": {
    "tenantId": "tenant-us",
    "requestId": "req_92AB2"
  },
  "meta": {
    "orderId": "ord_201"
  }
}
```

This allows runtime activity generated deep inside middleware, repositories, adapters, models, transactional flows, or GraphQL execution layers to remain operationally correlated across the full execution lifecycle.

## Relationship with transports

JSON logging integrates naturally with Ambiten’s transport-driven architecture.

The logger generates structured runtime events first. Transports determine where those events go afterward.

```text
Application → Logger → Structured Event → Transport Pipeline
```

Because transports receive normalized runtime entries before formatting occurs, remote ingestion systems can forward structured payloads directly without reconstructing metadata from formatted text output.

This becomes especially valuable for:

- Elasticsearch ingestion
- Loki pipelines
- OpenSearch infrastructure
- Datadog integration
- CloudWatch aggregation
- distributed telemetry systems
- centralized observability platforms

The runtime event structure remains stable regardless of transport destination.

## Production-oriented observability

In smaller systems, formatted console output is often sufficient during development.

In production environments, structured JSON logging significantly improves:

```text
traceability
runtime correlation
incident investigation
distributed debugging
operational analytics
```

because execution continuity remains preserved across asynchronous and distributed runtime boundaries.

Rather than treating logs as isolated text messages, JSON logging allows runtime activity to become part of a broader operational telemetry system.

## Summary

JSON logging transforms runtime events into structured operational data.

Instead of formatting logs purely for human readability, Ambiten Logger preserves execution metadata as normalized runtime objects capable of flowing through distributed observability infrastructure, transport pipelines, centralized ingestion systems, and runtime-aware execution environments without losing operational context.
