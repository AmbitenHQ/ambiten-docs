# Installation

Ambiten Logger can operate independently as a structured logging system or integrate directly into the broader Ambiten runtime ecosystem. The package is framework-agnostic and works across APIs, workers, GraphQL systems, background processors, serverless runtimes, and traditional Node.js applications.

Install the package using your preferred package manager.

<PackageManagerTabs />

Once installed, create a logger instance with `createLogger()`.

```ts
import { createLogger } from '@ambiten/logger';

const logger = createLogger({
  level: 'info'
});

logger.info('Logger initialized');
```

Even in its simplest form, the logger already operates as a structured runtime event pipeline rather than a basic console wrapper. Every emitted log becomes a normalized runtime entry capable of flowing through transports, observability infrastructure, batch systems, or remote ingestion pipelines.

By default, console logging works immediately. Additional infrastructure can be layered onto the same logger instance as operational requirements evolve.

```ts
import {
  createLogger,
  consoleTransport,
  createRotatingFileTransporter
} from '@ambiten/logger';

const logger = createLogger({
  transports: [
    consoleTransport(),
    createRotatingFileTransporter({
      filename: './logs/app.log'
    })
  ]
});
```

The logging API remains unchanged even as the operational environment becomes more sophisticated. A development-oriented logger can later evolve into rotating files, buffered transport systems, remote observability pipelines, centralized ingestion infrastructure, or distributed telemetry flows without rewriting application logging logic.

The logger also supports production-oriented structured JSON output.

```ts
const logger = createLogger({
  json: true
});
```

Structured JSON logging is generally recommended for production systems because it integrates cleanly with platforms such as Elasticsearch, Loki, OpenSearch, cloud logging systems, and distributed observability pipelines.

When operating inside the Ambiten runtime ecosystem, the logger automatically becomes context-aware whenever an active execution context exists. Request identifiers, tenant information, database targets, collection names, and runtime metadata can propagate automatically into emitted log entries without requiring repetitive manual metadata attachment throughout the application.

Conceptually, the logging lifecycle looks like this:

```text
Application → Logger → Transport Pipeline → Destination
```

The logger focuses on generating structured runtime events. Transports determine where those events go. Runtime context enriches those events automatically whenever execution boundaries are active.

This separation allows the logger to remain lightweight for smaller systems while still scaling into operationally complex production environments.
