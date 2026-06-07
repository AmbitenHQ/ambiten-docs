# Integration

Ambiten Logger is designed to integrate naturally into the broader Ambiten runtime ecosystem while remaining framework-agnostic, transport-independent, and operationally decoupled from any single infrastructure vendor.

The logger can operate inside APIs, workers, GraphQL systems, background processors, queues, serverless runtimes, distributed execution pipelines, and standard Node.js applications without depending on a specific framework or transport implementation.

At the runtime level, the logger integrates directly with `AmbitenContext`.

Whenever execution enters the runtime boundary, contextual execution metadata becomes available automatically to every log emitted during that lifecycle.

```ts
AmbitenContext.run(
  {
    tenantId: 'tenant-eu',
    requestId: 'req_82AB'
  },
  async () => {
    logger.info('Processing request');
  }
);
```

This allows execution continuity to remain visible across middleware, repositories, transactional flows, adapters, asynchronous operations, database execution, and background workloads without manually passing identifiers throughout the application.

Conceptually:

```PlainText
Execution Context
        ↓
Runtime Execution
        ↓
Context-Aware Logging
```

The logger consumes runtime state automatically whenever an active execution context exists.

## Adapter integration

The logger integrates naturally with Ambiten adapters.

Inside Express, Fastify, NestJS, GraphQL, Lambda, or other adapter boundaries, request-scoped execution context can be initialized automatically at the beginning of the execution lifecycle.

Logs generated anywhere downstream then inherit the same runtime state automatically.

```text
Incoming Request
        ↓
Adapter Context Initialization
        ↓
AmbitenContext Active
        ↓
Application Execution
        ↓
Context-Aware Logging
```

This becomes especially valuable in distributed and multi-tenant systems where operational visibility must remain correlated across shared infrastructure boundaries.

The logger itself remains framework-independent while adapters establish the execution boundaries that make runtime-aware observability possible.

## Model and runtime instrumentation integration

Ambiten Logger also integrates naturally with model operations and runtime instrumentation systems.

Database operations, middleware execution, runtime events, topology changes, transactional activity, cache operations, and execution pipelines can all emit structured runtime events while preserving execution correlation automatically.

```ts
logger.info('Executing query', {
  collection: 'orders'
});
```

When operating inside an active execution context, emitted runtime events may automatically inherit contextual metadata such as:

```JSON
{
  "tenantId": "tenant-us",
  "requestId": "req_1002",
  "dbName": "commerce"
}
```

This allows infrastructure-level runtime activity to remain operationally traceable without tightly coupling instrumentation logic to application code.

## Remote observability integration

Integration is not limited to the Ambiten runtime ecosystem itself.

The logger also participates naturally in external observability pipelines through remote transports and structured runtime event delivery.

```ts
const logger = createLogger({
  transports: [
    createElasticTransport(
      'http://localhost:9200',
      'ambiten-runtime'
    )
  ]
});
```

Because transports operate on normalized runtime entries, integrations with Elasticsearch, Loki, OpenSearch, Datadog, CloudWatch, custom telemetry gateways, or distributed ingestion systems remain operationally straightforward.

Conceptually:

```text
Runtime Event
        ↓
Transport Pipeline
        ↓
Observability Infrastructure
```

The runtime event structure remains stable regardless of where telemetry is eventually delivered.

## Worker and background execution integration

The logger also integrates naturally with workers and background execution pipelines where runtime activity may continue outside the lifecycle of an incoming HTTP request.

```ts
queue.process(async (job) => {
  logger.info('Processing background task', {
    jobId: job.id
  });
});
```

This allows asynchronous runtime execution to remain observable even when processing occurs independently from request-bound execution flows.

Context propagation may still be established manually or through runtime orchestration layers when background execution requires operational continuity with upstream systems.

## Multi-tenant operational visibility

In multi-tenant systems, runtime observability must remain isolated, queryable, and operationally traceable across tenants sharing the same infrastructure.

Because tenant metadata propagates automatically through the runtime context system, observability infrastructure can correlate execution behavior directly by tenant, request, database, collection, or runtime operation.

Conceptually:

```text
Tenant Execution
        ↓
Runtime Context
        ↓
Structured Runtime Event
        ↓
Tenant-aware Observability
```

This allows shared infrastructure to remain operationally transparent without sacrificing tenant-level traceability.

## Distributed execution continuity

Modern runtime systems rarely execute entirely inside a single synchronous request lifecycle.

Execution frequently crosses:

```text
middleware
transactions
queues
workers
GraphQL resolvers
async pipelines
distributed services
background tasks
```

The logger therefore focuses on preserving execution continuity across infrastructure boundaries rather than simply recording isolated output messages.

Context propagation, structured runtime events, transport composability, and operational metadata preservation work together to maintain observability continuity across distributed execution environments.

## Integration philosophy

The integration philosophy behind Ambiten Logger is intentionally simple:

```text
Logging should move with the runtime itself.
```

The logger is not tied to a specific framework, transport vendor, storage backend, or observability platform.

Instead, it integrates into execution flow at the runtime layer while remaining operationally portable across infrastructure environments.

## Summary

Ambiten Logger integrates directly into runtime execution rather than attaching itself to a specific framework or infrastructure vendor.

Execution context propagates automatically through `AmbitenContext`, adapters establish runtime boundaries, transports deliver structured telemetry downstream, and runtime events remain operationally correlated across middleware, transactions, asynchronous execution, distributed infrastructure, and multi-tenant systems without tightly coupling observability behavior to application logic.
