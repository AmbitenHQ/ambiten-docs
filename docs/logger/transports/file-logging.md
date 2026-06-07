# File Logging

File logging allows runtime activity to persist beyond the lifecycle of the active process.

Unlike console output, filesystem-based logging preserves operational history across restarts, deployments, crashes, container recycling, and infrastructure failures. This makes file logging an important part of long-term runtime observability and operational diagnostics.

Ambiten Logger provides file-based transports that write structured runtime entries directly to the filesystem while preserving the same runtime pipeline used by console and remote transports.

A basic file transport can be created using `createFileTransporter()`.

```ts
import {
  createLogger,
  createFileTransporter
} from '@ambiten/logger';

const logger = createLogger({
  transports: [
    createFileTransporter('./logs/runtime.log')
  ]
});

logger.info('Application started');
```

When runtime events are emitted, the transport appends them to the target file automatically.

If the target directory does not already exist, the transport creates it before writing begins.

Conceptually:

```text
Structured Runtime Event
        ↓
File Transport
        ↓
Persistent Filesystem Storage
```

The application continues executing normally while the transport handles persistence independently.

## Structured runtime persistence

File transports operate on the same structured runtime entries used internally throughout the logger pipeline.

Execution metadata, runtime context, request identifiers, tenants, collections, and operational fields remain preserved regardless of the output destination.

```ts
logger.error('Database connection failed', {
  database: 'commerce',
  retryAttempt: 2
});
```

Because the runtime pipeline remains structured internally, file logging preserves operational telemetry rather than flattening execution state into unstructured console text.

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Entry
        ↓
Persistent Log Record
```

This allows runtime continuity to remain observable even after process termination or infrastructure recycling.

## JSON file output

When JSON mode is enabled, filesystem output becomes machine-readable and suitable for downstream ingestion systems.

```ts
const logger = createLogger({
  json: true,
  transports: [
    createFileTransporter('./logs/runtime.log')
  ]
});
```

Structured JSON files integrate naturally with observability tooling such as:

```text
Fluent Bit
Vector
Filebeat
Promtail
centralized log shippers
cloud ingestion agents
```

which can then stream runtime telemetry into Elasticsearch, Loki, OpenSearch, or broader observability infrastructure.

Conceptually:

```text
Structured Runtime Events
        ↓
Filesystem Persistence
        ↓
Observability Shipper
        ↓
Centralized Telemetry Platform
```

This allows filesystem logging to participate cleanly in distributed observability architectures.

## Combining transports

File transports compose naturally with other transports.

Applications commonly combine console visibility with persistent filesystem logging so developers retain immediate runtime feedback while production systems preserve operational history.

```ts
import {
  createLogger,
  consoleTransport,
  createFileTransporter
} from '@Ambiten/logger';

const logger = createLogger({
  transports: [
    consoleTransport(),
    createFileTransporter('./logs/app.log')
  ]
});
```

Conceptually:

```text
Console Transport → runtime visibility
File Transport    → persistent retention
```

Each transport serves a distinct operational responsibility while sharing the same structured runtime pipeline.

Operational use cases

File logging is especially useful in environments where runtime persistence and operational retention are important.

```text
local development
persistent auditing
infrastructure debugging
long-running workers
background processors
container log retention
observability ingestion pipelines
```

Filesystem persistence allows operators to inspect runtime behavior even when centralized observability infrastructure is temporarily unavailable.

## Relationship with rotating files

For production systems with sustained log growth, rotating file transports are generally recommended instead of static file transports.

Continuous runtime activity can eventually produce extremely large log files if retention behavior is unmanaged.

Conceptually:

```text
Static File Logging
        ↓
Continuous Growth
        ↓
Filesystem Pressure
```

Rotating transports help manage:

```text
retention policies
compression
archive lifecycle
filesystem growth
long-term storage management
```

while preserving operational telemetry continuity.

Static file transports remain useful for smaller systems, local development, or lightweight operational environments where log growth remains manageable.

## Runtime-oriented persistence

The file transport exists to provide persistent runtime observability independent of terminal output.

Console visibility disappears when processes terminate. Persistent files remain available for operational diagnostics, incident analysis, deployment auditing, and telemetry ingestion long after execution completes.

Conceptually:

```text
Runtime Execution
        ↓
Structured Runtime Events
        ↓
Persistent Operational History
```

This transforms logging from temporary console visibility into durable runtime telemetry.

## Summary

File logging in Ambiten Logger persists structured runtime events directly to the filesystem while preserving execution metadata, runtime context, and operational continuity.

File transports integrate naturally with JSON pipelines, observability shippers, console transports, and distributed telemetry systems while providing durable runtime history across restarts, deployments, crashes, and infrastructure failures.
