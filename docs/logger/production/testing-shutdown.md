# Testing & Shutdown

Testing and shutdown behavior are important because some logger transports maintain internal runtime resources while the application is executing.

Buffered transports, async batch pipelines, metrics trackers, rolling file transports, and remote delivery systems may keep timers, streams, pending buffers, or background tasks alive internally.

Conceptually:

```text
Runtime Execution
        ↓
Transport Resources
        ↓
Timers / Streams / Buffers
```

If those resources are not stopped correctly, they may continue running after tests complete or after the runtime itself begins shutting down.

## Open handle warnings

In test environments, lingering logger resources commonly appear as open handle warnings.

A typical Jest warning looks like this:

```bash
Jest has detected open handles potentially keeping Jest from exiting.
```

Conceptually:

```text
Background Resource
        ↓
Test Completes
        ↓
Resource Still Active
```

This usually means a transport interval, metrics timer, open file stream, or background flush loop remained active after the test lifecycle finished.

The logger itself is often not the problem. The underlying transport lifecycle is.

## Create loggers inside the test lifecycle

Logger instances should generally be created inside the test lifecycle rather than at module import time.

```ts
let logger: ReturnType<typeof createLogger>;

beforeEach(() => {
  logger = createLogger({
    level: 'info',
    transports: []
  });
});

afterEach(async () => {
  await logger.shutdown?.();
});
```

Conceptually:

```text
Test Starts
     ↓
Create Logger
     ↓
Run Test
     ↓
Shutdown Logger
     ↓
Test Ends
```

This keeps resource ownership aligned with the lifecycle of the test itself.

## Avoid eager transport initialization

Production transports should generally not start automatically inside modules shared by tests.

```ts
// Avoid this pattern in shared modules
export const logger = createLogger({
  transports: [
    createRotatingFileTransporter({
      filename: './logs/runtime.log'
    })
  ]
});
```

Conceptually:

```text
Module Import
      ↓
Transport Starts
      ↓
Background Resources Active
```

If the module is imported during test execution, transports may start timers or streams even when the test never emits a single runtime event.

This frequently leads to noisy test suites and unstable shutdown behavior.

## Prefer lazy initialization

Lazy initialization is generally safer for reusable applications and shared packages.

```ts
let loggerInstance:
  | ReturnType<typeof createLogger>
  | undefined;

export function getLogger() {
  if (loggerInstance) return loggerInstance;

  loggerInstance = createLogger({
    level: 'info',
    transports:
      process.env.NODE_ENV === 'test'
        ? []
        : [
            createRotatingFileTransporter({
              filename: './logs/runtime.log'
            })
          ]
  });

  return loggerInstance;
}

export async function shutdownLogger() {
  await loggerInstance?.shutdown?.();
  loggerInstance = undefined;
}
```

Conceptually:

```text
Application Requests Logger
            ↓
Lazy Initialization
            ↓
Controlled Runtime Ownership
```

This prevents unnecessary background infrastructure from starting before the runtime actually needs it.

## Explicit shutdown in tests

Tests should shut down logger resources explicitly whenever transports maintain internal lifecycle behavior.

```ts
afterEach(async () => {
  await shutdownLogger();
});
```

Conceptually:

```text
Test Lifecycle Ends
        ↓
Flush Pending Entries
        ↓
Close Resources
```

Explicit shutdown keeps test execution deterministic and prevents resource leakage across suites.

## Mock transports for unit testing

Unit tests should generally prefer lightweight mock transports over real filesystem or remote infrastructure.

```ts
const transport = {
  write: jest.fn().mockResolvedValue(undefined),
  flush: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
};

const logger = createLogger({
  transports: [transport],
  colorize: false
});
```

Conceptually:

```text
Mock Transport
      ↓
Deterministic Runtime Behavior
```

Mock transports avoid:

- filesystem writes
- network requests
- background timers
- environmental side effects

while still allowing transport behavior to be tested safely.

## Timer-based transport testing

Timer-driven transports should generally expose explicit testing controls rather than relying on production behavior during automated tests.

```ts
const transport = new AsyncBatchTransporter({
  batchSize: 10,
  flushInterval: 1000,
  sendBatch: async () => {},
  startImmediately: false
});
```

Conceptually:

```text
Test Runtime
      ↓
Timers Disabled By Default
```

This keeps test execution predictable while still allowing interval behavior to be tested intentionally when needed.

If a test specifically needs interval execution, enable it deliberately and stop it afterward.

```ts
const transport = new AsyncBatchTransporter({
  batchSize: 10,
  flushInterval: 1000,
  sendBatch: async () => {},
  startImmediately: true,
  enableTimerInTest: true
});

await transport.stop();
```

Conceptually:

```text
Explicit Timer Start
        ↓
Controlled Test Execution
        ↓
Explicit Timer Stop
```

Timer lifecycle should remain fully controlled during automated testing.

## Graceful runtime shutdown

Shutdown behavior matters in production environments just as much as in tests.

Buffered or asynchronous transports may still contain pending runtime events when:

```text
workers terminate
containers restart
deployments roll out
servers stop
runtime crashes occur
```

Applications should therefore flush and close logger resources before exiting.

```ts
await logger.shutdown();
```

Conceptually:

```text
Pending Runtime Events
          ↓
Flush Pipeline
          ↓
Close Resources
          ↓
Safe Runtime Exit
```

Graceful shutdown helps preserve telemetry continuity during runtime lifecycle transitions.

## Signal handling

Applications should generally integrate logger shutdown into their own lifecycle management.

```ts
process.once('SIGTERM', async () => {
  await logger.shutdown();
  process.exit(0);
});
```

Conceptually:

```text
Termination Signal
        ↓
Logger Shutdown
        ↓
Runtime Exit
```

This allows transports to flush pending telemetry and close background resources safely before process termination.

## Reusable package design

Reusable libraries should avoid registering global signal handlers automatically during import.

Conceptually:

```text
Reusable Package
        ↓
No Automatic Process Ownership
```

Signal handling should remain opt-in so applications preserve control over their own lifecycle behavior.

```ts
export function registerLoggerShutdownHandlers(logger: ILogger) {
  process.once('SIGINT', async () => {
    await logger.shutdown?.();
    process.exit(0);
  });

  process.once('SIGTERM', async () => {
    await logger.shutdown?.();
    process.exit(0);
  });
}
```

This keeps lifecycle orchestration predictable across different runtime environments.

## Operational testing discipline

Testing and shutdown discipline ultimately protect runtime stability itself.

Conceptually:

```text
Controlled Resource Lifecycle
            ↓
Predictable Runtime Behavior
            ↓
Reliable Observability
```

Without controlled shutdown behavior, transports may leak resources, lose pending telemetry, or create unstable execution environments during both automated testing and production deployment.

## Summary

Testing and shutdown behavior in Ambiten Logger are designed around controlled runtime resource management for transports that maintain timers, streams, buffers, or asynchronous delivery pipelines.

Lazy initialization prevents unnecessary background activity during tests, mock transports keep unit tests deterministic, explicit shutdown handling flushes pending runtime telemetry safely, timer lifecycle controls reduce open handle warnings, and graceful process integration ensures transports release resources correctly during both automated testing and production runtime termination.
