# Overview

Transports control where runtime events are delivered after they leave the logging pipeline.

Ambiten Logger intentionally separates runtime event generation from transport delivery so applications remain independent from any single observability backend or infrastructure provider.

The runtime produces structured runtime entries. Transports decide how those entries are persisted, buffered, streamed, batched, rotated, or forwarded into external observability systems.

Conceptually:

```text
Application Runtime
        ↓
Structured Runtime Events
        ↓
Transport Pipeline
        ↓
Observability Infrastructure
```

This separation allows observability infrastructure to evolve independently from application logging behavior.

## Transport composition

A logger may use a single transport or many simultaneously.

```ts
const logger = createLogger({
  transports: [
    consoleTransport(),
    createRotatingFileTransporter({
      filename: './logs/runtime.log'
    })
  ]
});
```

Because every transport shares the same runtime contract, transports remain fully composable regardless of whether they target:

```text
console output
filesystem persistence
remote ingestion
batch pipelines
distributed observability systems
```

Each transport focuses on one operational responsibility while participating in the same structured runtime pipeline.

## Console visibility

The simplest transport is the console transport.

```ts
import {
  createLogger,
  consoleTransport
} from '@ambiten/logger';

const logger = createLogger({
  transports: [
    consoleTransport()
  ]
});
```

The console transport is primarily intended for development environments where immediate runtime visibility matters more than persistence or centralized observability.

Conceptually:

```text
Runtime Events
        ↓
Console Formatting
        ↓
Terminal Visibility
```

It provides fast operational feedback during active execution while still preserving structured runtime entries internally.

## Filesystem persistence

File transports persist runtime events directly to disk.

```ts
import {
  createFileTransporter
} from '@ambiten/logger';

createFileTransporter('./logs/app.log');
```

Filesystem persistence allows runtime history to survive process restarts, deployments, infrastructure recycling, and runtime failures.

For production environments, rotating file transports are generally preferred because they automatically manage archive lifecycle and retention behavior.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  frequency: 'daily',
  compress: true
});
```

Conceptually:

```text
Runtime Events
        ↓
Rotating File Pipeline
        ↓
Persistent Operational History
```

The rotating transport can also buffer writes internally to reduce filesystem pressure under sustained throughput.

## Buffered and async delivery

For high-throughput systems, buffering and asynchronous batching significantly reduce runtime delivery overhead.

```ts
new AsyncBatchTransporter({
  batchSize: 50,
  flushInterval: 5000,
  sendBatch: async (entries) => {
    // send logs to remote ingestion layer
  }
});
```

Instead of executing a transport operation for every runtime event individually, the pipeline temporarily accumulates events and flushes them together.

Conceptually:

```text
Runtime Events
        ↓
Batch Aggregation
        ↓
Controlled Delivery
```

This improves throughput while reducing network, filesystem, and ingestion pressure across distributed systems.

## Remote observability delivery

Remote transports allow runtime telemetry to move directly into centralized observability infrastructure.

```ts
createHttpTransport(
  'https://logs.example.com/ingest'
);
```

Ambiten Logger also includes dedicated transports for observability platforms such as Elasticsearch and Loki.

```ts
createElasticTransport(
  'http://localhost:9200',
  'ambiten-runtime'
);
```

```ts
createLokiTransport(
  'http://localhost:3100/loki/api/v1/push',
  {
    service: 'ambiten-runtime'
  }
);
```

Conceptually:

```text
Structured Runtime Events
        ↓
Remote Transport
        ↓
Centralized Observability
```

This allows runtime behavior to remain searchable, queryable, and operationally correlated across distributed infrastructure.

## Runtime resilience

Remote observability infrastructure can become unstable.

Network failures, ingestion pressure, unavailable endpoints, authentication issues, or backend outages should never destabilize application execution.

Remote transports can therefore be wrapped with resilience protection.

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
Remote Infrastructure
```

Retry handling and circuit breaker protection isolate transport instability from the runtime itself.

The application continues executing while the observability pipeline manages recovery independently.

## Custom transports

The transport layer is fully extensible.

Any object implementing the transport contract can participate directly in the runtime pipeline.

```ts
const customTransport = {
  async write(entry, formatted) {
    // custom delivery logic
  }
};
```

Because transports receive normalized runtime entries internally, custom implementations automatically inherit:

```text
structured metadata
runtime context
timestamps
severity levels
execution state
tenant information
```

without requiring additional parsing or runtime reconstruction.

Conceptually:

```text
Structured Runtime Events
        ↓
Custom Transport Logic
        ↓
Specialized Delivery Pipeline
```

This allows organizations to integrate Ambiten Logger into proprietary observability infrastructure or internal telemetry systems without changing application logging behavior.

## Transport independence

The transport architecture is intentionally designed around operational independence.

Applications should not become tightly coupled to a specific observability vendor, ingestion strategy, or storage backend.

Conceptually:

```text
Application Logging Logic
        ↓
Stable Runtime Pipeline
        ↓
Evolving Observability Infrastructure
```

The logging API remains stable even as transport infrastructure evolves over time.

A system may begin with console logging, later adopt rotating files, and eventually migrate into distributed telemetry pipelines without rewriting runtime logging behavior.

## Summary

The transport layer in Ambiten Logger controls how structured runtime events are delivered after leaving the logging pipeline.

Console transports provide runtime visibility, filesystem transports provide persistence, batching and buffering improve throughput efficiency, remote transports integrate with centralized observability systems, resilience layers isolate infrastructure instability, and custom transports allow specialized delivery pipelines while preserving the same structured runtime architecture throughout the entire observability lifecycle.
