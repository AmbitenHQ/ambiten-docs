# Rolling File Transport

The rolling file transport is designed for long-running systems where runtime telemetry must persist continuously without allowing individual log files to grow without operational limits.

Instead of writing indefinitely into a single static file, the transport automatically rotates active files based on time intervals or size thresholds while optionally compressing archived logs and enforcing retention cleanup policies.

```ts
import {
  createRotatingFileTransporter
} from '@ambiten/logger';

const transport = createRotatingFileTransporter({
  filename: './logs/runtime.log'
});
```

As runtime events accumulate, the transport monitors the active stream and determines when rotation should occur.

Conceptually:

```text
Structured Runtime Events
        ↓
Active Log Stream
        ↓
Rotation Decision
        ↓
Archive Lifecycle
```

The application continues executing while the transport independently manages file streams, archive creation, compression, and retention behavior.

## Time-based rotation

Time-based rotation is useful when operational retention should align with predictable time boundaries.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  frequency: 'daily'
});
```

In this configuration, a new active file is created every day while previous files are archived automatically.

Hourly rotation is also supported.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  frequency: 'hourly'
});
```

Conceptually:

```text
Time Boundary Reached
        ↓
Current Stream Closed
        ↓
Archive Created
        ↓
New Active Stream Opened
```

Time-based rotation provides predictable operational organization and simplifies long-term retention management.

## Size-based rotation

Size-based rotation is useful when runtime throughput fluctuates significantly.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  maxSize: 10 * 1024 * 1024
});
```

Once the active file exceeds the configured threshold, the transport automatically closes the current stream, archives the file, and creates a new active stream.

Conceptually:

```text
Active File Exceeds Threshold
        ↓
Rotation Triggered
        ↓
Archive Persisted
        ↓
Fresh Stream Created
```

This prevents uncontrolled filesystem growth under sustained logging pressure.

## Compression and archival storage

Archived files can also be compressed automatically.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  compress: true
});
```

Compression significantly reduces storage consumption in systems generating large volumes of runtime telemetry continuously.

Conceptually:

```text
Archived Log File
        ↓
Compression Pipeline
        ↓
Reduced Storage Footprint
```

Compression becomes especially valuable in long-running production environments where operational retention spans weeks or months.

## Retention management

Retention behavior is controlled through archive limits.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  backupCount: 7
});
```

When the number of archived files exceeds the configured limit, older archives are removed automatically.

Conceptually:

```text
New Archive Created
        ↓
Retention Limit Evaluated
        ↓
Oldest Archive Removed
```

This allows operational retention policies to remain predictable while preventing indefinite filesystem growth.

## Buffered filesystem writes

Internally, the rolling transport uses buffered writes and asynchronous flushing to reduce filesystem pressure during sustained throughput.

Conceptually:

```text
Application Runtime
        ↓
Buffered Writes
        ↓
Rolling Transport
        ↓
Filesystem
```

The buffering layer helps decouple runtime execution from filesystem latency while still preserving operational telemetry safely.

This becomes especially important in environments generating high-frequency runtime activity continuously.

## Structured JSON archives

The rolling transport integrates naturally with structured JSON logging.

```ts
const logger = createLogger({
  json: true,
  transports: [
    createRotatingFileTransporter({
      filename: './logs/runtime.json.log',
      compress: true
    })
  ]
});
```

Structured archive files are commonly consumed by:

```text
Fluent Bit
Vector
Filebeat
Promtail
centralized ingestion pipelines
cloud telemetry systems
```

which continuously ingest rotated archives into Elasticsearch, Loki, OpenSearch, or broader observability infrastructure.

Conceptually:

```text
Structured Runtime Archives
        ↓
Log Shipper
        ↓
Centralized Observability
```

This allows rolling files to participate naturally in distributed telemetry architectures.

## Runtime lifecycle management

Rolling transports maintain internal streams, buffers, and flush timers throughout runtime execution.

Graceful shutdown handling is therefore important.

```ts
await logger.shutdown();
```

Conceptually:

```text
Pending Buffers
        ↓
Flush Operations
        ↓
Stream Closure
        ↓
Safe Shutdown
```

This ensures buffered runtime events are persisted correctly before process termination.

Graceful shutdown behavior becomes especially important in:

```text
containerized systems
background workers
distributed runtimes
production deployments
serverless environments
```

where abrupt process termination can otherwise lead to telemetry loss.

## Operational retention

The rolling file transport exists to provide predictable operational retention while preserving runtime efficiency under continuous logging workloads.

Conceptually:

```text
Continuous Runtime Telemetry
        ↓
Controlled Rotation
        ↓
Managed Retention
        ↓
Long-Term Operational Visibility
```

This allows systems to maintain durable runtime history without allowing observability storage to grow uncontrollably over time.

## Summary

The rolling file transport continuously persists structured runtime telemetry while automatically managing archive rotation, compression, retention cleanup, buffered writes, and filesystem lifecycle behavior.

It is designed for long-running production systems where operational history, predictable retention, runtime performance, and centralized observability integration must coexist safely under sustained logging throughput.