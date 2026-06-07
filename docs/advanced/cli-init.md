# CLI Init

The Ambiten CLI scaffolds a production-ready runtime structure for Ambiten applications.

Rather than generating isolated starter files, the CLI creates an architecture-aligned system where configuration, runtime initialization, adapters, execution boundaries, and operational infrastructure are already organized according to Ambiten’s runtime model.

The CLI does not execute the runtime itself.

It prepares the architectural foundation the runtime will later operate inside.

## What the CLI scaffolds

The CLI generates a runtime-first application structure that already follows Ambiten’s architectural conventions.

That includes:

- configuration-first runtime assembly
- runtime initialization through `AmbitenBootstrapFactory`
- adapter-ready application entry points
- optional GraphQL, Redis, logging, and GC infrastructure
- runtime-aware project organization

The generated structure is designed so applications begin from a coherent operational baseline rather than assembling infrastructure incrementally over time.

At a high level, the generated architecture prepares the system to support:

<SignalFlow
  aria-label="CLI architecture flow"
  :items='["Factory", "Adapter", "Context", "Models", "MongoDB"]'
/>

The CLI scaffolds the architecture.
The runtime executes later.

## Quick start

```ts
npx ambiten init my-app
```

This creates a new project directory with runtime configuration, startup orchestration, adapter integration, and the foundational runtime structure already prepared.

## Interactive mode

```bash
npx ambiten init
```

When no project name is provided, the CLI enters interactive mode and prompts for runtime capabilities such as multi-tenancy, GraphQL support, Redis integration, logging, garbage collection, and dependency installation.

Interactive mode is not only about convenience. It allows the generated architecture to align with the operational requirements of the system from the beginning.

## Command structure

```bash
ambiten init [projectName] [options]
```

## Options

| Option                     | Description                          |
| -------------------------- | ------------------------------------ |
| `--with-graphql`           | Enable GraphQL runtime scaffolding   |
| `--with-redis`             | Enable Redis integration             |
| `--logger`                 | Enable runtime logging               |
| `--multi-tenant`           | Enable multi-tenant configuration    |
| `--uri <mongodbUri>`       | Configure MongoDB connection URI     |
| `--rbac`                   | Enable RBAC support (when available) |
| `--with-garbage-collector` | Enable lifecycle cleanup support     |
| `--install`                | Install dependencies automatically   |

## Example: multi-tenant SaaS scaffold

```bash
npx ambiten init my-saas \
  --multi-tenant \
  --with-graphql \
  --with-redis \
  --logger \
  --with-garbage-collector \
  --install
```

This scaffolds a project aligned with Ambiten’s broader runtime capabilities, including tenancy, observability, and operational infrastructure.

## Generated project structure

A generated project typically follows a structure similar to:

```text
my-app/
├── ambiten.config.json
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── core/
│   │   └── initAmbiten.ts
│   ├── models/
│   ├── utils/
│   ├── types/
│   ├── graphql/        (optional)
│   └── gc/             (optional)
├── scripts/
│   └── runGC.ts        (optional)
```

The structure is intentionally organized around runtime boundaries rather than framework conventions alone.

## Generated runtime configuration

The CLI generates a configuration-first runtime surface.

```JSON
ambiten.config.json
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

This configuration becomes the primary source of truth for runtime behavior.

Rather than scattering infrastructure configuration across unrelated startup files, Ambiten centralizes runtime capabilities into a predictable operational surface.

## Generated runtime initialization

The CLI scaffolds a runtime initialization layer powered by `AmbitenBootstrapFactory`.

Example:

```ts
import { AmbitenBootstrapFactory } from "@ambiten/core";

export async function initAmbiten() {
  return AmbitenBootstrapFactory.create();
}
```

The generated initialization layer prepares the runtime using the centralized project configuration while keeping startup orchestration separate from execution flow.

## What the generated runtime initializes

<BootstrapCapabilitiesOverview />

## Generated application entry point

The CLI also scaffolds the application entry boundary.

Example:

```ts
import express from "express";
import { initAmbiten } from "./core/initAmbiten";
import { createExpressAdapter } from "@ambiten/adapter-express";

async function main() {
  const app = express();

  const runtime = await initAmbiten();

  await runtime.registerMultiTenancy();

  const adapter = createExpressAdapter();

  await adapter.install(app, {
    tenancy: {
      header: "x-tenant-id",
      fallback: "default"
    }
  });

  app.listen(3000);
}

main();
```

This structure intentionally separates:

```text
Runtime startup
→ framework integration
→ execution boundaries
→ request execution
```

The generated runtime composition may later be customized, but the default structure is intentionally aligned with Ambiten’s execution architecture.

## Configuration-first architecture

The CLI intentionally promotes configuration-driven runtime assembly.

Example:

```json
{
  "multiTenant": {
    "enabled": true
  },
  "graphql": {
    "enabled": true
  }
}
```

This allows runtime capabilities to evolve without restructuring application code.

As systems grow, configuration-first runtime architecture improves consistency across environments, deployment pipelines, and teams.

## Running the generated project

```bash
cd my-app
npm install
npm run dev
```

Once initialized, the generated project already contains the runtime structure required for development.

## Relationship with AmbitenBootstrapFactory

The CLI and AmbitenBootstrapFactory solve different problems.

```text
CLI                    → scaffolds architecture
AmbitenBootstrapFactory  → prepares the runtime
Adapters               → establish execution boundaries
AmbitenContext           → carries execution state
```

The CLI generates the runtime initialization layer automatically so projects begin with a consistent runtime structure from the first commit.

`AmbitenBootstrapFactory` then becomes responsible for preparing the runtime when the application actually starts.

## Architectural position

The CLI exists before runtime execution begins.

Conceptually:

```text
CLI → Scaffold → Factory → Adapter → Context → Models → MongoDB
```

<SignalFlow 
aria-label="CLI runtime architecture relationship" :items='["CLI", "Scaffold", "Factory", "Adapter", "Context", "Models", "MongoDB"]' />

The CLI generates the structure.
The factory prepares the runtime.
Adapters establish execution boundaries.
Context carries runtime state.
Models execute operations.

## Installation behavior

Dependencies are not installed automatically unless requested.

To install dependencies during generation:

```bash
npx ambiten init my-app --install
```

Typical generated dependencies include:

- @ambiten/core
- mongodb
- selected adapter packages
- optional GraphQL dependencies
- optional Redis dependencies

The exact dependency surface depends on the selected runtime capabilities.

## Recommended usage

The CLI is best suited for full applications and long-lived systems where runtime structure, operational consistency, and startup organization matter.

It is especially valuable for:

- multi-tenant SaaS systems
- GraphQL applications
- distributed services
- operationally sensitive production environments
- teams standardizing runtime architecture

Smaller scripts, isolated experiments, or lower-level infrastructure tooling may not require a generated runtime structure.

In those cases, direct `AmbitenClient` usage is often simpler.

## Best practices

Generated runtime structure should generally remain stable unless the application is intentionally evolving toward a custom runtime architecture.

For generated projects, prefer modifying:

```json
ambiten.config.json
```

rather than rewriting initialization behavior manually.

Keeping runtime configuration centralized improves operational consistency and reduces startup drift across environments.

## Troubleshooting

CLI not prompting

Ensure the terminal supports interactive input and confirm that command flags are not bypassing prompts automatically.

## ESM or module errors

If errors such as:

```bash
ERR_REQUIRE_ESM
```

appear during startup, confirm that runtime tooling and dependencies are aligned to the same module system.

## Missing dependencies

If dependencies were not installed automatically during scaffolding:

```bash
npm install
```

## Summary

The Ambiten CLI scaffolds architecture, not runtime execution.

It generates a configuration-first system where runtime initialization, adapters, execution boundaries, and operational capabilities are already aligned with Ambiten’s execution model.

From the first generated project, applications begin with a runtime structure designed for scalable, context-aware, and operationally coherent systems.

## Related pages

- [AmbitenBootstrap](/advanced/bootstrap-cli)
- [Adapters Overview](/adapters/overview)
- [Multi-Tenancy](/architecture/multi-tenancy)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
