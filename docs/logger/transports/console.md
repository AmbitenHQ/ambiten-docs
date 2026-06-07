# Console Transport

The console transport is the simplest transport in Ambiten Logger and is primarily intended for local development, active debugging, runtime visibility, and immediate operational feedback during execution.

Although the output appears as console text, the transport still participates in the same structured runtime pipeline used by every other transport in the system.

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

When a runtime event is emitted, the transport formats the structured runtime entry into a console-friendly representation before writing it to the process output stream.

```ts
logger.info('Server started');
```

Example output:

```sh
[2026-05-14T15:10:02.112Z] - [INFO] Server started
```

Conceptually:

```text
Structured Runtime Event
        ↓
Console Formatting
        ↓
Terminal Output
```

The runtime event remains structured internally even though the final output appears human-readable.

## Colorized runtime visibility

The console transport supports optional colorized output to improve readability during active development sessions

```ts
consoleTransport(true);
```

Severity levels become visually distinguishable through terminal colors so warnings, errors, traces, and informational runtime events remain easier to identify during debugging.

Conceptually:

```text
info    → informational visibility
warn    → highlighted caution
error   → critical visibility
trace   → low-level runtime flow
```

Colorization can also be disabled explicitly.

```ts
consoleTransport(false);
```

This is useful in environments where ANSI terminal colors may introduce formatting artifacts or interfere with downstream log collection systems.

## Structured runtime metadata

The console transport integrates naturally with structured runtime metadata.

```ts
logger.warn('Rate limit threshold reached', {
  tenantId: 'tenant-eu',
  activeRequests: 120
});
```

Because the transport operates on normalized runtime entries internally, structured metadata remains preserved throughout the formatting process.

The transport simply controls presentation. It does not flatten or destroy runtime structure.

Conceptually:

```text
Runtime Metadata
        ↓
Structured Runtime Event
        ↓
Console Presentation
```

This allows development-oriented console visibility while still preserving operational structure internally.

## JSON console output

When JSON logging is enabled, the console transport emits serialized structured runtime entries instead of formatted text output.

```ts
const logger = createLogger({
  json: true,
  transports: [
    consoleTransport()
  ]
});
```

Example output:

```JSON
{
  "timestamp": "2026-05-14T15:14:01.442Z",
  "level": "warn",
  "message": "Rate limit threshold reached",
  "meta": {
    "tenantId": "tenant-eu",
    "activeRequests": 120
  }
}
```

This allows console output to participate directly in structured observability workflows while still remaining immediately visible during execution.

The runtime event structure remains unchanged regardless of formatting mode.

## Context-aware console logging

Because the transport operates on normalized runtime entries, context-aware metadata inherited from AmbitenContext remains preserved automatically.

```JSON
{
  "requestId": "req_82AB",
  "tenantId": "tenant-us"
}
```

This allows developers to observe runtime continuity directly from terminal output during development, debugging, transactional execution, or request tracing.

Conceptually:

```text
Execution Context
        ↓
Structured Runtime Event
        ↓
Console Visibility
```

Operational metadata remains attached automatically throughout execution flow.

## Relationship with production observability

Although console logging is extremely useful during development, it is generally insufficient as the sole production transport in larger systems.

Console streams alone typically do not provide:

```text
persistent storage
retention management
delivery guarantees
batching
compression
remote ingestion
resilience handling
```

depending on the runtime environment and deployment model.

Production systems therefore commonly combine console visibility with persistent or remote transports.

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

Conceptually:

```text
Console Transport → immediate runtime visibility
Persistent Transport → operational retention
Remote Transport → centralized observability
```

Each transport serves a different operational responsibility.

## Runtime-oriented development visibility

The console transport exists primarily as a runtime visibility layer for developers and operators during active execution.

It allows runtime activity to remain immediately observable while the broader transport system handles persistence, buffering, batching, resilience, retention, and remote observability integration downstream.

The transport is intentionally lightweight because its primary purpose is fast runtime visibility rather than long-term telemetry management.

## Summary

The console transport provides immediate runtime visibility through formatted terminal output while still participating fully in Ambiten Logger’s structured runtime pipeline.

Structured runtime events remain normalized internally, contextual execution metadata propagates automatically, JSON output remains supported, and console visibility integrates naturally alongside persistent and remote observability transports without changing application logging behavior.
