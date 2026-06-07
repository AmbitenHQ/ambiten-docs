# Buffered Transport

The buffered transport is designed to reduce delivery pressure by temporarily accumulating runtime events before forwarding them to an underlying transport.

Instead of executing a transport write for every individual log, the buffered transport groups runtime entries together and flushes them in controlled intervals or batches. This reduces the overhead associated with filesystem operations, compression, remote delivery, or expensive observability pipelines.

A buffered transport wraps another transport internally.

```ts
import {
  BufferedTransporter,
  createFileTransporter
} from '@ambiten/logger';

const transport = new BufferedTransporter(
  createFileTransporter('./logs/runtime.log')
);
```

When a runtime event is written, it enters an in-memory buffer first.

```ts
await transport.write({
  level: 'info',
  message: 'Order processed'
});
```

The underlying transport is not required to execute immediately. The buffered layer controls delivery cadence so application execution is not tightly coupled to every downstream write.

Conceptually:

```text
Application Runtime
        ↓
Buffered Transport
        ↓
Underlying Transport
```

## Flush behavior

Buffered transports flush pending runtime events when the configured delivery conditions are met.

```text
flush size threshold reached
flush interval expires
manual flush triggered
```

This behavior significantly reduces the number of transport operations under sustained throughput.

Flush behavior can be configured explicitly.

```ts
const transport = new BufferedTransporter(
  createFileTransporter('./logs/runtime.log'),
  {
    flushSize: 20,
    flushInterval: 5000
  }
);
```

n this configuration, runtime events are flushed after twenty entries accumulate or after five seconds pass, whichever occurs first.

The application continues emitting logs normally while the buffering layer controls when delivery occurs downstream.

## Reducing transport pressure

Buffering is especially useful for transports that interact with slower or more expensive infrastructure.

```text
filesystem writes
compressed rotating files
remote ingestion APIs
network-based observability systems
high-throughput delivery pipelines
```

Without buffering, high-volume applications may spend unnecessary time executing repeated transport writes.

Buffering smooths that pressure by grouping delivery into fewer downstream operations.

Conceptually:

```PlainText
Many Runtime Events
        ↓
Fewer Transport Writes
        ↓
Lower Delivery Pressure
```

This becomes increasingly important in production systems where logging volume may rise significantly during incident conditions, traffic spikes, or background processing bursts.

## Composition with file rotation

The buffered transport integrates naturally with rotating file transports.

```ts
const transport = new BufferedTransporter(
  createRotatingFileTransporter({
    filename: './logs/runtime.log'
  }),
  {
    flushSize: 50,
    flushInterval: 3000
  }
);
```

This combination allows runtime events to be persisted efficiently while still supporting rotation, compression, retention behavior, and archive management.

The buffering layer controls delivery cadence. The rotating file transport manages persistence and lifecycle behavior.

Conceptually:

```text
Runtime Events
        ↓
Buffered Delivery
        ↓
Rotating File Persistence
```

Each layer remains focused on one operational responsibility.

## Runtime lifecycle

Because buffering introduces temporary in-memory storage, graceful shutdown behavior is important.

Pending runtime events should be flushed before the process exits.

```ts
await transport.flush();
await transport.stop();
```

This helps ensure buffered entries are persisted or delivered before the runtime terminates.

Graceful flushing is especially important in workers, containerized deployments, serverless runtimes, and background processors where process shutdown may happen quickly.

## Relationship with async batching

Buffered transports and async batch transports are related but not identical.

Buffered transports primarily reduce pressure on an underlying transport by controlling write cadence.

Async batch transports are usually oriented toward remote delivery, where multiple structured runtime events are grouped into an asynchronous payload and sent to external infrastructure.

Conceptually:

```text
Buffered Transport → controls local delivery cadence
Async Batch        → groups events for remote async delivery
```

Both improve runtime efficiency, but they solve slightly different delivery problems.

## Summary

The buffered transport is an optimization layer for controlling delivery pressure.

It temporarily accumulates runtime events, flushes them according to size or time rules, reduces repeated downstream writes, composes cleanly with file and remote transports, and helps preserve runtime efficiency without changing application logging behavior.
