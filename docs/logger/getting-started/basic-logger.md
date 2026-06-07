# Basic Logger

Ambiten Logger provides structured runtime logging for applications, services, workers, GraphQL systems, adapters, and distributed execution environments.

Rather than treating logging as isolated console output, Ambiten Logger operates as an observability layer capable of transporting structured runtime events across local development environments, rotating file systems, remote ingestion pipelines, centralized logging infrastructure, and runtime-aware execution contexts.

At its simplest level, a logger instance can be created with `createLogger()`.

```ts
import { createLogger } from '@ambiten/logger';

const logger = createLogger({
  level: 'info'
});

logger.info('Application started');
```

Even the simplest logger instance internally produces structured runtime entries rather than raw strings.

## Runtime-oriented logging

Every emitted log becomes a structured runtime event.

```ts
logger.debug('Debugging request flow');

logger.info('User authenticated');

logger.warn('Rate limit threshold reached');

logger.error('Database connection failed');

logger.trace('Executing middleware pipeline');
```

Severity levels determine which entries are allowed to continue through the transport pipeline.

```ts
const logger = createLogger({
  level: 'warn'
});
```

With this configuration:

```text
debug → skipped
info  → skipped
warn  → emitted
error → emitted
```

Filtering occurs before transport execution begins, reducing unnecessary runtime overhead in production systems.

## Structured metadata

Metadata can be attached directly to runtime events.

```ts
logger.info('Order created', {
  orderId: 'ord_1001',
  customerId: 'usr_42'
});
```

Because Ambiten Logger internally operates on structured runtime objects, metadata remains transport-safe and queryable across:

- JSON pipelines
- remote observability systems
- centralized logging infrastructure
- batch ingestion systems
- distributed runtime environments

This allows logs to evolve from development diagnostics into operational telemetry without changing application logging logic.

## Transport-driven architecture

Ambiten Logger separates log generation from log delivery.

Applications emit runtime events. Transports decide where those events go.

```text
Application → Logger → Transport Pipeline → Destination
```

At runtime, multiple transports may operate simultaneously.

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

The same logger may later evolve into:

- rotating file infrastructure
- remote HTTP ingestion
- Redis-backed pipelines
- Loki integration
- Elasticsearch ingestion
- resilient batch transport systems

without rewriting application logging logic.

## Context-aware runtime logging

When used inside the Ambiten runtime ecosystem, the logger automatically becomes context-aware whenever an active execution context exists.

Runtime metadata can propagate automatically into emitted log entries:

```text
tenantId
requestId
dbName
collectionName
operation
```

This allows logs generated deep inside models, middleware, adapters, transactions, or GraphQL execution flows to remain operationally traceable without manually attaching metadata everywhere.

Conceptually:

```text
Execution Context → Logger → Structured Runtime Event
```

The logger does not need to know where execution originated. It simply consumes the active runtime context when one exists.

## Development and production behavior

During development, formatted console output is often sufficient.

In production environments, the same logger may operate through:

- rotating file systems
- resilient remote transports
- buffered pipelines
- compression and retention systems
- centralized observability infrastructure

without changing application code.

This separation allows applications to evolve operationally without restructuring runtime logging behavior.

## Minimal runtime setup

A practical minimal logger setup often looks like this:

```ts
import {
  createLogger,
  consoleTransport
} from '@ambiten/logger';

export const logger = createLogger({
  level: 'info',
  transports: [
    consoleTransport()
  ]
});
```

Once initialized, the logger can be reused throughout the runtime system.

## Relationship with Ambiten Runtime

Ambiten Logger is operationally independent, but runtime-aware.

```text
AmbitenContext → carries execution state
Ambiten Logger → emits runtime events
Transports   → deliver operational telemetry
```

This separation allows the logger to operate both:

- independently in smaller systems
- contextually inside larger Ambiten runtime environments

without changing the public logging API.

## Summary

Ambiten Logger provides structured, transport-driven runtime logging for modern execution environments.

It separates runtime event generation from transport delivery, supports structured operational metadata, integrates with distributed observability infrastructure, and becomes context-aware automatically when operating inside the Ambiten runtime ecosystem.
