---
title: AmbitenBootstrapFactory
description: Initialize and manage the Ambiten runtime before application execution begins.
---

# AmbitenBootstrapFactory

`AmbitenBootstrapFactory` is the public startup entry point for an Ambiten-powered application.

It creates and initializes the Ambiten runtime before requests, workers, GraphQL resolvers, queue consumers, scheduled tasks, or other execution entry points begin using application infrastructure.

Database connectivity, models, schemas, logging, multi-tenancy, Redis integration, GraphQL capabilities, garbage collection, and other configured runtime services are assembled before the application begins handling work.

The underlying bootstrap implementation is internal.

Applications should interact with the runtime returned by:

```ts
AmbitenBootstrapFactory.create(...)
```

The architectural boundary is:

```text
AmbitenBootstrapFactory
→ prepares process-level runtime infrastructure

Framework Adapter
→ connects an execution entry point to Ambiten

AmbitenContext
→ carries request or operation state

MultiTenantManager
→ manages tenant infrastructure

AmbitenModel
→ performs data operations
```

In short:

```text
Factory prepares the runtime.

Adapters enter the runtime.

Context carries execution state.

Models use the runtime.
```

## Why the Factory Exists

Application startup often becomes fragmented as a system grows.

Without a dedicated startup boundary, infrastructure may be initialized independently across:

```text
database setup
logging
Redis
tenant configuration
GraphQL
garbage collection
framework bootstrap
application services
```

That can lead to runtime infrastructure being assembled during request execution rather than before it.

`AmbitenBootstrapFactory` centralizes this initialization phase behind one supported public API.

```text
Without Factory
→ infrastructure may be assembled during execution

With Factory
→ infrastructure is prepared before execution
```

This creates a clearer lifecycle:

```text
Application starts
      ↓
AmbitenBootstrapFactory.create()
      ↓
Runtime initialized
      ↓
Framework adapters installed
      ↓
Application begins accepting work
```

## Runtime Responsibility Model

Ambiten separates startup orchestration from execution flow.

```text
AmbitenBootstrapFactory
        ↓
creates runtime infrastructure

AmbitenRuntime
        ↓
exposes initialized services

Framework Adapter
        ↓
establishes request/invocation boundary

AmbitenContext
        ↓
carries execution state

AmbitenModel
        ↓
executes data operations
```

The runtime is initialized once during application startup.

Adapters operate at framework or invocation boundaries.

Models execute using the runtime state associated with the active execution.

This keeps bootstrap concerns separate from request processing.

## Basic Initialization

Most applications start Ambiten through the factory.

```ts
import {
  AmbitenBootstrapFactory
} from "@ambiten/core";

export async function initAmbiten() {
  return AmbitenBootstrapFactory.create();
}
```

Then:

```ts
const runtime =
  await initAmbiten();
```

The returned runtime exposes initialized Ambiten services.

For example:

```ts
const client =
  runtime.getMongoClient();

const logger =
  runtime.getLogger();

const model =
  runtime.getModel();

const schema =
  runtime.getSchema();
```

The runtime should normally be created once and reused for the lifetime of the application process.

## Configuration

When no explicit configuration is supplied, Ambiten can resolve the application's default configuration.

```ts
const runtime =
  await AmbitenBootstrapFactory.create();
```

A configuration path can also be supplied:

```ts
const runtime =
  await AmbitenBootstrapFactory.create({
    config: "./ambiten.config.json"
  });
```

For tests, embedded runtimes, or custom orchestration, configuration can be supplied directly.

```ts
const runtime =
  await AmbitenBootstrapFactory.create({
    config: {
      connection: {
        uri: "mongodb://localhost:27017/my-app",
        options: {
          dbName: "my-app"
        }
      },

      schema: {
        username: {
          type: "string",
          required: true
        },

        email: {
          type: "string",
          required: true
        }
      },

      model: {
        collectionName: "users"
      }
    }
  });
```

Generated applications should normally keep persistent runtime configuration in `ambiten.config.json` so startup behavior remains consistent across environments.

## What the Factory Initializes

<BootstrapCapabilitiesOverview />

The exact services initialized depend on the runtime configuration.

The important distinction is that the factory prepares **process-level infrastructure**.

It does not establish request-specific execution state.

For example:

```text
Factory
→ creates database infrastructure
→ initializes model/schema
→ prepares logging
→ configures multi-tenancy
→ initializes optional runtime services
```

while:

```text
Adapter
→ resolves request identity
→ creates request context
→ enters application execution
```

## Multi-Tenancy During Bootstrap

Multi-tenancy has two distinct phases in Ambiten:

```text
startup-time tenant infrastructure
+
request-time tenant identity
```

The factory and runtime are responsible for preparing tenant infrastructure.

Framework adapters are responsible for resolving the tenant associated with a particular request.

For statically configured tenants, the runtime can register tenant configuration during startup.

For example:

```ts
await runtime.registerMultiTenancy({
  tenants: {
    tenant1:
      "mongodb://localhost:27017/db_tenant1",

    tenant2:
      "mongodb://localhost:27017/db_tenant2",

    tenant3:
      "mongodb://localhost:27017/db_tenant3"
  },

  lazy: true
});
```

With lazy tenancy enabled, registration does not require every tenant connection to be opened immediately.

The runtime may therefore begin with:

```ts
{
  registeredTenants: 3,
  connectedTenants: 0,
  lazyTenants: 3
}
```

Connections can then be activated when a tenant is actually used.

## Static and Dynamic Tenants

Bootstrap does not require the application to know every tenant in advance.

Static tenants can be registered during startup:

```text
Application starts
      ↓
tenant1
tenant2
tenant3
registered
```

Dynamic tenants can be discovered later:

```text
Request references tenant5
      ↓
tenant5 not registered
      ↓
TenantConfigResolver
      ↓
tenant5 configuration found
      ↓
MultiTenantManager registers tenant5
```

This distinction is important.

`AmbitenBootstrapFactory` prepares the tenancy system.

`MultiTenantManager` owns the runtime tenant registry.

A `TenantConfigResolver` can extend that registry dynamically after startup.

See:

- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/architecture/multi-tenancy/dynamic-tenants)

## Dynamic Tenant Configuration

Applications that discover tenants dynamically can configure a tenant configuration resolver against `MultiTenantManager`.

For example:

```ts
import {
  MultiTenantManager
} from "@ambiten/core";

MultiTenantManager.setTenantConfigResolver({
  async resolve(tenantId) {
    const config =
      await lookupTenant(tenantId);

    if (!config) {
      return undefined;
    }

    return {
      tenantId,
      uri: config.uri,
      dbName: config.dbName,
      lazy: true,
      metadata: config.metadata
    };
  }
});
```

The bootstrap/runtime boundary remains process-level:

```text
Factory
→ prepares tenancy infrastructure

MultiTenantManager
→ owns tenant registry

TenantConfigResolver
→ discovers unknown tenant configuration

Adapter
→ determines which tenant belongs to this request
```

The request-facing resolver and infrastructure-facing resolver should remain separate.

## Adapter Integration

Adapters are installed where the real framework application exists.

The factory prepares Ambiten.

The adapter binds framework execution to the prepared runtime.

For Express:

```ts
import express from "express";

import {
  AmbitenBootstrapFactory,
  MultiTenantManager
} from "@ambiten/core";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

const app = express();

app.use(express.json());

const runtime =
  await AmbitenBootstrapFactory.create();

const adapter =
  createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant =
        await MultiTenantManager.resolveTenant(
          tenantId
        );

      if (!tenant) {
        throw new Error(
          `Tenant with ID "${tenantId}" not found.`
        );
      }

      return true;
    }
  }
});

app.listen(3000);
```

The resulting architecture is:

```text
Application Startup
      ↓
AmbitenBootstrapFactory
      ↓
Ambiten runtime ready
      ↓
Adapter installed
      ↓
Server accepts request
      ↓
TenantResolver
      ↓
AmbitenContext
      ↓
Application logic
```

The factory does not need to know which tenant a future request will use.

The adapter does not need to know how the tenant's MongoDB infrastructure is configured.

## Request-Time Tenant Flow

After bootstrap, a request may follow this path:

```text
POST /users
x-tenant-id: tenant5
      ↓
Framework Adapter
      ↓
TenantResolver
      ↓
tenant5
      ↓
validation
      ↓
AmbitenContext
tenantId = tenant5
      ↓
UserModel.create(...)
      ↓
MultiTenantManager
      ↓
tenant5 configuration
      ↓
tenant5 MongoClient
      ↓
db_tenant5
```

This separation means the factory does not perform request routing.

It prepares the runtime that request routing will use later.

## Bootstrap and AmbitenContext

`AmbitenBootstrapFactory` and `AmbitenContext` operate at different scopes.

```text
AmbitenBootstrapFactory
→ process/application lifetime

AmbitenContext
→ request/operation lifetime
```

The factory creates long-lived infrastructure.

The context contains state associated with one active execution.

For example:

```ts
AmbitenContext.get();
```

may return:

```ts
{
  tenantId: "tenant5",
  requestId: "req_123",
  dbName: undefined,
  collectionName: undefined
}
```

That state is not created during application bootstrap.

It is established when an adapter or another execution boundary enters Ambiten's runtime context.

## Bootstrap and MultiTenantManager

`MultiTenantManager` is the runtime owner of tenant infrastructure.

The factory may initialize multi-tenancy, but tenant registration and runtime tenant state belong to the manager.

Conceptually:

```text
AmbitenBootstrapFactory
        ↓
initializes multi-tenancy
        ↓
MultiTenantManager
        ↓
runtime tenant registry
```

After startup, the manager may contain:

```text
tenant1 → registered, lazy
tenant2 → registered, lazy
tenant3 → registered, lazy
```

Later, a dynamic request may extend that registry:

```text
tenant5 → dynamically resolved, connected
```

Application bootstrap does not need to restart when that happens.

## Bootstrap Does Not Select a Request Tenant

The factory should not be used to select which tenant a request belongs to.

Avoid treating startup code as request routing logic.

For example, this responsibility:

```text
x-tenant-id
→ tenant5
```

belongs to the framework adapter and tenant resolver.

This responsibility:

```text
tenant5
→ MongoDB URI
→ database
→ client lifecycle
```

belongs to `MultiTenantManager`.

The factory's role is to prepare those systems before they are used.

## Model Initialization

The runtime returned by the factory exposes the configured model:

```ts
const model =
  runtime.getModel();
```

Model initialization should be understood as structural runtime preparation.

Actual database selection happens when an operation executes.

This matters for multi-tenant applications.

The model itself does not need to permanently bind to one tenant database during bootstrap.

Instead:

```text
bootstrap
→ model prepared

request
→ tenant resolved

model operation
→ active tenant database selected
```

For example:

```ts
await UserModel.create({
  username: "Abinod Ltd"
});
```

may execute against:

```text
db_tenant5
```

when the active Ambiten context contains:

```ts
{
  tenantId: "tenant5"
}
```

The same model can therefore participate in different tenant executions.

## Runtime Lifecycle

A typical application lifecycle looks like:

<BootstrapLifecycleFlow />

Conceptually:

```text
Process starts
      ↓
Load configuration
      ↓
AmbitenBootstrapFactory.create()
      ↓
Initialize runtime infrastructure
      ↓
Register configured tenant infrastructure
      ↓
Install framework adapter
      ↓
Application accepts work
      ↓
Requests/jobs execute
      ↓
Shutdown signal
      ↓
runtime.shutdown()
```

Startup and execution remain separate phases.

## Lifecycle Hooks

The returned runtime exposes connection lifecycle hooks for operational visibility.

For example:

```ts
runtime.onConnect(() => {
  console.log("Ambiten runtime ready");
});
```

Lifecycle hooks can be useful for:

- readiness diagnostics,
- deployment coordination,
- startup telemetry,
- infrastructure visibility.

Application-specific error handling can remain at the surrounding bootstrap boundary.

For example:

```ts
try {
  const runtime =
    await AmbitenBootstrapFactory.create();

  runtime.onConnect(() => {
    console.log(
      "Ambiten runtime ready"
    );
  });
} catch (error) {
  console.error(
    "Ambiten startup failed:",
    error
  );

  process.exitCode = 1;
}
```

## Shutdown

Applications should shut down the runtime gracefully when the application itself terminates.

```ts
await runtime.shutdown();
```

For a server:

```ts
process.on(
  "SIGTERM",
  async () => {
    await runtime.shutdown();
    process.exit(0);
  }
);
```

Shutdown belongs to the process lifecycle.

It should not be performed at the end of an individual request.

Avoid:

```ts
app.post("/users", async (req, res) => {
  const user =
    await UserModel.create(req.body);

  await runtime.shutdown();

  res.json(user);
});
```

The runtime is shared application infrastructure and should normally remain active until the process is shutting down.

## What Shutdown Manages

Depending on the enabled runtime capabilities, shutdown can coordinate managed resources such as:

```text
MongoDB clients
tenant clients
Redis clients
logging transports
runtime schedulers
garbage collection
internal services
```

The purpose is to give the application one lifecycle boundary for resources initialized through Ambiten.

## Relationship with AmbitenClient

`AmbitenClient` provides lower-level database infrastructure access.

`AmbitenBootstrapFactory` prepares the larger application runtime around that infrastructure.

```text
AmbitenBootstrapFactory
→ application/runtime startup orchestration

AmbitenClient
→ MongoDB infrastructure access

MultiTenantManager
→ tenant infrastructure and client lifecycle

Framework Adapter
→ execution boundary

AmbitenContext
→ execution state
```

Use `AmbitenBootstrapFactory` when building a complete Ambiten-powered application.

Use lower-level infrastructure APIs directly when building a smaller script or specialized integration that does not require the complete runtime.

## Relationship with Framework Adapters

The factory and adapters are complementary.

They should not replace one another.

```text
Factory
→ prepares infrastructure

Adapter
→ enters execution
```

For example:

```text
AmbitenBootstrapFactory.create()
        ↓
MongoDB ready
schema ready
model ready
tenancy ready
logging ready
        ↓
Express Adapter installed
        ↓
request arrives
        ↓
AmbitenContext created
```

This is the intended lifecycle.

## ESM and CommonJS Runtime Boundaries

Ambiten supports both ESM and CommonJS consumers.

Framework adapters and the shared adapter runtime resolve through the corresponding package boundary so the application participates in the same compatible Core runtime context.

Conceptually:

```text
ESM application
    ↓
ESM framework adapter
    ↓
ESM adapter-runtime
    ↓
ESM Core
```

and:

```text
CommonJS application
    ↓
CommonJS framework adapter
    ↓
CommonJS adapter-runtime
    ↓
CommonJS Core
```

This is important for context-aware applications because request-scoped execution state must remain consistent across the adapter and Core boundary.

Package-boundary behavior is tested using external consumer fixtures for both supported module formats.

## Recommended Startup Pattern

A typical server application can follow this structure:

```ts
import express from "express";

import {
  AmbitenBootstrapFactory,
  MultiTenantManager
} from "@ambiten/core";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

async function start() {
  const runtime =
    await AmbitenBootstrapFactory.create();

  MultiTenantManager
    .setTenantConfigResolver({
      async resolve(tenantId) {
        const tenant =
          await lookupTenant(tenantId);

        if (!tenant) {
          return undefined;
        }

        return {
          tenantId,
          uri: tenant.uri,
          dbName: tenant.dbName,
          lazy: true,
          metadata: tenant.metadata
        };
      }
    });

  const app = express();

  app.use(express.json());

  const adapter =
    createExpressAdapter();

  await adapter.install(app, {
    tenancy: {
      header: "x-tenant-id",

      validate: async (tenantId) => {
        const tenant =
          await MultiTenantManager
            .resolveTenant(tenantId);

        return Boolean(tenant);
      }
    }
  });

  app.post(
    "/users",
    async (req, res) => {
      const model =
        runtime.getModel();

      const user =
        await model.create(req.body);

      res.status(201).json(user);
    }
  );

  app.listen(3000);

  return runtime;
}

const runtime =
  await start();
```

The responsibilities remain clear:

```text
Factory
→ prepare runtime

TenantConfigResolver
→ discover tenant infrastructure

Adapter
→ resolve request tenant

AmbitenContext
→ carry request identity

Model
→ execute against the active tenant
```

## Best Practices

Initialize the Ambiten runtime once during application startup.

Keep framework wiring in the application entry point where the real framework instance exists.

Use `AmbitenBootstrapFactory` as the supported public startup boundary instead of manually constructing internal bootstrap classes.

Keep startup tenant registration separate from request-time tenant resolution.

Use `MultiTenantManager` for tenant infrastructure and dynamic discovery.

Use framework adapters to establish request-scoped execution context.

Allow models to resolve database resources at operation time rather than manually binding request tenants during bootstrap.

Keep runtime shutdown at the application lifecycle boundary.

Avoid manually calling `AmbitenContext.run()` inside ordinary framework routes when an Ambiten adapter already owns the request boundary.

## Summary

`AmbitenBootstrapFactory` is the public startup boundary for Ambiten applications.

It prepares long-lived runtime infrastructure before execution begins.

Framework adapters then connect incoming execution to that prepared runtime.

`AmbitenContext` carries request-scoped state.

`MultiTenantManager` owns tenant infrastructure.

Models execute against resources selected for the active context.

The resulting lifecycle is:

```text
Bootstrap
   ↓
Runtime Ready
   ↓
Adapter
   ↓
Execution Context
   ↓
Tenant Resolution
   ↓
Model Operation
   ↓
Tenant Resource
```

This separation keeps startup orchestration, request execution, tenant infrastructure, and data access independently understandable while allowing them to participate in one coherent runtime.

## Related Pages

- [AmbitenClient](/reference/api/ambiten-client)
- [Context](/core/context)
- [Adapters Overview](/adapters/overview)
- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [Tenant Resolution](/architecture/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/architecture/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/architecture/multi-tenancy/framework-adapters)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [CLI Init](/advanced/cli-init)
