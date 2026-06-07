# Rotating Files

Long-running systems continuously generate runtime telemetry.

Without rotation, log files eventually grow into unmanageable sizes that increase storage pressure, slow ingestion pipelines, complicate operational maintenance, and reduce long-term observability efficiency.

Ambiten Logger includes a rotating file transport designed specifically for production workloads where runtime telemetry must persist continuously while remaining operationally manageable over time.

The rotating transport automatically creates new log files based on configured time intervals or file size thresholds while optionally compressing historical archives and enforcing retention behavior.

```ts
import {
  createLogger,
  createRotatingFileTransporter
} from '@ambiten/logger';

const logger = createLogger({
  transports: [
    createRotatingFileTransporter({
      filename: './logs/runtime.log',
      frequency: 'daily'
    })
  ]
});
```

In this configuration, the runtime creates a new active log file every day while preserving previous files as historical archives.

Conceptually:

```text
Continuous Runtime Events
        ↓
Active Log Stream
        ↓
Daily Rotation
        ↓
Archived Runtime History
```

The runtime continues executing normally while the transport independently manages file lifecycle behavior.

## Time-based rotation

Time-based rotation is useful when operational retention should align with predictable scheduling boundaries.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  frequency: 'hourly'
});
```

Supported rotation intervals typically include hourly and daily scheduling strategies.

Conceptually:

```text
Time Boundary Reached
        ↓
Current Stream Archived
        ↓
New Active Stream Opened
```

Time-oriented rotation simplifies operational retention policies and long-term archive organization.

## Size-based rotation

Rotation can also occur when an active file exceeds a configured size threshold.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  maxSize: 10 * 1024 * 1024
});
```

Once the file grows beyond the configured limit, the transport rotates the active stream automatically and creates a fresh file for continued runtime telemetry.

Conceptually:

```text
Active File Exceeds Threshold
        ↓
Rotation Triggered
        ↓
Archive Created
        ↓
Fresh Stream Activated
```

Size-based rotation becomes especially valuable in systems where runtime throughput fluctuates unpredictably.

## Archive retention

Historical archives can be controlled through retention limits.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  backupCount: 7
});
```

This configuration keeps only the seven most recent archives while removing older files automatically.

Conceptually:

```text
New Archive Created
        ↓
Retention Policy Evaluated
        ↓
Oldest Archives Removed
```

Retention limits prevent indefinite filesystem growth while preserving recent operational history.

## Compression

Archived runtime logs can also be compressed automatically.

```ts
createRotatingFileTransporter({
  filename: './logs/runtime.log',
  compress: true
});
```

Compression significantly reduces storage consumption in systems generating large amounts of runtime telemetry continuously.

Conceptually:

```text
Archived Runtime Logs
        ↓
Compression Pipeline
        ↓
Reduced Storage Footprint
```

Compression becomes increasingly valuable in production systems retaining telemetry across long operational periods.

Buffered filesystem behavior

Internally, the rotating transport uses buffered and asynchronous write behavior to reduce filesystem pressure under sustained throughput.

Conceptually:

```text
Application Runtime
        ↓
Buffered Runtime Events
        ↓
Rotating File Pipeline
        ↓
Filesystem Persistence
```

Applications continue emitting runtime events normally while the transport independently manages:

- batching
- flushing
- stream rotation
- compression
- archive cleanup
- retention enforcement

This helps preserve runtime performance even under heavy logging workloads.

## Structured JSON archives

The rotating transport integrates naturally with structured JSON logging.

```ts
const logger = createLogger({
  json: true,
  transports: [
    createRotatingFileTransporter({
      filename: './logs/runtime.json.log',
      frequency: 'hourly',
      compress: true
    })
  ]
});
```

Structured JSON archives are especially useful for centralized observability systems where log shippers continuously ingest rotated files into platforms such as:

- Elasticsearch
- Loki
- OpenSearch
- cloud telemetry systems
- distributed observability pipelines

Conceptually:

```text
Structured Runtime Archives
        ↓
Log Shipper
        ↓
Centralized Observability
```

This allows rotating archives to participate cleanly in broader telemetry ecosystems.

## Operational continuity

Rotating files preserve runtime visibility across deployments, crashes, restarts, and operational incidents.

Unlike console-only output, filesystem archives provide durable operational history that remains available after execution ends.

Conceptually:

```text
Runtime Execution
        ↓
Continuous Telemetry
        ↓
Managed Historical Archives
```

This makes rotating archives especially valuable for:

```text
incident investigation
deployment diagnostics
operational auditing
runtime forensics
long-running workers
distributed systems
```

where historical telemetry continuity is operationally important.

## Production suitability

Rotating file transports are generally recommended for production systems because they provide predictable storage behavior while preserving historical runtime visibility safely over time.

Conceptually:

```text
Continuous Logging
        ↓
Controlled Rotation
        ↓
Predictable Storage Lifecycle
```

The transport allows systems to maintain durable observability without allowing telemetry storage to expand uncontrollably.

## Summary

Rotating files in Ambiten Logger provide continuous runtime persistence while automatically managing archive rotation, retention policies, compression, buffering, and filesystem lifecycle behavior.

They are designed for production workloads where operational history, runtime performance, predictable storage management, and centralized observability integration must coexist safely under sustained telemetry throughput.
