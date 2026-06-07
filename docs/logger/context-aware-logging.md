# Context Awareness

Context awareness is the capability that transforms Ambiten Logger from a message utility into a runtime observability layer.

Traditional logging systems often record messages in isolation. Once execution moves across middleware, repositories, adapters, asynchronous operations, transactions, workers, or distributed infrastructure boundaries, logs frequently lose the operational continuity required to understand how execution actually moved through the system.

Ambiten Logger preserves that continuity automatically.

The logger integrates directly with the Ambiten runtime context system. When execution enters the runtime boundary, operational state becomes available through `AmbitenContext`. Any log generated during that execution lifecycle can then inherit the active runtime context automatically without manually passing metadata through every layer.

```ts
logger.info('Fetching order');
```

Even though no metadata was attached explicitly, the resulting runtime event may automatically contain contextual execution information.

```JSON
{
  "timestamp": "2026-05-14T13:41:10.201Z",
  "level": "info",
  "message": "Fetching order",
  "context": {
    "requestId": "req_91AB2",
    "tenantId": "tenant-eu",
    "dbName": "commerce",
    "collectionName": "orders"
  }
}
```

This allows execution state to remain traceable across the full runtime lifecycle.

A request may begin inside an HTTP adapter, move through middleware, enter transactional execution, trigger repository operations, invoke asynchronous workflows, and eventually emit infrastructure events.

Context-aware logging preserves continuity across that entire flow.

```PlainText
Request
   ↓
Middleware
   ↓
Service Layer
   ↓
Repository
   ↓
Database Operation
   ↓
Background Task
```

Without runtime-aware context propagation, every layer would need to manually attach identifiers such as request IDs, tenant information, databases, transaction metadata, or execution state.

That approach becomes increasingly fragile as systems grow operationally complex, especially when execution crosses asynchronous or distributed runtime boundaries.

With Ambiten Logger, context propagation occurs at the runtime layer rather than the application layer.

## Runtime-propagated execution state

When execution context exists, the logger can automatically preserve operational state such as:

```text
requestId
tenantId
dbName
collectionName
operation
transaction state
runtime metadata
execution source
```

The logger does not need to know how execution originated. It simply consumes the active runtime context whenever one exists.

Conceptually:

```text
Execution Context
        ↓
Logger
        ↓
Contextual Runtime Event
```

This allows runtime activity generated deep inside repositories, middleware, services, transactional flows, adapters, or GraphQL execution pipelines to remain operationally correlated automatically.

## Runtime context execution

Execution context is established through `AmbitenContext`.

```ts
AmbitenContext.run(
  {
    tenantId: 'tenant-eu',
    requestId: 'req_821'
  },
  async () => {
    logger.info('Processing checkout');
  }
);
```

Any runtime event emitted during that execution lifecycle can automatically inherit the active contextual state.

The application does not need to repeatedly attach operational identifiers to every logging call.

This significantly reduces logging friction while improving runtime traceability.

## Multi-tenant observability

Context awareness becomes especially important in multi-tenant systems.

When multiple tenants share infrastructure, operational visibility must remain isolated, queryable, and traceable without leaking execution state across tenants.

Because tenant metadata propagates automatically into runtime events, observability systems can correlate runtime behavior directly by tenant, request, database, or execution flow.

Conceptually:

```text
Tenant Execution
        ↓
Context Propagation
        ↓
Structured Runtime Event
        ↓
Tenant-aware Observability
```

This allows production systems to preserve operational isolation even inside shared runtime infrastructure.

## Distributed execution continuity

Modern systems rarely execute inside a single synchronous request flow.

Execution may cross:

```text
middleware
transactions
queues
workers
background tasks
GraphQL resolvers
async pipelines
distributed services
```

Context-aware logging preserves operational continuity across those boundaries without requiring repetitive manual metadata propagation throughout the application.

The logger therefore behaves less like a console wrapper and more like an execution-aware telemetry layer.

## Queryable operational metadata

Because contextual runtime fields remain structured internally, observability systems can query execution metadata directly after transport serialization.

Logs may therefore be filtered or correlated by:

```text
tenant
request
transaction
database
collection
execution flow
runtime operation
```

inside centralized telemetry infrastructure such as Elasticsearch, Loki, OpenSearch, Datadog, or distributed observability pipelines.

The runtime context remains preserved even after transport delivery.

## Relationship with transports

Context awareness operates independently from transport infrastructure.

```text
Execution Context → Logger → Structured Runtime Event → Transport Pipeline
```

The logger enriches runtime events first. Transports simply deliver the resulting structured payloads downstream.

This separation allows operational metadata to remain stable regardless of where runtime events are eventually delivered.

## Summary

Context awareness allows Ambiten Logger to preserve execution continuity automatically across runtime boundaries.

Rather than manually attaching operational identifiers throughout the application, the logger consumes the active execution context directly from the runtime layer. This allows runtime events to remain correlated, queryable, and operationally traceable across middleware, repositories, transactions, asynchronous workflows, distributed infrastructure, and multi-tenant execution environments.
