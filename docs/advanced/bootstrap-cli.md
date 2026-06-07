# AmbitenBootstrapFactory

`AmbitenBootstrapFactory` is the public startup entry point for a Ambiten-powered system.

It creates and initializes the Ambiten runtime before requests, workers, GraphQL resolvers, queue consumers, scheduled tasks, or serverless invocations begin execution. Database connectivity, multi-tenancy, logging, Redis integration, GraphQL capabilities, garbage collection, and runtime services are assembled into a coherent operational boundary before application execution starts.

The underlying `AmbitenBootstrap` implementation is internal. Applications should interact with the runtime returned by `AmbitenBootstrapFactory`.

```text
Factory prepares the runtime.
Adapters connect the runtime to execution entry points.
```

## Why the factory exists

As systems evolve, startup orchestration often becomes fragmented across unrelated files and framework hooks. Database initialization may happen in one location, Redis setup in another, tenancy registration elsewhere, and adapter wiring inside framework-specific entry points.

`AmbitenBootstrapFactory` centralizes that startup phase into one supported public API. When the application begins accepting execution, the runtime has already been prepared, connected, and internally aligned.

```PlainText
Without Factory → Infrastructure assembles during execution
With Factory    → Infrastructure is prepared before execution
```

The factory model also simplifies the public API surface by exposing a single startup contract rather than requiring applications to manually construct internal runtime orchestrators.

## Runtime responsibility model

Ambiten separates startup orchestration from execution flow.

```text
AmbitenBootstrapFactory → creates and initializes the runtime
AmbitenRuntime          → exposes initialized runtime services
Adapter               → establishes request or invocation boundaries
AmbitenContext          → carries execution state
AmbitenModel            → executes operations
```

The runtime is initialized once during startup. Adapters operate at framework boundaries. Models execute inside the active context established downstream.

This separation keeps runtime behavior predictable and operationally consistent.

## Basic initialization

Most applications start Ambiten through the factory.

```ts
import { AmbitenBootstrapFactory } from "@ambiten/core";

export async function initAmbiten() {
  return AmbitenBootstrapFactory.create();
}
```

The returned runtime exposes the initialized services and lifecycle methods needed by the application.

```ts
const runtime = await initAmbiten();

const client = runtime.getMongoClient();
const logger = runtime.getLogger();
const model = runtime.getModel();
const schema = runtime.getSchema();
```

## Configuration

When no configuration is passed, Ambiten resolves the default `ambiten.config.json` file automatically.

```ts
const runtime = await AmbitenBootstrapFactory.create();
```

A configuration path may also be supplied explicitly.

```ts
const runtime = await AmbitenBootstrapFactory.create({
  config: "./ambiten.config.json"
});
```

For tests, embedded runtimes, or custom orchestration layers, a configuration object may be passed directly.

```ts
const runtime = await AmbitenBootstrapFactory.create({
  config: {
    connection: {
      uri: "mongodb://localhost:27017/my-app",
      options: {
        dbName: "my-app"
      }
    },
    multiTenant: {
      enabled: true,
      tenants: {
        tenantA: "mongodb://localhost:27017/tenantA"
      }
    }
  }
});
```

Generated applications should normally keep runtime configuration inside `ambiten.config.json` so startup behavior remains consistent across environments.

## What the factory initializes

<BootstrapCapabilitiesOverview />

## Adapter integration

Adapters are installed where the real framework application exists. The factory prepares Ambiten; the adapter binds Ambiten execution to Express, Fastify, NestJS, GraphQL, Lambda, workers, or other runtime boundaries.

```ts
import express from "express";
import { AmbitenBootstrapFactory } from "@ambiten/core";
import { createExpressAdapter } from "@ambiten/adapter-express";

const app = express();
app.use(express.json());

const runtime = await AmbitenBootstrapFactory.create();

await runtime.registerMultiTenancy();

const adapter = createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  },
  enableTransactions: true
});

app.listen(3000);
```

This separation is intentional. Ambiten registers tenant infrastructure during startup, while adapters resolve request-bound tenant and execution context at runtime.

## Runtime lifecycle

A typical startup lifecycle looks like this:

<BootstrapLifecycleFlow />

Once the runtime is ready, adapters can begin establishing execution context for incoming requests, jobs, or invocations.

## Lifecycle hooks

The returned runtime exposes lifecycle hooks for operational visibility.

```ts
runtime.onConnect(() => {
  console.log("Runtime ready");
});

runtime.onError((error) => {
  console.error("Runtime startup failed:", error);
});
```

These hooks are useful for readiness diagnostics, deployment coordination, and runtime telemetry.

## Shutdown

Applications should shut down the runtime gracefully.

```ts
await runtime.shutdown();
```

Shutdown closes managed infrastructure such as MongoDB providers, Redis clients, logging transports, runtime schedulers, and internal services when available.

## Relationship with AmbitenClient

`AmbitenClient` provides lower-level MongoDB infrastructure access. `AmbitenBootstrapFactory` prepares the full application runtime around that infrastructure.

```text
AmbitenBootstrapFactory → startup orchestration
AmbitenClient           → database infrastructure access
Adapter               → framework execution boundary
AmbitenContext          → execution state
```

Use `AmbitenBootstrapFactory` when building a complete Ambiten application. Use `AmbitenClient` directly when a smaller script or isolated tool only needs database infrastructure access.

## Best practices

Initialize the runtime once during application startup.

Keep framework wiring inside the application entry point where the real app instance exists.

Use `registerMultiTenancy()` to register tenant infrastructure, then use adapters to resolve tenant and request context during execution.

Avoid manually constructing internal bootstrap classes. `AmbitenBootstrapFactory` is the supported public startup API.

## Summary

AmbitenBootstrapFactory is the public startup boundary for Ambiten applications.

It prepares the runtime before execution begins, while adapters connect that prepared runtime to framework-specific entry points. This keeps startup orchestration predictable, adapter integration clean, and model execution focused on the active runtime context.

## Related pages

- [AmbitenClient](/reference/api/ambiten-client)
- [Context](/core/context)
- [Adapters Overview](/adapters/overview)
- [Multi-Tenancy](/architecture/multi-tenancy)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [CLI Init](/advanced/cli-init)
