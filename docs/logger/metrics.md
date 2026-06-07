# Metrics

Ambiten Logger includes lightweight metrics for understanding how the logging pipeline behaves at runtime.

Metrics are not application logs. They describe the logger itself: how many entries passed through the pipeline, how often buffers flushed, how often files rotated, and whether transports are under pressure.

This is useful in production because logging infrastructure can become a performance bottleneck if it is not observed. A service may appear healthy while its log pipeline is silently dropping entries, retrying remote delivery too often, or flushing more frequently than expected.

Metrics tracking can be enabled when creating a logger.

```ts
const logger = createLogger({
  enableMetrics: {
    enabled: true,
    logInterval: 60_000
  }
});
```

Internally, transports can report activity to the metrics tracker as logs are written, buffers are flushed, files are rotated, or transport errors occur.

```ts
const metrics = new MetricsTracker({
  enabled: true,
  interval: 60_000
});

metrics.trackLog();
metrics.trackFlush();
metrics.trackRotation();

const snapshot = metrics.getSnapshot();
```

A metrics snapshot may look like this:

```JSON
{
  "totalLogs": 4200,
  "flushedBuffers": 84,
  "rotations": 2,
  "transportErrors": 0,
  "droppedLogs": 0,
  "logsPerInterval": 380,
  "startedAt": "2026-05-14T14:12:00.000Z",
  "lastSnapshotAt": "2026-05-14T14:13:00.000Z"
}
```

These values help teams understand whether the logger is operating normally under real workload conditions.

A rising number of transport errors may indicate network instability or an overloaded remote logging backend. Frequent flushes may suggest that batch sizes are too small. Dropped logs may indicate that a buffer is under sustained pressure and needs a different batching strategy. File rotations can reveal whether log volume is growing faster than expected.

Metrics should remain lightweight and should not replace a dedicated observability platform. Their purpose is to expose the health of the logging pipeline itself so operators can tune transports, batch sizes, retention behavior, and remote delivery settings more confidently.

In test environments, metrics timers should usually remain disabled to prevent open handles and noisy output. In production, metrics are most useful when connected to existing monitoring systems or reported through a custom metrics reporter rather than printed directly to the console.

```text
dropping runtime events
retrying remote delivery excessively
flushing too frequently
rotating files aggressively
buffering inefficiently
experiencing transport instability
```

Without metrics visibility, those operational issues can remain hidden until runtime diagnostics are needed during an incident.

## Enabling metrics

Metrics tracking can be enabled directly when creating the logger.

```ts
const logger = createLogger({
  enableMetrics: {
    enabled: true,
    logInterval: 60_000
  }
});
```

Once enabled, the logger begins collecting lightweight operational telemetry about the behavior of the logging pipeline itself.

Conceptually:

```text
Runtime Events
        ↓
Logger Pipeline
        ↓
Operational Metrics
```

Metrics collection operates independently from the primary execution path so runtime overhead remains minimal.

## Metrics tracking lifecycle

Internally, transports and pipeline stages can report activity directly to the metrics tracker as runtime events move through the system.

```ts
const metrics = new MetricsTracker({
  enabled: true,
  interval: 60_000
});

metrics.trackLog();
metrics.trackFlush();
metrics.trackRotation();

const snapshot = metrics.getSnapshot();
```

A metrics snapshot may resemble the following structure:

```JSON
{
  "totalLogs": 4200,
  "flushedBuffers": 84,
  "rotations": 2,
  "transportErrors": 0,
  "droppedLogs": 0,
  "logsPerInterval": 380,
  "startedAt": "2026-05-14T14:12:00.000Z",
  "lastSnapshotAt": "2026-05-14T14:13:00.000Z"
}
```

These values help operators understand whether the logging infrastructure is behaving normally under real production workload conditions.

## Understanding runtime behavior

Metrics provide visibility into how the observability pipeline behaves operationally over time.

A rising number of transport errors may indicate unstable network conditions, failing ingestion infrastructure, or overloaded observability backends.

Frequent flush activity may suggest that batch sizes are too small or that runtime throughput is higher than expected.

Dropped runtime events may indicate sustained buffer pressure or insufficient transport throughput during peak execution periods.

File rotation frequency can reveal that runtime event volume is growing more aggressively than anticipated.

Conceptually:

```text
Runtime Throughput
        ↓
Metrics Activity
        ↓
Operational Visibility
```

Metrics therefore help teams tune batching behavior, transport strategies, retention policies, buffering systems, and remote delivery infrastructure more confidently.

## Relationship with transports

Metrics tracking integrates directly into the transport pipeline.

As runtime events move through buffering, batching, flushing, retries, rotations, or remote delivery stages, transports can emit operational telemetry describing their own behavior.

Conceptually:

```text
Transport Activity
        ↓
Metrics Tracker
        ↓
Operational Snapshot
```

This allows the logging infrastructure itself to become observable rather than behaving as a black-box dependency.

Because the metrics system operates independently from transport destinations, metrics collection remains stable regardless of whether runtime events are delivered to console output, rotating files, Elasticsearch, Loki, HTTP pipelines, or distributed observability infrastructure.

## Metrics and production observability

Metrics are intentionally lightweight.

Their purpose is not to replace a dedicated monitoring or telemetry platform, but rather to expose the operational health of the logging pipeline itself.

In production environments, metrics are most valuable when exported into broader observability systems or routed through a custom metrics reporter rather than printed directly to the console.

This allows runtime logging behavior to become part of the broader operational telemetry surface alongside application metrics, infrastructure monitoring, and distributed tracing systems.

## Runtime overhead considerations

Metrics collection is designed to avoid introducing significant execution overhead.

Tracking occurs outside the critical execution path wherever possible so logging infrastructure remains operationally lightweight even under sustained throughput.

The metrics system focuses on operational visibility rather than deep analytical computation.

Conceptually:

```text
Application Execution
        ↓
Logger Pipeline
        ↓
Lightweight Metrics Collection
```

This separation allows production systems to observe runtime logging behavior without tightly coupling application execution to metrics processing.

## Test environment considerations

In test environments, metrics timers should generally remain disabled.

Long-running metrics intervals can create open handles, noisy output, and unstable test shutdown behavior when execution environments terminate rapidly.

Production systems, however, benefit significantly from metrics visibility because transport bottlenecks, flush behavior, retry pressure, and dropped runtime events become observable before they escalate into operational incidents.

## Relationship with runtime resilience

Metrics also support the resilience model of the logger itself.

Operational telemetry makes it possible to observe:

```text
retry pressure
transport instability
flush frequency
buffer saturation
rotation growth
delivery bottlenecks
```

before those conditions begin affecting broader runtime behavior.

This allows operators to tune resilience policies and transport infrastructure proactively rather than reactively.

## Summary

Ambiten Logger metrics provide lightweight operational visibility into the behavior of the logging pipeline itself.

Rather than tracking application execution, the metrics system observes transport activity, buffering behavior, batching throughput, flush frequency, rotations, delivery pressure, and transport failures so teams can understand how their observability infrastructure behaves under real runtime conditions without introducing significant execution overhead.