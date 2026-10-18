---
title: CLI Init
description: Scaffold an Ambiten application with configuration, runtime bootstrap, schemas, models, and optional infrastructure.
---

# CLI Init

The Ambiten CLI generates the starting structure for an Ambiten application.

It creates configuration, TypeScript source files, package scripts, and optional GraphQL or garbage-collection starter files. It can also install the generated dependencies.

Application initialization happens later, when the generated entry point calls `AmbitenBootstrapFactory`.

| Component | Responsibility |
| --- | --- |
| CLI | Generates project files and optionally installs dependencies. |
| `AmbitenBootstrapFactory` | Loads configuration and initializes the runtime. |
| Framework adapter | Connects framework requests or invocations to Ambiten. |
| `AmbitenContext` | Carries state for the current execution. |
| `MultiTenantManager` | Manages tenant configuration, discovery, and clients. |
| Ambiten model | Performs operations using the selected database resources. |

## Quick Start

The `ambiten` command is provided by `@ambiten/core`.

Run it through an explicit package reference:

```bash
pnpm --package=@ambiten/core@latest dlx ambiten init my-app
```

With npm:

```bash
npx --yes --package=@ambiten/core@latest ambiten init my-app
```

Complete the prompts, then enter the generated directory:

```bash
cd my-app
```

If dependency installation was skipped:

```bash
pnpm install
```

Review `ambiten.config.json`, make sure the configured MongoDB service is available, and start the application:

```bash
pnpm run dev
```

The generated entry point initializes Ambiten. It does not start an HTTP server automatically.

To reproduce scaffolding from a specific release, replace `@latest` in the CLI command with the version, such as `@1.3.0`.

Selecting a CLI version and selecting the generated application's dependency versions are separate decisions.

## Interactive Configuration

Run without a project name to include the project-name prompt:

```bash
pnpm --package=@ambiten/core@latest dlx ambiten init
```

Supplying a project name skips that prompt, but other unanswered configuration questions remain interactive.

The CLI collects settings for:

- MongoDB connection details.
- Bootstrap schema definitions.
- Bootstrap model options.
- GraphQL.
- Multi-tenancy.
- Logging.
- Redis caching.
- Project garbage collection.
- Dependency installation.

When schema configuration is selected, the CLI requests a JSON definition.

When model configuration is selected, it requests a collection name and optional model-specific `gcConfig`.

The CLI displays a scaffold summary and asks for confirmation before generating files.

Flags preselect their corresponding settings. They do not make the current CLI fully non-interactive.

The npm `--yes` option in the earlier command accepts npm’s package-execution prompt; it does not answer Ambiten’s configuration prompts.

## Command Structure

```bash
ambiten init [projectName] [options]
```

To inspect the available options:

```bash
pnpm --package=@ambiten/core@latest dlx ambiten init --help
```

## Options

| Option | Description |
| --- | --- |
| `--uri <mongodbUri>` | Supplies the main MongoDB connection URI. |
| `--schema` | Enables the bootstrap schema configuration questions. |
| `--no-schema` | Skips bootstrap schema configuration. |
| `--model` | Enables the bootstrap model configuration questions. |
| `--no-model` | Skips bootstrap model configuration. |
| `--with-graphql` | Enables GraphQL configuration and starter files. |
| `--with-redis` | Enables Redis caching defaults. |
| `--logger` | Enables logger configuration. |
| `--multi-tenant` | Enables multi-tenancy and a starter tenant mapping. |
| `--with-garbage-collector` | Enables project garbage-collection configuration and starter files. |
| `--install` | Requests dependency installation after generation. |
| `--rbac` | Reserved; the current CLI rejects this option because RBAC scaffolding is not implemented. |

`--no-schema` and `--no-model` omit those explicit configuration sections. They do not disable the bootstrap runtime’s fallback schema and model.

Without explicit configuration, bootstrap uses an empty schema and the default collection name `"default"`.

## Example: Multi-Tenant Application

```bash
pnpm --package=@ambiten/core@latest dlx ambiten init my-saas --multi-tenant --schema --model --logger --install
```

The CLI still asks for the selected schema and model details and any remaining configuration choices.

To include additional infrastructure:

```bash
pnpm --package=@ambiten/core@latest dlx ambiten init my-saas --multi-tenant --with-graphql --with-redis --logger --with-garbage-collector --install
```

Enable services that the application will use, and review their generated settings before starting the runtime.

## Generated Project Structure

The v1.3.0 generator creates these files and directories:

| Path | Purpose |
| --- | --- |
| `ambiten.config.json` | Application runtime configuration. |
| `package.json` | Dependencies and development, build, and start scripts. |
| `tsconfig.json` | TypeScript compiler configuration. |
| `.gitignore` | Generated exclusions for dependencies, build output, and environment files. |
| `src/main.ts` | Application startup entry point. |
| `src/core/init.runtime.ts` | Calls `AmbitenBootstrapFactory.create()`. |
| `src/dtos/model/` | Initial model directory. |
| `src/dtos/schema/` | Initial schema directory. |
| `src/utils/helper.ts` | Starter utility file. |
| `src/types/config.ts` | Starter type file. |
| `src/graphql/schema.gql` | Optional GraphQL schema starter. |
| `src/graphql/resolvers.ts` | Optional GraphQL resolver starter. |
| `src/graphql/graphql.ts` | Optional GraphQL setup placeholder. |
| `src/gc/gcManager.ts` | Optional garbage-collection helper. |
| `src/gc/gcRunner.ts` | Optional runner that requires application-specific wiring. |

The model and schema directories are initially empty. Selecting schema or model configuration writes configuration values; it does not generate separate user schema or model modules.

The generator does not automatically create an Express application, install a framework adapter, or create a tenant resolver module.

### Directory names in v1.3.0

The current generator creates:

- `src/dtos/model`
- `src/dtos/schema`

However, its default `features.models` and `features.schemas` values use the plural paths `src/dtos/models` and `src/dtos/schemas`.

Align those metadata paths with the directories you use.

Runtime module loading depends on the explicit `schema.path` and `model.path` references, not on the `features` directory values.

## Generated Runtime Initialization

The generated `src/core/init.runtime.ts` exports a `run()` function:

```ts
import { AmbitenBootstrapFactory } from "@ambiten/core";
import type { AmbitenRuntime } from "@ambiten/core";

export async function run(): Promise<AmbitenRuntime> {
  return AmbitenBootstrapFactory.create();
}
```

The generated `src/main.ts` calls this function and reports successful initialization.

The factory loads `ambiten.config.json` and initializes the configured services.

If a different configuration location is needed, update the helper:

```ts
import { AmbitenBootstrapFactory } from "@ambiten/core";
import type { AmbitenRuntime } from "@ambiten/core";

export async function run(): Promise<AmbitenRuntime> {
  return AmbitenBootstrapFactory.create({
    config: "./config/ambiten.config.json"
  });
}
```

An explicit relative configuration path is resolved from the process working directory.

## Runtime Capabilities

<BootstrapCapabilitiesOverview />

The generated configuration can enable MongoDB connectivity, schemas, models, logging, multi-tenancy, Redis, GraphQL, and a garbage-collection runner.

Selecting a capability during scaffolding prepares its initial configuration or starter files. Application-specific integration may still be required.

For example, GraphQL starter files do not automatically create a listening GraphQL server, and the generated garbage-collection runner contains instructions to connect it to an application model.

## Configuration

`ambiten.config.json` is the generated runtime configuration file.

For example, an application with an inline schema, a model, and one static tenant can use:

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
    "username": {
      "type": "string",
      "required": true
    },
    "email": {
      "type": "string",
      "required": true
    },
    "createdAt": {
      "type": "date",
      "default": {
        "$runtime": "now"
      }
    }
  },
  "model": {
    "collectionName": "users"
  },
  "multiTenant": {
    "enabled": true,
    "headerKey": "x-tenant-id",
    "tenants": {
      "tenant1": "mongodb://localhost:27017/my-app_tenant1"
    },
    "initOptions": {
      "lazy": true
    }
  }
}
```

This is a configuration example, not a verbatim copy of every generated default.

`configVersion` identifies the configuration format. It does not need to match the installed Core version.

Each schema field uses a field-options object. Runtime defaults use declarative values such as:

```json
{
  "default": {
    "$runtime": "now"
  }
}
```

See [Schema](/models/schema) for the complete field and runtime-default contract.

## Moving Schema and Model Configuration into Modules

Large schema definitions and model options can be moved out of the main JSON configuration.

Replace the `schema` and `model` properties with module references:

```json
{
  "schema": {
    "path": "./src/dtos/schema/user.schema.ts",
    "exportName": "userSchema"
  },
  "model": {
    "path": "./src/dtos/model/user.model.ts",
    "exportName": "userModelOptions"
  }
}
```

This example uses the singular directory names created by the v1.3.0 generator.

Create `src/dtos/schema/user.schema.ts`:

```ts
import type { SchemaDefinition } from "@ambiten/core";

export const userSchema: SchemaDefinition = {
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

Create `src/dtos/model/user.model.ts`:

```ts
import type { BootstrapModelOptions } from "@ambiten/core";

export const userModelOptions: BootstrapModelOptions = {
  collectionName: "users"
};
```

The selected exports must be a schema definition object and a model options object. Bootstrap constructs the actual schema and model instances.

The current interactive schema prompt accepts an inline schema definition. Configure module references by editing the generated JSON afterward.

Module paths in a JSON configuration are resolved relative to that configuration file’s directory. When `exportName` is omitted, the loader selects the default export.

`features.models` and `features.schemas` do not scan directories or register their contents automatically.

## Running TypeScript Configuration Modules

The generated development script uses:

```json
{
  "dev": "ts-node src/main.ts"
}
```

Configuration modules are loaded through native dynamic import. A CommonJS TypeScript require hook alone may not load referenced `.ts` files.

When using TypeScript schema, model, or tenant resolver modules, install a loader that handles those imports:

```bash
pnpm add -D tsx
```

Update the generated `scripts` section:

```json
{
  "dev": "node --import tsx src/main.ts",
  "build": "tsc",
  "start": "node dist/main.js"
}
```

For compiled JavaScript execution, update module references to the emitted files:

```json
{
  "schema": {
    "path": "./dist/dtos/schema/user.schema.js",
    "exportName": "userSchema"
  },
  "model": {
    "path": "./dist/dtos/model/user.model.js",
    "exportName": "userModelOptions"
  }
}
```

Apply the same change to a tenant resolver module path.

These paths assume that `ambiten.config.json` remains in the project root. TypeScript compilation does not rewrite paths inside that configuration file.

## Configuration-Driven Multi-Tenancy

When `multiTenant.enabled` is true, bootstrap registers the configured tenants and installs any configured tenant resolver.

An additional registration call is unnecessary for the same initial tenant map.

For additional static tenants, the initialized runtime can be used:

```ts
await runtime.registerMultiTenancy({
  tenants: {
    tenant2: "mongodb://localhost:27017/my-app_tenant2"
  },
  lazy: true
});
```

The runtime must already have multi-tenancy enabled in its configuration.

### Static tenants

Static tenants are declared in `multiTenant.tenants`.

The CLI’s starter mapping contains a local example tenant. Replace it with the connection information appropriate for the application.

With `initOptions.lazy: true`, registration defers the tenant connection until it is needed.

Bootstrap still connects its main database provider during startup. Lazy tenant registration does not defer that main connection.

### Dynamic tenants

Add a resolver module when tenant configuration should be discovered at runtime.

For example, update the `multiTenant` section:

```json
{
  "multiTenant": {
    "enabled": true,
    "headerKey": "x-tenant-id",
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
  }
}
```

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

The resolver can also be asynchronous.

Return `undefined` or `null` when the tenant cannot be resolved. Return `uri`, optional `dbName`, and optional `metadata` when it can.

Tenant registration and connection state are managed by `MultiTenantManager`; the resolver result does not need `tenantId`, `lazy`, or a MongoDB client.

For manual registration, pass the function directly:

```ts
MultiTenantManager.setTenantConfigResolver(
  resolveTenantConfig
);
```

Do not pass an object containing a `resolve()` method.

When `tenantConfigResolverModule` is configured, bootstrap installs the function automatically.

See [Dynamic Tenants](/multi-tenancy/dynamic-tenants) for the discovery lifecycle.

## Adding a Framework Adapter

The generated entry point initializes Ambiten without selecting an HTTP framework.

For an Express application, install the framework and adapter:

```bash
pnpm add express @ambiten/adapter-express
pnpm add -D @types/express
```

In the application startup function, initialize the runtime, create the Express application, and install the adapter before registering application routes:

```ts
import express from "express";

import { MultiTenantManager } from "@ambiten/core";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { run } from "./core/init.runtime";

export async function createHttpApplication() {
  const runtime = await run();

  try {
    const app = express();

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

    return {
      app,
      runtime
    };
  } catch (error) {
    await runtime.shutdown();
    throw error;
  }
}
```

This helper prepares the application. The application entry point must call it, register routes, and start the HTTP listener.

The example assumes multi-tenancy is enabled in `ambiten.config.json`. For a single-tenant application, install the adapter without the `tenancy` option.

A tenant configuration lookup establishes that the tenant exists. Application authorization must also establish that the caller can access that tenant.

See [AmbitenBootstrapFactory](/advanced/bootstrap-cli) for a complete Express startup and shutdown example.

## Models and Runtime Context

Retrieve the configured model after initialization:

```ts
const UserModel = runtime.getModel();
```

Inside an adapter-established request context:

```ts
const user = await UserModel.create({
  username: "Abinod Ltd",
  email: "hello@abinod.com"
});
```

Ambiten uses the active tenant context when selecting tenant database resources.

Application services do not need to repeatedly inspect HTTP headers to recover the tenant ID.

For background work, create an execution context explicitly:

```ts
import { AmbitenContext } from "@ambiten/core";

await AmbitenContext.run(
  {
    tenantId: "tenant5"
  },
  async () => {
    await runtime.getModel().create({
      username: "Abinod Ltd",
      email: "hello@abinod.com"
    });
  }
);
```

This example assumes the runtime has initialized the tenant resolver shown earlier.

The CLI creates project files. Adapters and explicit `AmbitenContext.run()` calls establish execution state when the application runs.

## Logging

The generated configuration includes logging defaults with console output and a rotating file destination.

By default, the file destination is:

```text
./logs/ambiten.log
```

The directory and file are prepared when the application initializes logging, not when the CLI creates the project.

Relative log paths are resolved from the application’s working directory.

If the transport list is edited, retain a `"file"` or `"rotating-file"` transport when file logging is required. An explicit console-only list does not create a log directory.

To disable bootstrap logging, explicitly set:

```json
{
  "logger": {
    "enabled": false
  }
}
```

Await runtime shutdown so buffered file output can be flushed.

## Installation Behavior

Dependencies are installed after scaffolding when:

- `--install` is supplied, or
- dependency installation is accepted in the interactive prompts.

Otherwise, install them from the generated project directory:

```bash
pnpm install
```

The installer detects pnpm, Yarn, or npm from an existing lockfile and the package-manager environment, with npm as the fallback.

If automatic installation fails, the generated project files remain available. Resolve the reported installation error and run the chosen package manager manually.

### Core version selection

The current generator writes:

```json
{
  "dependencies": {
    "@ambiten/core": "latest"
  }
}
```

A fresh installation resolves the registry’s `latest` tag.

This does not continuously upgrade an installed application. The installed dependency tree and lockfile record the resolved version.

Check the installed Core version with:

```bash
pnpm list @ambiten/core --depth 0
```

### Generated dependencies

The baseline includes `@ambiten/core` and `mongodb`.

Selected capabilities can add:

| Capability | Additional dependencies |
| --- | --- |
| Logger configuration | `@ambiten/logger` |
| GraphQL | `graphql`, `@apollo/server` |
| Redis caching | `redis` |

Express and framework adapter packages are added when the application integrates those frameworks.

Other generated dependencies use their configured version ranges; the `"latest"` behavior described above applies to Core.

## Development and Production Scripts

The generated package includes:

| Script | Default command |
| --- | --- |
| `dev` | `ts-node src/main.ts` |
| `build` | `tsc` |
| `start` | `node dist/main.js` |

For development:

```bash
pnpm run dev
```

For compiled execution:

```bash
pnpm run build
pnpm start
```

When using referenced TypeScript configuration modules, apply the development loader and production path changes described earlier.

Keep the runtime configuration available at the path used by the application during deployment.

## ESM and CommonJS

The v1.3.0 scaffold generates a CommonJS application configuration:

- `package.json` uses `"type": "commonjs"`.
- TypeScript uses `"module": "commonjs"`.

Ambiten provides public package entry points for both CommonJS and ESM consumers.

Use public imports:

```ts
import {
  AmbitenBootstrapFactory
} from "@ambiten/core";
```

If converting the generated application to ESM, update its package, TypeScript, and runtime settings together.

Use an asynchronous startup function when working with the generated CommonJS configuration; it does not support top-level `await` as an ESM module would.

## Graceful Shutdown

Add shutdown coordination when extending the scaffold into a long-running service.

The application should:

1. Stop accepting requests and new jobs.
2. Wait for active work to finish.
3. Stop background tasks and schedulers.
4. Close tenant clients owned by the application.
5. Await `runtime.shutdown()`.

In v1.3.0, runtime shutdown disconnects the shared Redis client, closes the configured database provider, and invokes logger cleanup.

It does not automatically close an HTTP server or explicitly close clients stored in `MultiTenantManager`.

`MultiTenantManager.clearTenants()` clears registry entries; it does not close their clients.

See [AmbitenBootstrapFactory](/advanced/bootstrap-cli) for the complete lifecycle example.

## Architecture

<SignalFlow
  aria-label="CLI and runtime responsibilities"
  :items='[
    "Scaffold",
    "Bootstrap",
    "Adapter",
    "Context",
    "Model"
  ]'
/>

Project generation, application startup, and request execution happen at different times.

The CLI prepares the initial files. The factory initializes configured infrastructure. Adapters establish request context, and models use that context during operations.

## Troubleshooting

### The CLI command cannot be found

Use the package-qualified command:

```bash
pnpm --package=@ambiten/core@latest dlx ambiten init my-app
```

The executable is named `ambiten`, but the package supplying it is `@ambiten/core`.

### The CLI still prompts after flags are supplied

Flags preselect specific settings. Remaining questions and the final scaffold confirmation are still interactive.

Run the command in a terminal that supports interactive input.

### The CLI version banner differs from the Core version

The v1.3.0 CLI implementation retains a separate `"1.0.0"` version banner.

That banner is not a reliable indication of the Core version installed in the generated application.

Check the dependency directly:

```bash
pnpm list @ambiten/core --depth 0
```

### MongoDB peer dependency warning

The v1.3.0 template writes `mongodb: "^6.14.2"`, while the published `@ambiten/core@1.3.0` peer range is `"^5 || ^7"`.

This is a template dependency mismatch.

Review the generated dependency and select a MongoDB driver version that satisfies both Core’s declared peer range and the application’s Node.js requirements.

Inspect the published requirement with:

```bash
pnpm view @ambiten/core@1.3.0 peerDependencies --json
```

### Referenced `.ts` modules cannot be loaded

Ensure the application process supports dynamically importing TypeScript modules.

For development, use the `tsx` setup described above.

For compiled execution, point configuration references at emitted JavaScript files.

### Model or schema files are not loaded

Check:

- The top-level `schema` or `model` module reference.
- The path relative to the configuration file.
- The selected `exportName`.
- Whether the export is a definition or options object.
- Whether the process can load the module’s file format.

Putting a file in a directory listed under `features` does not register it automatically.

### Configured directories do not exist

In v1.3.0, the generated model and schema directories use singular names, while the default feature metadata uses plural names.

Align the paths with the directories you choose, and make module references point to actual files.

### Logging remains enabled after declining its prompt

The current generator applies enabled logging defaults when logger options are omitted.

Check the generated file and explicitly set `logger.enabled` to `false` when logging should be disabled.

### The log directory is missing

Confirm that:

- The application has started and reached logger initialization.
- Logging is enabled.
- The selected transports include a file destination.
- The process can write to that destination.
- The directory is being checked relative to the process working directory.

### The application initializes but no HTTP port opens

The generated entry point initializes Ambiten. It does not create a framework server.

Install the framework and adapter, register routes, and start the HTTP listener from the application entry point.

### Tenant identity is missing

Check that the adapter is installed before application routes and that its resolver matches the request’s tenant identity source.

Inspect the context inside the active request:

```ts
AmbitenContext.get().tenantId;
```

For dynamic tenants, verify that the configured resolver returns database configuration for the requested ID.

Tenant configuration in `ambiten.config.json` does not install HTTP middleware by itself.

## Related Pages

- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [Configuration Modules](/advanced/configuration-modules)
- [Schema](/models/schema)
- [Adapters Overview](/adapters/overview)
- [Context](/core/context)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolver)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/multi-tenancy/framework-adapters)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [AmbitenClient](/reference/api/ambiten-client)