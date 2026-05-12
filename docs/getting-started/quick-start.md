# Quick Start

This guide walks through the fastest path to a working Tenra application.

In a few minutes, you will scaffold a runtime-aware project with MongoDB connectivity, framework integration, and a structured execution layer ready for development.

## Initialize a project

Create a new Tenra application using the CLI:

```bash
npx tenra init my-app
```

The initializer guides you through runtime configuration, adapter selection, and optional capabilities such as GraphQL support, logging, and multi-tenancy.

## Enter the project directory

```bash
cd my-app
```

## Install dependencies

```bash
npm install
```

## Start the development runtime

```bash
npm run dev
```

Once the runtime starts, you have a fully operational Tenra application with a configured execution layer and MongoDB integration.

## Generated project structure

The CLI scaffolds a minimal but production-oriented structure similar to:

```sh
my-app/
  tenra.config.json
  src/
    main.ts
    core/
      initTenra.ts
```

The generated bootstrap layer establishes the runtime foundation and centralizes infrastructure initialization.

## Runtime configuration

Tenra projects are configured through tenra.config.json.

A minimal configuration looks like this:

```json
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

This configuration defines the database connection and establishes the initial runtime environment.

## How application startup works

Most Tenra applications initialize through a bootstrap entry point:

```ts
import { run } from "./core/initTenra";

const app = await run();
```

The bootstrap layer coordinates runtime initialization, infrastructure setup, adapter registration, and optional execution features before the application begins accepting requests.

Depending on your configuration, this can include tenant-aware database resolution, logging infrastructure, GraphQL integration, middleware registration, and transaction-aware runtime services.

## Define your first model

Models define the operational boundary between your application and persistence layer.

A minimal model definition looks like this:

```ts
import { TenraModel } from "@tenra/core";

export const UserModel = new TenraModel({
  collectionName: "users",
  schema: userSchema,
  provider: db
});
```

Once registered, the model automatically participates in Tenra’s runtime execution system, including middleware, context propagation, instrumentation, and transaction-aware operations.

## Enable additional runtime capabilities

The CLI can scaffold optional runtime features during initialization:

```bash
npx tenra init my-app --with-graphql --multi-tenant --logger
```

You can also evolve the generated configuration manually as your architecture grows.

## What to explore next

After the initial setup, most teams continue by defining domain models, attaching an API transport layer, and enabling runtime policies such as multi-tenancy, middleware, or observability.

The following pages expand on those concepts:

- [Architecture](/architecture/whitepaper)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Adatper Overview](/adapters/overview)
- [Bootstrap & CLI](/advanced/bootstrap-cli)
