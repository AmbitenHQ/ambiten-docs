# TenraBootstrap

`TenraBootstrap` is the startup orchestration layer for a Tenra-powered system.

It prepares the runtime before any request, worker, GraphQL resolver, queue consumer, or serverless invocation begins execution. Database connectivity, multi-tenancy, logging, Redis integration, GraphQL capabilities, garbage collection, and runtime configuration are assembled here so the application starts from a coherent operational state rather than constructing infrastructure dynamically during execution.

Bootstrap does not execute requests. That responsibility belongs to adapters and the runtime execution layer.

```Plain Text
Bootstrap prepares the runtime.
Adapters connect the runtime to execution entry points.
```

## Why Bootstrap exists

As systems evolve, startup logic often becomes fragmented across unrelated files and lifecycle hooks. Database initialization may happen in one location, Redis in another, tenancy registration elsewhere, and adapter wiring inside framework-specific bootstrap code.

The result is usually inconsistent startup behavior, duplicated configuration logic, and infrastructure that becomes harder to reason about under production pressure.

`TenraBootstrap` centralizes this initialization phase into a single operational boundary. When execution begins, the runtime is already prepared, connected, and internally consistent.

Conceptually, the distinction looks like this:

```text
Without Bootstrap → Infrastructure assembles itself during execution
With Bootstrap    → Infrastructure is prepared before execution begins
```

## Runtime responsibility model

Tenra intentionally separates startup orchestration from request execution.

```text
TenraBootstrap → prepares infrastructure and runtime services
Adapter         → establishes request or invocation boundaries
TenraContext    → carries execution state
TenraModel      → executes operations
```

This separation keeps runtime behavior predictable.

Bootstrap runs once during application startup. Adapters execute per request or invocation. Models operate inside the active execution boundary established downstream.

## Basic initialization

A bootstrap instance may be created with an adapter:

```ts
import express from "express";
import { TenraBootstrap } from "@tenra/core";
import { createExpressAdapter } from "@tenra/express";

const app = express();
const adapter = createExpressAdapter();

const bootstrap = new TenraBootstrap(adapter);

await bootstrap.initialize("./tenra.config.json");

await bootstrap.registerMultiTenancy(app);

app.listen(3000);
```

The constructor accepts runtime integration surfaces such as adapters, while configuration is supplied during `initialize(...)`.

## Configuration sources

Most production applications initialize from a generated configuration file:

```ts
await bootstrap.initialize("./tenra.config.json");
```

Direct configuration objects are also supported:

```ts
await bootstrap.initialize({
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
});
```

This approach is useful for tests, isolated runtimes, custom orchestration layers, or applications that intentionally avoid filesystem-based configuration.

For CLI-generated projects, the generated tenra.config.json should remain the primary source of startup configuration so initialization behavior stays consistent across environments.

## Factory-based startup

Most applications should prefer the factory API because it creates, initializes, and returns a ready runtime boundary in one step.

```ts
import { TenraBootstrapFactory } from "@tenra/core";
import { createExpressAdapter } from "@tenra/express";

const adapter = createExpressAdapter();

const bootstrap = await TenraBootstrapFactory.create({
  adapter,
  config: "./tenra.config.json"
});
```

If the application uses the default generated configuration path, the config argument may be omitted:

```ts
const bootstrap = await TenraBootstrapFactory.create({
  adapter
});
```

The factory API reduces startup duplication and keeps initialization composition explicit.

## CLI-generated projects

Projects generated through the Tenra CLI already include a runtime configuration file:

```bash
npx tenra init my-app
```

Example:

```JSON
{
  "connection": {
    "uri": "mongodb://localhost:27017/my-app"
  },
  "multiTenant": {
    "enabled": true
  },
  "graphql": {
    "enabled": false
  }
}
```

A typical startup entry point may look like this:

```ts
import { TenraBootstrapFactory } from "@tenra/core";
import { createExpressAdapter } from "@tenra/express";

const adapter = createExpressAdapter();

export async function startTenra() {
  return TenraBootstrapFactory.create({
    adapter,
    config: "./tenra.config.json"
  });
}
```

In generated applications, configuration should generally remain centralized in the config file rather than duplicated inside runtime initialization code.

## What Bootstrap initializes

<BootstrapCapabilitiesOverview />

## Adapter integration

Bootstrap and adapters are intentionally separate concerns.

```Plain Text
Bootstrap → prepares the runtime
Adapter   → binds the runtime to a framework
```

Example:

```ts
const adapter = createExpressAdapter();
const bootstrap = new TenraBootstrap(adapter);

await bootstrap.initialize("./tenra.config.json");
await bootstrap.registerMultiTenancy(app);
```

`registerMultiTenancy(app)` allows Bootstrap to wire tenancy configuration and adapter integration directly into the application.

Applications that prefer manual adapter installation may still configure the adapter independently:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  },
  enableTransactions: true
});
```

The runtime model remains the same either way.

## Relationship with TenraClient

`TenraClient` and `TenraBootstrap` solve different problems.

`TenraClient` provides lower-level infrastructure access, database resolution, sessions, and tenant-aware MongoDB interaction. `TenraBootstrap` prepares the operational runtime that surrounds those capabilities.

Conceptually:

```sh
TenraBootstrap → startup orchestration
TenraClient    → infrastructure resolution
Adapter         → request integration
TenraContext    → execution state
```

Use `TenraBootstrap` when assembling a full application runtime. Use `TenraClient` directly when you need focused infrastructure access without broader application orchestration.

## Lifecycle hooks

Bootstrap exposes lifecycle hooks for operational visibility:

```ts
bootstrap.onConnect(() => {
  console.log("Runtime ready");
});

bootstrap.onError((err) => {
  console.error("Startup failed:", err);
});
```

These hooks are commonly used for readiness diagnostics, startup telemetry, deployment coordination, and post-initialization tasks.

## Shutdown behavior

Applications should shut down initialized resources gracefully:

```ts
await bootstrap.shutdown();
```

Shutdown closes managed infrastructure such as MongoDB and Redis connections when available.

This is especially important in containerized deployments, worker environments, and graceful termination flows.

## Transaction readiness

Bootstrap prepares the runtime for transaction participation, but adapters activate transaction handling at execution time.

```ts
await adapter.install(app, {
  enableTransactions: true
});
```

Transactional execution then occurs inside runtime context:

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.create(data);
});
```

This separation keeps startup concerns independent from request execution behavior.

## When to use Bootstrap

TenraBootstrap is most valuable when building full applications with shared runtime infrastructure, multi-tenancy, logging, Redis integration, GraphQL support, or standardized startup behavior across multiple services.

Smaller scripts, isolated workers, lightweight tooling, or test utilities often do not require a full bootstrap boundary. In those cases, using `TenraClient` directly is usually the simpler approach.

## Best practices

Initialize Bootstrap once during application startup and keep request handling responsibilities inside adapters and runtime execution layers.

For generated projects, prefer centralized configuration through `tenra.config.json` rather than scattering runtime configuration across multiple startup files.

Use the factory API for consistent startup composition, and avoid duplicating generated configuration objects in application code unless intentionally overriding runtime behavior.

## Summary

`TenraBootstrap` is the startup orchestration layer for Tenra applications.

It prepares database infrastructure, tenancy configuration, logging, Redis integration, GraphQL capabilities, garbage collection, and runtime readiness before execution begins. By separating startup orchestration from runtime execution, Tenra keeps operational initialization predictable while allowing request handling, context propagation, and model execution to remain focused and consistent.

## Related pages

- [TenraClient](/api/tenra-client)
- [Context](/core/context)
- [Adapters Overview](/adapters/overview)
- [Multi-Tenancy](/architecture/multi-tenancy)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [CLI Init](/advanced/cli-init)
