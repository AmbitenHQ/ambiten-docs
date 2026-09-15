---
title: CLI Init
description: Scaffold an Ambiten application with configuration, runtime bootstrap, framework adapters, and operational infrastructure aligned to Ambiten's execution model.
---

# CLI Init

The Ambiten CLI scaffolds the architectural foundation for an Ambiten-powered application.

Rather than generating isolated starter files, it creates a runtime-oriented project structure where configuration, startup orchestration, framework integration, models, and optional operational services are already organized around Ambiten's runtime model.

The CLI does **not** execute the Ambiten runtime itself.

It prepares the application structure that `AmbitenBootstrapFactory` will initialize later.

```text
CLI
→ scaffolds application architecture

AmbitenBootstrapFactory
→ prepares runtime infrastructure

Framework Adapter
→ establishes execution boundaries

AmbitenContext
→ carries execution state

MultiTenantManager
→ manages tenant infrastructure

AmbitenModel
→ performs data operations
```

In short:

```text
The CLI creates the structure.

The factory prepares the runtime.

Adapters enter the runtime.

Context carries execution state.

Models perform operations.
```

## Why the CLI Exists

Runtime-oriented applications often begin small and gradually accumulate infrastructure across unrelated files:

```text
database initialization
logging
Redis
GraphQL
tenant configuration
framework setup
garbage collection
models
startup hooks
```

Over time, startup behavior can become fragmented and difficult to reason about.

The Ambiten CLI establishes a consistent architecture from the beginning.

```text
Without CLI scaffolding
→ runtime structure evolves independently

With CLI scaffolding
→ runtime boundaries are established from the first commit
```

The generated project is designed around the same lifecycle used by Ambiten itself:

```text
Configuration
      ↓
Bootstrap
      ↓
Runtime Infrastructure
      ↓
Framework Adapter
      ↓
Execution Context
      ↓
Application Logic
```

## Quick Start

Create a new Ambiten project:

```bash
npx ambiten init my-app
```

Then enter the generated project:

```bash
cd my-app
```

If dependencies were not installed during generation:

```bash
npm install
```

Start development using the generated project scripts:

```bash
npm run dev
```

## Interactive Mode

Run the CLI without a project name:

```bash
npx ambiten init
```

The CLI enters interactive mode and guides project generation through the available runtime capabilities.

Depending on the CLI version and selected options, prompts may include capabilities such as:

```text
MongoDB configuration
multi-tenancy
GraphQL
Redis
logging
garbage collection
dependency installation
```

Interactive mode is not only a convenience layer.

It allows the generated project structure to reflect the operational requirements of the application before runtime execution begins.

## Command Structure

```bash
ambiten init [projectName] [options]
```

## Options

| Option | Description |
| --- | --- |
| `--with-graphql` | Enable GraphQL runtime scaffolding |
| `--with-redis` | Enable Redis integration |
| `--logger` | Enable runtime logging |
| `--multi-tenant` | Enable multi-tenant configuration |
| `--uri <mongodbUri>` | Configure the MongoDB connection URI |
| `--rbac` | Enable RBAC support when available |
| `--with-garbage-collector` | Enable lifecycle cleanup support |
| `--install` | Install generated dependencies automatically |

The exact generated surface depends on the capabilities selected during initialization.

## Example: Multi-Tenant Application

A larger Ambiten application might be scaffolded with:

```bash
npx ambiten init my-saas \
  --multi-tenant \
  --with-graphql \
  --with-redis \
  --logger \
  --with-garbage-collector \
  --install
```

This prepares a project structure capable of supporting:

```text
MongoDB
multi-tenancy
runtime context
GraphQL
Redis
logging
garbage collection
framework integration
```

without requiring those concerns to be assembled manually after generation.

## Generated Project Structure

A generated project typically follows a structure similar to:

```text
my-app/
├── ambiten.config.json
├── package.json
├── tsconfig.json
│
├── src/
│   ├── main.ts
│   │
│   ├── core/
│   │   └── initAmbiten.ts
│   │
│   ├── models/
│   ├── utils/
│   ├── types/
│   │
│   ├── graphql/       (optional)
│   └── gc/            (optional)
│
└── scripts/
    └── runGC.ts       (optional)
```

The structure is intentionally organized around runtime boundaries rather than framework conventions alone.

A generated project separates:

```text
configuration
startup
framework integration
execution
application code
operational infrastructure
```

so those concerns can evolve independently.

## Configuration-First Runtime

The CLI generates:

```text
ambiten.config.json
```

as the central runtime configuration surface.

For example:

```json
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

The exact configuration depends on the selected runtime capabilities.

The important architectural principle is:

```text
configuration
      ↓
AmbitenBootstrapFactory
      ↓
runtime infrastructure
```

rather than scattering infrastructure setup throughout application entry points.

## Generated Runtime Initialization

The CLI creates a startup layer based on `AmbitenBootstrapFactory`.

For example:

```ts
import {
  AmbitenBootstrapFactory
} from "@ambiten/core";

export async function initAmbiten() {
  return AmbitenBootstrapFactory.create();
}
```

Then the application can initialize the runtime once:

```ts
const runtime =
  await initAmbiten();
```

The factory reads the runtime configuration and prepares the configured infrastructure before application execution begins.

The CLI therefore creates the startup structure.

`AmbitenBootstrapFactory` performs the actual initialization.

## What the Generated Runtime Can Initialize

<BootstrapCapabilitiesOverview />

Depending on configuration, the runtime may prepare capabilities such as:

```text
MongoDB
schema
model
logging
multi-tenancy
Redis
GraphQL
garbage collection
runtime services
```

Not every generated project uses every capability.

The CLI selects the initial runtime surface according to the requested application architecture.

## Generated Application Entry Point

The generated application entry point connects the initialized runtime to the application's framework.

A representative Express application may look like:

```ts
import express from "express";

import {
  initAmbiten
} from "./core/initAmbiten";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

async function main() {
  const runtime =
    await initAmbiten();

  const app =
    express();

  app.use(
    express.json()
  );

  const adapter =
    createExpressAdapter();

  await adapter.install(app, {
    tenancy: {
      header: "x-tenant-id"
    }
  });

  app.listen(3000);

  return runtime;
}

main().catch((error) => {
  console.error(
    "Application startup failed:",
    error
  );

  process.exitCode = 1;
});
```

The responsibilities are deliberately separated:

```text
initAmbiten()
→ prepares runtime

createExpressAdapter()
→ integrates framework execution

adapter.install()
→ establishes request boundary

application routes
→ execute inside that boundary
```

## Configuration-Driven Multi-Tenancy

When multi-tenancy is defined through the generated Ambiten configuration, runtime initialization can prepare that tenant infrastructure during bootstrap.

This means generated applications should not automatically duplicate configuration-driven tenancy with an unnecessary startup call such as:

```ts
await runtime.registerMultiTenancy();
```

if multi-tenancy has already been configured and initialized through the runtime configuration.

The preferred flow is:

```text
ambiten.config.json
      ↓
AmbitenBootstrapFactory
      ↓
multi-tenancy initialized
      ↓
application starts
```

Programmatic registration remains useful when tenant infrastructure is intentionally supplied at runtime rather than through the configuration file.

For example:

```ts
await runtime.registerMultiTenancy({
  tenants: {
    tenant1:
      "mongodb://localhost:27017/db_tenant1",

    tenant2:
      "mongodb://localhost:27017/db_tenant2"
  },

  lazy: true
});
```

The two approaches represent different startup strategies:

```text
Configuration-driven
→ tenancy declared in runtime configuration

Programmatic
→ tenancy supplied explicitly during startup
```

Applications should normally choose one clear source for initial tenant configuration rather than duplicating registration.

## Multi-Tenancy Architecture

The CLI can prepare an application for multi-tenancy, but multi-tenancy itself spans several runtime responsibilities.

```text
CLI
→ scaffolds tenancy-capable architecture

BootstrapFactory
→ initializes tenant infrastructure

Framework Adapter
→ resolves request tenant identity

AmbitenContext
→ carries tenant identity

MultiTenantManager
→ manages tenant configuration and clients

AmbitenModel
→ executes against the active tenant
```

This distinction is important because enabling multi-tenancy during scaffolding does not mean every tenancy concern belongs in the generated startup file.

## Static Tenants

Static tenants are known during runtime initialization.

Conceptually:

```text
ambiten.config.json
      ↓
tenant1
tenant2
tenant3
      ↓
bootstrap
      ↓
MultiTenantManager
```

When lazy tenancy is enabled, tenants can be registered without immediately opening every MongoDB client.

For example, startup state may become:

```ts
{
  registeredTenants: 3,
  connectedTenants: 0,
  lazyTenants: 3
}
```

Database connections are then activated when tenant operations actually require them.

## Dynamic Tenants

The CLI does not require every future tenant to be known during project generation.

Applications can later extend the runtime with a `TenantConfigResolver`.

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

This allows the generated application to evolve from:

```text
known startup tenants
```

to:

```text
known startup tenants
+
runtime tenant discovery
```

without changing the fundamental project architecture.

Dynamic tenant discovery is runtime behavior, not CLI behavior.

The CLI prepares the application structure in which that behavior can be added.

## Framework Adapter Integration

The CLI prepares adapter-ready application entry points.

Framework adapters are responsible for connecting real framework execution to Ambiten.

Conceptually:

```text
Express / Fastify / NestJS
            ↓
      Framework Adapter
            ↓
       adapter-runtime
            ↓
       AmbitenContext
            ↓
       application
```

The adapter resolves execution-specific information such as tenant identity.

For example:

```http
x-tenant-id: tenant5
```

can become:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

The generated application's downstream services and models do not need to repeatedly inspect framework request objects to determine the tenant.

## CLI vs Framework Adapters

The CLI and adapters solve different problems.

```text
CLI
→ creates application structure

Framework Adapter
→ handles runtime execution boundaries
```

The CLI may generate the adapter integration code, but the adapter only becomes operational when the generated application actually starts.

Conceptually:

```text
Generation time
───────────────
CLI
 ↓
project files


Runtime
───────
BootstrapFactory
 ↓
Adapter
 ↓
AmbitenContext
 ↓
Application
```

This distinction keeps scaffolding and runtime execution independent.

## Tenant Resolution in Generated Applications

For a multi-tenant generated application, adapter configuration may resolve tenancy from a header:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

A request:

```http
POST /users
x-tenant-id: tenant5
```

can then become:

```text
Request
   ↓
Framework Adapter
   ↓
TenantResolver
   ↓
tenant5
   ↓
AmbitenContext
   ↓
Application
```

If tenant validation is required:

```ts
import {
  MultiTenantManager
} from "@ambiten/core";

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant =
        await MultiTenantManager
          .resolveTenant(tenantId);

      if (!tenant) {
        throw new Error(
          `Tenant with ID "${tenantId}" not found.`
        );
      }

      return true;
    }
  }
});
```

This allows both statically registered and dynamically discovered tenants to participate in the same request flow.

## Generated Models

Models belong to the runtime layer, not to the HTTP framework.

A generated application may obtain its configured model from the runtime:

```ts
const model =
  runtime.getModel();
```

Inside a tenant-aware request:

```ts
const user =
  await model.create({
    username: "Abinod Ltd",
    email: "aemma@abinod.com"
  });
```

the active tenant can be resolved from `AmbitenContext`.

Conceptually:

```text
route/controller
      ↓
model.create(...)
      ↓
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
db_tenant5
```

The model does not need to read:

```text
Express headers
Fastify request
NestJS ExecutionContext
```

to determine tenancy.

## Runtime Context in Generated Projects

The generated architecture allows request-specific state to remain separate from application startup configuration.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";

const context =
  AmbitenContext.get();
```

may provide:

```ts
{
  tenantId: "tenant5",
  requestId: "req_123"
}
```

This state exists for the active execution.

It is different from process-level configuration stored in:

```text
ambiten.config.json
```

The distinction is:

```text
ambiten.config.json
→ application/runtime configuration

AmbitenContext
→ current execution state
```

## Generated Architecture

A useful mental model for a CLI-generated Ambiten application is:

```text
                  GENERATION TIME

                       CLI
                        ↓
              Project Structure
                        ↓
              ambiten.config.json
                        ↓
                 source files


                    RUNTIME

             AmbitenBootstrapFactory
                        ↓
                 AmbitenRuntime
                        ↓
                Framework Adapter
                        ↓
                 AmbitenContext
                        ↓
                Application Logic
                        ↓
                  AmbitenModel
                        ↓
               MultiTenantManager
                        ↓
                    MongoDB
```

The CLI only participates in the first half.

Everything below runtime startup happens when the application executes.

## Running the Generated Project

After generation:

```bash
cd my-app
```

Install dependencies when necessary:

```bash
npm install
```

Then start development:

```bash
npm run dev
```

The generated runtime initialization and framework entry point are already in place.

Application development can then focus on:

```text
models
routes/controllers
services
tenant policy
application logic
```

instead of rebuilding the runtime foundation.

## Installation Behavior

Dependencies are not installed automatically unless requested.

To install them during project generation:

```bash
npx ambiten init my-app --install
```

Typical generated dependencies may include:

```text
@ambiten/core
mongodb
selected Ambiten adapter packages
```

and, when selected:

```text
GraphQL dependencies
Redis dependencies
logging support
other optional runtime packages
```

The exact dependency surface depends on the requested capabilities.

## Relationship with AmbitenBootstrapFactory

The CLI and `AmbitenBootstrapFactory` occupy consecutive stages of the application lifecycle.

```text
CLI
→ generates startup architecture

AmbitenBootstrapFactory
→ executes startup architecture
```

For example:

```text
npx ambiten init my-app
        ↓
src/core/initAmbiten.ts created
        ↓
application starts later
        ↓
AmbitenBootstrapFactory.create()
        ↓
runtime ready
```

The CLI generates the bootstrap integration.

The factory performs the actual runtime initialization.

## Relationship with MultiTenantManager

The CLI can generate a tenancy-ready application, but it does not manage runtime tenants.

That responsibility belongs to `MultiTenantManager`.

```text
CLI
→ scaffolds tenancy configuration

Bootstrap
→ initializes tenant infrastructure

MultiTenantManager
→ owns runtime tenant registry
```

After startup, the manager may contain:

```text
tenant1 → registered, lazy
tenant2 → registered, lazy
tenant3 → registered, lazy
```

and later dynamically add:

```text
tenant5 → registered, connected
```

without any involvement from the CLI.

## Relationship with AmbitenContext

The CLI does not create runtime request context.

Framework adapters do.

```text
CLI
→ generated adapter integration

Adapter
→ creates execution boundary

AmbitenContext
→ contains current execution state
```

This separation prevents build-time/project-generation concerns from leaking into request-time behavior.

## Architectural Position

The complete lifecycle is:

```text
CLI
 ↓
Scaffold
 ↓
Configuration
 ↓
AmbitenBootstrapFactory
 ↓
AmbitenRuntime
 ↓
Framework Adapter
 ↓
Tenant Resolution
 ↓
AmbitenContext
 ↓
Application
 ↓
AmbitenModel
 ↓
MultiTenantManager
 ↓
MongoDB
```

<SignalFlow
  aria-label="CLI runtime architecture relationship"
  :items='[
    "CLI",
    "Scaffold",
    "Factory",
    "Adapter",
    "Context",
    "Models",
    "MongoDB"
  ]'
/>

Each stage owns a different responsibility.

## ESM and CommonJS Applications

Generated applications should use the module configuration produced by the CLI and supported by the selected Ambiten packages.

Ambiten's runtime and adapter packages support both ESM and CommonJS consumer boundaries.

Conceptually:

```text
ESM application
→ ESM adapter
→ ESM adapter-runtime
→ ESM Core
```

and:

```text
CommonJS application
→ CommonJS adapter
→ CommonJS adapter-runtime
→ CommonJS Core
```

Applications should avoid manually mixing incompatible module entry points.

Use public package imports:

```ts
import {
  AmbitenBootstrapFactory
} from "@ambiten/core";
```

and:

```ts
import {
  createExpressAdapter
} from "@ambiten/adapter-express";
```

rather than importing internal build paths.

Avoid:

```ts
import something from
  "@ambiten/core/dist/...";
```

Public package exports allow the correct module format to be selected for the consumer environment.

## Graceful Shutdown

Generated long-running applications should shut down Ambiten at the application lifecycle boundary.

For example:

```ts
const runtime =
  await initAmbiten();

process.on(
  "SIGTERM",
  async () => {
    await runtime.shutdown();
    process.exit(0);
  }
);
```

Shutdown should not happen after individual requests.

The runtime represents long-lived application infrastructure.

## Recommended Usage

The CLI is best suited for full applications and long-lived services where startup organization and runtime consistency matter.

It is especially useful for:

- multi-tenant SaaS applications,
- API services,
- GraphQL applications,
- distributed services,
- operationally sensitive systems,
- applications using Redis or runtime logging,
- teams standardizing Ambiten application structure.

Smaller scripts or isolated infrastructure tools may not require the complete generated architecture.

For those cases, direct `AmbitenClient` usage may be more appropriate.

## Best Practices

Keep `ambiten.config.json` as the primary runtime configuration surface for generated applications unless there is a deliberate reason to manage configuration programmatically.

Initialize the Ambiten runtime once during application startup.

Do not duplicate configuration-driven multi-tenancy with unnecessary manual registration.

Keep framework adapter setup in the real framework application entry point.

Use adapters for request-time tenant resolution.

Use `MultiTenantManager` for tenant infrastructure and dynamic discovery.

Use `AmbitenContext` for request- or execution-scoped identity.

Use public package exports instead of internal `dist` paths.

Keep shutdown logic at the application lifecycle boundary.

Allow the generated architecture to evolve intentionally rather than gradually scattering runtime initialization across unrelated files.

## Troubleshooting

### CLI Does Not Prompt

If interactive prompts do not appear:

- confirm that the terminal supports interactive input,
- confirm that supplied command flags are not bypassing the corresponding prompts.

### Dependencies Are Missing

If dependencies were not installed during generation:

```bash
npm install
```

Or generate the application with:

```bash
npx ambiten init my-app --install
```

### ESM or CommonJS Errors

If module-resolution errors appear during startup, verify that the application uses public Ambiten package imports and that the project's TypeScript/Node module configuration matches the intended consumer format.

Avoid importing directly from:

```text
dist/esm
dist/cjs
```

Ambiten's package exports are responsible for selecting the correct runtime entry.

### Tenant Is Not Resolved

If a request reaches the application without the expected tenant context, verify:

```text
adapter installation
      ↓
tenant resolver configuration
      ↓
middleware/interceptor ordering
      ↓
request identity
```

Then inspect:

```ts
AmbitenContext.get().tenantId
```

inside the active request.

For dynamic tenants, also verify that the configured `TenantConfigResolver` can resolve the requested tenant.

## Summary

The Ambiten CLI scaffolds architecture rather than executing runtime behavior.

It creates a configuration-first project where bootstrap, framework adapters, runtime context, models, and optional infrastructure are organized around Ambiten's execution model.

The complete relationship is:

```text
CLI
→ scaffolds

AmbitenBootstrapFactory
→ initializes

Framework Adapter
→ enters execution

AmbitenContext
→ carries request state

MultiTenantManager
→ manages tenant infrastructure

AmbitenModel
→ performs operations
```

This allows generated applications to begin with a coherent runtime architecture while remaining free to evolve their framework, tenancy, infrastructure, and application logic independently.

## Related Pages

- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [Adapters Overview](/framework-adapters/overview)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/multi-tenancy/framework-adapters)
- [Runtime Execution Flow](architecture/runtime-execution-flow)
- [AmbitenClient](/reference/api/ambiten-client)