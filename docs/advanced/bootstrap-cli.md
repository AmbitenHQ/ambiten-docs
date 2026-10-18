---
title: AmbitenBootstrapFactory
description: Initialize and manage the Ambiten runtime before application execution begins.
---

# AmbitenBootstrapFactory

`AmbitenBootstrapFactory` is the public startup entry point for an Ambiten application.

It loads configuration, resolves referenced configuration modules, and initializes the configured database provider, logger, schema, model, and optional services.

Applications should await initialization before accepting requests or starting background work:

```ts
const runtime = await AmbitenBootstrapFactory.create({
  config: "./ambiten.config.json"
});
```

The returned `AmbitenRuntime` provides access to the initialized services.

The underlying bootstrap implementation is internal. Application code should use the factory and the runtime’s public methods.

## Runtime Responsibilities

Ambiten separates application startup from request and operation execution.

| Component | Responsibility |
| --- | --- |
| `AmbitenBootstrapFactory` | Loads configuration and initializes application infrastructure. |
| `AmbitenRuntime` | Exposes initialized services and runtime lifecycle methods. |
| Framework adapter | Connects a framework’s request or invocation boundary to Ambiten. |
| `AmbitenContext` | Carries state for the current execution. |
| `MultiTenantManager` | Manages tenant configuration, discovery, registration, and clients. |
| `AmbitenModel` | Performs operations using the database resources selected for the execution. |

Create the runtime once during application startup and reuse it throughout the application’s lifetime.

The factory does not enforce a singleton. Calling `create()` again starts another initialization sequence.

## Basic Initialization

When the application uses the default configuration location:

```ts
import { AmbitenBootstrapFactory } from "@ambiten/core";

export async function run() {
  const runtime = await AmbitenBootstrapFactory.create();

  const provider = runtime.getMongoClient();
  const logger = runtime.getLogger();
  const model = runtime.getModel();
  const schema = runtime.getSchema();

  logger.info("Application infrastructure initialized");

  return {
    runtime,
    provider,
    logger,
    model,
    schema
  };
}
```

`getMongoClient()` returns Ambiten’s configured database provider. It does not directly return the MongoDB driver’s `MongoClient` instance.

Use the runtime’s getters to access services. Internal fields such as `schema`, `model`, and `config` are not public application APIs.

## Configuration

The factory accepts either a configuration file path or an `AmbitenConfig` object.

### Default configuration discovery

```ts
await AmbitenBootstrapFactory.create();
```

The loader searches these application locations in order:

1. `./ambiten.config.json`
2. `./config/ambiten.config.json`
3. `./src/config/ambiten.config.json`

These paths are resolved from the process working directory. The CommonJS build also retains legacy package-directory fallback locations.

For predictable deployment behavior, supply an explicit path when the working directory or configuration location may vary.

### Explicit configuration file

```ts
await AmbitenBootstrapFactory.create({
  config: "./ambiten.config.json"
});
```

A relative configuration file path is resolved from `process.cwd()`.

`ambiten.config.json` contains the application configuration. The accompanying `ambiten.config.schema.json` describes the accepted configuration structure for validation and editor support.

### Programmatic configuration

Configuration can also be supplied directly:

```ts
import { AmbitenBootstrapFactory } from "@ambiten/core";

export async function run() {
  return AmbitenBootstrapFactory.create({
    config: {
      projectName: "my-app",

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
        },

        createdAt: {
          type: "date",
          default: {
            $runtime: "now"
          }
        }
      },

      model: {
        collectionName: "users"
      }
    }
  });
}
```

Each schema field uses a field-options object.

Runtime defaults such as `{ "$runtime": "now" }` are evaluated when defaults are applied to a document. They are not evaluated once during bootstrap.

See [Schema](/models/schema) for field definitions, validation, and runtime defaults.

## Configuration Modules

Schema definitions, model options, and dynamic tenant resolution can live in separate modules.

This keeps the main configuration small while allowing application code to remain in the relevant source directories.

For example, `ambiten.config.json` can contain:

```json
{
  "configVersion": "1.0.0",
  "projectName": "my-app",
  "connection": {
    "uri": "mongodb://localhost:27017/my-app",
    "options": {
      "dbName": "my-app"
    }
  },
  "schema": {
    "path": "./src/schemas/user.schema.ts",
    "exportName": "userSchema"
  },
  "model": {
    "path": "./src/models/user.model.ts",
    "exportName": "userModelOptions"
  },
  "multiTenant": {
    "enabled": true,
    "tenants": {
      "tenant1": "mongodb://localhost:27017/my-app_tenant1"
    },
    "tenantConfigResolverModule": {
      "path": "./src/tenantResolver.ts",
      "exportName": "resolveTenantConfig"
    },
    "initOptions": {
      "lazy": true
    }
  },
  "logger": {
    "enabled": true,
    "level": "info",
    "transportConfigs": [
      {
        "type": "console",
        "options": {}
      },
      {
        "type": "rotating-file",
        "options": {
          "filename": "./logs/ambiten.log",
          "frequency": "daily",
          "compress": false,
          "flushInterval": 1000
        }
      }
    ]
  },
  "features": {
    "models": "./src/models",
    "schemas": "./src/schemas"
  }
}
```

`configVersion` identifies the configuration format. It is independent of the installed `@ambiten/core` package version.

### Schema module

Create `src/schemas/user.schema.ts`:

```ts
import type { SchemaDefinition } from "@ambiten/core";

export const userSchema: SchemaDefinition = {
  tenantId: {
    type: "string",
    required: true,
    default: {
      $runtime: "context",
      key: "tenantId"
    }
  },

  username: {
    type: "string",
    required: true
  },

  email: {
    type: "string",
    required: true
  },

  createdAt: {
    type: "date",
    default: {
      $runtime: "now"
    }
  }
};
```

Export the schema definition object. Bootstrap constructs and registers the schema instance.

Do not export a `Schema.create(...)` result as the configuration module’s selected export.

### Model module

Create `src/models/user.model.ts`:

```ts
import type { BootstrapModelOptions } from "@ambiten/core";

export const userModelOptions: BootstrapModelOptions = {
  collectionName: "users"
};
```

Export the model options object. Bootstrap supplies the initialized schema and provider when it constructs the model.

Do not export an already constructed `Model(...)` instance as the selected model configuration export.

### Tenant resolver module

Create `src/tenantResolver.ts`:

```ts
import type { TenantConfigResolver } from "@ambiten/core";

export const resolveTenantConfig: TenantConfigResolver = (
  tenantId
) => {
  if (tenantId !== "tenant5") {
    return undefined;
  }

  return {
    uri: "mongodb://localhost:27017/my-app_tenant5",
    dbName: "my-app_tenant5",
    metadata: {
      tier: "standard"
    }
  };
};
```

This example resolves one additional tenant without registering it in the static `tenants` map.

The function can also be asynchronous when configuration comes from an external service or database.

Its result contains:

- `uri`: the tenant’s MongoDB connection URI.
- `dbName`: an optional database name.
- `metadata`: optional application-defined information.

Return `undefined` or `null` when the tenant cannot be resolved.

The result does not need `tenantId`, `lazy`, or a MongoDB client. Registration and connection state belong to `MultiTenantManager`.

### Module loading rules

| Setting | Behavior |
| --- | --- |
| `path` | Identifies the module to load. |
| `exportName` | Selects an export; defaults to `"default"` when omitted. |
| Module path in a JSON configuration | Resolved relative to the configuration file’s directory. |
| Module path in a programmatic configuration object | Resolved relative to `process.cwd()`. |

A `schema` or `model` value can be either inline configuration or a module reference. Do not mix inline fields with `path` and `exportName` in the same object.

The loader resolves the referenced exports before bootstrap creates the schema and model.

The `features.schemas` and `features.models` paths describe scaffolding directories. They do not make bootstrap scan those directories or automatically register every file.

Runtime configuration is connected through the top-level `schema` and `model` properties.

### TypeScript modules

Configuration modules are loaded through native dynamic import.

When referencing `.ts` files, run the application with TypeScript support that also handles those imports. For example:

```bash
pnpm add -D tsx
pnpm exec node --import tsx src/main.ts
```

A CommonJS TypeScript require hook alone may not handle these dynamically imported `.ts` modules.

For a compiled JavaScript deployment, update the configuration paths to the emitted files, for example:

```json
{
  "schema": {
    "path": "./dist/schemas/user.schema.js",
    "exportName": "userSchema"
  },
  "model": {
    "path": "./dist/models/user.model.js",
    "exportName": "userModelOptions"
  }
}
```

This fragment assumes the configuration file remains in the project root and the build emits those files beneath `dist`.

## What the Factory Initializes

<BootstrapCapabilitiesOverview />

Initialization follows the configured startup sequence:

| Stage | Behavior |
| --- | --- |
| Configuration | Loads, normalizes, validates, and resolves configuration modules. |
| Logger | Initializes logging and prepares configured file destinations. |
| Redis | Connects when Redis caching is enabled and a Redis URI is supplied. |
| Database provider | Initializes and connects the configured provider. |
| Schema | Constructs and registers the configured schema definition. |
| Model | Constructs the model using the schema and provider. |
| Multi-tenancy | Registers configured static tenants and installs the dynamic resolver when enabled. |
| GraphQL | Initializes GraphQL and generates its schema when enabled. |
| Garbage collector | Constructs the configured garbage-collection runner when enabled. |

If no schema is supplied, bootstrap creates an empty schema and logs a warning.

If no model configuration is supplied, the default collection name is `"default"`.

The factory prepares application infrastructure. Request-specific identity is established later by a framework adapter or an explicit execution context.

## Logging During Bootstrap

With the built-in defaults, bootstrap configures console logging and a rotating file destination at:

```text
./logs/ambiten.log
```

Before constructing file transports, bootstrap creates missing parent directories and opens the destination file in append mode.

Existing log contents are preserved.

Relative log filenames are resolved from `process.cwd()`, independently of the configuration file’s location.

### Explicit transport configuration

A non-empty `logger.transportConfigs` list selects the configured transports.

Include a `"file"` or `"rotating-file"` transport when file logging is required. An explicit console-only list does not create a log directory.

The configuration example above includes both console and rotating-file transports.

When logging is disabled through `logger.enabled: false`, bootstrap does not prepare file transports.

When a programmatic configuration supplies a logger instance or executable transport instances, those instances define their own destinations. Bootstrap does not automatically add its default file transport to them.

### Buffered output

The destination file is prepared during initialization, but a transport may buffer log entries before writing them.

Await `runtime.shutdown()` during application shutdown so the logger’s shutdown hook can flush buffered output.

## Multi-Tenancy During Bootstrap

Enable multi-tenancy in the configuration before creating the runtime:

```json
{
  "multiTenant": {
    "enabled": true,
    "tenants": {
      "tenant1": "mongodb://localhost:27017/my-app_tenant1"
    },
    "initOptions": {
      "lazy": true
    }
  }
}
```

Bootstrap automatically processes this configuration. An additional registration call is unnecessary for tenants already listed there.

Additional static tenants can be registered through the runtime:

```ts
await runtime.registerMultiTenancy({
  tenants: {
    tenant2: "mongodb://localhost:27017/my-app_tenant2",
    tenant3: "mongodb://localhost:27017/my-app_tenant3"
  },
  lazy: true
});
```

`registerMultiTenancy()` requires the runtime configuration to have `multiTenant.enabled: true`. It does not enable multi-tenancy on an otherwise disabled runtime.

Existing registered tenants are skipped.

### Lazy tenant connections

With `lazy: true`, static tenant registration does not immediately open each tenant’s MongoDB connection.

For the earlier configuration, before any tenant is used:

```ts
MultiTenantManager.getStats();
```

may return:

```ts
{
  registeredTenants: 1,
  connectedTenants: 0,
  lazyTenants: 1,
  dynamicResolverEnabled: true
}
```

These statistics describe the tenant registry.

Bootstrap still connects its main database provider during initialization. Lazy tenant registration does not mean that startup performs no database connection.

## Static and Dynamic Tenants

Static tenants are supplied in `multiTenant.tenants` and registered during startup.

Dynamic tenants are discovered when an unknown tenant ID is resolved through `MultiTenantManager`.

A resolver-only configuration is supported: the static tenant map can be omitted or empty.

The factory loads the configured resolver module and installs its function. It does not call the resolver to enumerate every external tenant at startup.

Once discovered, a tenant is registered locally and can obtain a MongoDB client when an operation requires one.

### Registering a resolver programmatically

`setTenantConfigResolver()` accepts a function:

```ts
import { MultiTenantManager } from "@ambiten/core";
import { resolveTenantConfig } from "./tenantResolver";

MultiTenantManager.setTenantConfigResolver(
  resolveTenantConfig
);
```

It does not accept an object containing a `resolve()` method.

For programmatic bootstrap configuration, the same function can be supplied as `multiTenant.tenantConfigResolver`.

Use either `tenantConfigResolver` or `tenantConfigResolverModule` in a configuration, not both.

When the module reference is already configured, bootstrap installs the resolver automatically; a separate setter call is unnecessary.

To remove the installed resolver:

```ts
MultiTenantManager.clearTenantConfigResolver();
```

Clearing the resolver does not remove registered tenants or close their clients.

See [Dynamic Tenants](/multi-tenancy/dynamic-tenants) for the discovery lifecycle.

## Adapter Integration

Install the framework adapter on the actual framework application after bootstrap completes and before application routes begin handling requests.

For Express:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant =
        await MultiTenantManager.resolveTenant(tenantId);

      return Boolean(tenant);
    }
  }
});
```

This validation can discover an externally configured tenant. A local-only check such as `hasTenant()` would reject a tenant that has not yet been discovered.

Tenant existence validation establishes that configuration is available. Authorization must also establish that the caller is permitted to access the selected tenant.

Passing an adapter through the factory’s options does not install it on an Express application. Framework installation remains an explicit application step.

The request flow is:

1. The adapter resolves the request’s tenant ID.
2. Configured tenant validation runs.
3. The adapter enters `AmbitenContext`.
4. Application code invokes a model operation.
5. Ambiten resolves the tenant’s database resources.
6. The operation executes against the selected database.

The factory is not involved in selecting the tenant for each request.

## Models and Execution Context

The runtime exposes the initialized schema and model:

```ts
const schema = runtime.getSchema();
const UserModel = runtime.getModel();
```

A model prepared during bootstrap can participate in different tenant executions.

Within an adapter-established context:

```ts
const user = await UserModel.create({
  username: "Abinod Ltd",
  email: "hello@abinod.com"
});
```

The schema shown earlier obtains `tenantId` from `AmbitenContext` and generates `createdAt` when the document is validated.

For work outside a framework adapter, establish the execution context explicitly:

```ts
import { AmbitenContext } from "@ambiten/core";

await AmbitenContext.run(
  {
    tenantId: "tenant5"
  },
  async () => {
    const UserModel = runtime.getModel();

    await UserModel.create({
      username: "Abinod Ltd",
      email: "hello@abinod.com"
    });
  }
);
```

This example assumes the runtime has already initialized the configuration shown above.

A schema default that requests `tenantId` cannot resolve it when no tenant ID exists in the active context. Bootstrap does not supply a request tenant automatically.

## Runtime Lifecycle

<BootstrapLifecycleFlow />

A typical application lifecycle has three phases:

1. **Startup:** create the runtime, complete application setup, and install adapters.
2. **Execution:** accept requests or jobs and perform operations within their execution contexts.
3. **Shutdown:** stop accepting work, allow active work to finish, and close owned resources.

Create the runtime before opening the server’s listening port.

Keep shutdown at the application lifecycle boundary. Do not shut down the shared runtime after an individual request.

## Lifecycle Hooks

The runtime exposes `onConnect()`:

```ts
runtime.onConnect(() => {
  console.log("Ambiten database provider connected");
});
```

When registered on the runtime returned by `create()`, the provider is already connected, so the callback is invoked immediately.

`onConnect()` returns `void`. An asynchronous callback registered after connection is not awaited by the caller.

For application setup that must finish before serving requests, await that work directly after creating the runtime:

```ts
const runtime = await AmbitenBootstrapFactory.create({
  config: "./ambiten.config.json"
});

// Perform and await application-specific setup here.

runtime.getLogger().info("Application startup complete");
```

Awaiting `create()` is the startup boundary for the factory’s configured initialization sequence.

## Shutdown

The runtime provides:

```ts
await runtime.shutdown();
```

In v1.3.0, this:

- Disconnects the shared Redis client when it is open.
- Closes the runtime’s configured database provider.
- Logs shutdown completion.
- Invokes the logger’s available shutdown, close, or stop hook.

The logger shutdown hook is preferred so buffered file output can be flushed.

### Resources the application must coordinate

`runtime.shutdown()` does not close the HTTP server, explicitly close clients stored in `MultiTenantManager`, or stop application-owned workers and schedulers.

The application should coordinate shutdown in this order:

1. Stop accepting requests and new jobs.
2. Wait for active work to finish.
3. Stop any application-owned recurring tasks.
4. Close tenant clients owned by the application.
5. Shut down the Ambiten runtime.

`MultiTenantManager.clearTenants()` only clears registry entries. It does not close MongoDB clients.

Close clients before discarding their registry entries.

## Recommended Startup Pattern

The following example uses the module-based configuration above.

It initializes Ambiten, installs the Express adapter, registers a route, and coordinates shutdown for the HTTP server, tenant clients, and runtime.

```ts
import { createServer } from "node:http";
import express from "express";

import {
  AmbitenBootstrapFactory,
  MultiTenantManager,
  type AmbitenRuntime
} from "@ambiten/core";

import { createExpressAdapter } from "@ambiten/adapter-express";

async function closeRuntime(
  runtime: AmbitenRuntime
): Promise<void> {
  const clients = new Set(
    MultiTenantManager.getAllTenants().flatMap(
      (tenant) => tenant.client ? [tenant.client] : []
    )
  );

  const results = await Promise.allSettled(
    [...clients].map((client) => client.close())
  );

  // Attempt runtime shutdown even if a tenant client failed to close.
  results.push(
    ...await Promise.allSettled([
      runtime.shutdown()
    ])
  );

  const failure = results.find(
    (result) => result.status === "rejected"
  );

  if (failure?.status === "rejected") {
    throw failure.reason;
  }

  MultiTenantManager.clearTenants();
  MultiTenantManager.clearTenantConfigResolver();
}

async function main(): Promise<void> {
  const runtime = await AmbitenBootstrapFactory.create({
    config: "./ambiten.config.json"
  });

  const app = express();
  const server = createServer(app);

  try {
    app.use(express.json());

    const adapter = createExpressAdapter();

    await adapter.install(app, {
      tenancy: {
        header: "x-tenant-id",

        validate: async (tenantId) => {
          const tenant =
            await MultiTenantManager.resolveTenant(tenantId);

          return Boolean(tenant);
        }
      }
    });

    const UserModel = runtime.getModel();

    app.post("/users", async (req, res, next) => {
      try {
        const user = await UserModel.create({
          username: req.body?.username,
          email: req.body?.email
        });

        res.status(201).json(user);
      } catch (error) {
        next(error);
      }
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);

      server.listen(3000, () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    await closeRuntime(runtime);
    throw error;
  }

  runtime.getLogger().info(
    "Application listening on port 3000"
  );

  let shutdownPromise: Promise<void> | undefined;

  function shutdown(): Promise<void> {
    shutdownPromise ??= (async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      await closeRuntime(runtime);
    })();

    return shutdownPromise;
  }

  function handleShutdown(): void {
    void shutdown().catch((error) => {
      console.error("Application shutdown failed:", error);
      process.exitCode = 1;
    });
  }

  process.once("SIGINT", handleShutdown);
  process.once("SIGTERM", handleShutdown);
}

void main().catch((error) => {
  console.error("Application startup failed:", error);
  process.exitCode = 1;
});
```

The cleanup example assumes this application owns the tenant clients in the process-wide registry.

Applications that also start workers, subscriptions, scheduled tasks, or other long-lived services should stop those services before closing the database resources they use.

The example uses `async main()` so it does not require top-level `await` in a CommonJS application.

## Optional Runtime Services

Additional services are available when enabled in configuration.

| Runtime method | Purpose |
| --- | --- |
| `getGraphQL()` | Retrieves the initialized GraphQL service. |
| `getGCRunner()` | Retrieves the initialized garbage-collection runner. |
| `cache()` | Uses the runtime’s Redis-backed cache helper. |
| `invalidateCache()` | Invalidates cached data for a tenant and optional namespace. |

`getGraphQL()` and `getGCRunner()` throw when their services have not been initialized.

Enable and configure the corresponding service before using it.

## Relationship with AmbitenClient

`AmbitenClient` provides lower-level database infrastructure access.

`AmbitenBootstrapFactory` assembles the broader application runtime around its configured provider, schema, model, logger, and optional services.

Use the factory when the application needs this coordinated startup sequence.

A smaller script or specialized integration can use lower-level APIs directly and manage its own resource lifecycle.

## ESM and CommonJS

Ambiten provides package entry points for ESM and CommonJS consumers.

Framework adapters and Core must participate in the same compatible runtime context so tenant identity remains available across package boundaries.

Use supported public package imports:

```ts
import {
  AmbitenBootstrapFactory,
  AmbitenContext
} from "@ambiten/core";
```

Avoid importing implementation files from package `dist` directories.

ESM and CommonJS package support does not automatically make every application module format loadable. Referenced TypeScript modules still require appropriate runtime support or compilation to JavaScript.

## Best Practices

- Create and await the runtime before accepting application work.
- Use an explicit configuration path when startup locations vary.
- Keep large schema definitions and model options in configuration modules.
- Export definition and options objects from schema and model configuration modules.
- Configure the tenant resolver as a function.
- Enable multi-tenancy in configuration before relying on tenant-aware provider access.
- Install adapters on the actual framework application.
- Use explicit execution contexts for background work.
- Include a file transport when customizing logging and file output is required.
- Drain application work before closing tenant clients and the runtime.

## Related Pages

- [Schema](/models/schema)
- [AmbitenClient](/reference/api/ambiten-client)
- [Context](/core/context)
- [Adapters Overview](/adapters/overview)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolver)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/multi-tenancy/framework-adapters)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [CLI Init](/advanced/cli-init)