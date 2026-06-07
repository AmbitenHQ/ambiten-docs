# Installation

Install the Ambiten runtime and the adapter layer that matches your application environment.

Ambiten is framework-agnostic by design. The core runtime remains consistent across Express, Fastify, GraphQL, NestJS, and serverless architectures, while adapters integrate the execution model into the surrounding framework lifecycle.

## Prerequisites

Before installing Ambiten, ensure your environment provides:

- Node.js 18+
- npm, pnpm, or yarn
- a reachable MongoDB deployment

Ambiten operates directly on top of the official MongoDB driver, so the runtime expects an accessible MongoDB instance during initialization.

## Install the core runtime

Install the core runtime package:

```bash
npm install @ambiten/core
```

The core package contains the execution runtime, context system, model layer, middleware pipeline, transaction coordination, and provider infrastructure used throughout the framework.

## Install an adapter

Most applications also install an adapter package corresponding to their runtime environment.

<AdapterSelector />

Adapters connect framework lifecycles to the Ambiten runtime boundary. They are responsible for request normalization, context initialization, tenant resolution, and execution scoping.

The execution model itself remains unchanged across runtimes. Only the integration boundary differs.

Additional adapter details are available in [Adapters Overview](/adapters/overview).

## Environment configuration

At minimum, Ambiten requires a MongoDB connection string and database name.

Example .env configuration:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=my-app
```

These values are typically consumed during runtime bootstrap or provider initialization.

## Minimal runtime configuration

Applications using the Ambiten bootstrap flow can generate configuration automatically through the CLI.

A minimal configuration typically looks like this:

```JSON
{
  "projectName": "my-app",
  "connection": {
    "uri": "mongodb://localhost:27017/my-app",
    "options": {
      "dbName": "my-app"
    }
  }
}
```

This configuration establishes the primary database connection and provides the runtime with its initial infrastructure bindings.

## What installation enables

Once initialized, the runtime provides a consistent execution foundation for context-aware backend systems.

Execution state can propagate automatically across asynchronous boundaries, transactions remain attached to the active runtime scope, middleware pipelines execute deterministically, and tenant-aware infrastructure resolution becomes available throughout model execution.

Because these concerns are coordinated by the runtime itself, application services can remain focused on business behavior rather than infrastructure propagation.

### Next step

Continue to [Quick Start](/getting-started/quick-start) to scaffold a working Ambiten application and follow a complete request lifecycle from adapter ingress to MongoDB execution.
