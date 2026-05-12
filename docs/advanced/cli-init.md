# CLI Init

The Tenra CLI scaffolds a production-ready runtime structure for Tenra applications.

Rather than generating isolated starter files, the CLI creates an architecture-aligned project where configuration, bootstrap initialization, adapters, and runtime boundaries are already organized according to Tenra’s execution model.

The CLI is not part of runtime execution itself.

It prepares the system structure that runtime execution will later operate inside.

## What the CLI scaffolds

The CLI generates a runtime foundation that already follows Tenra’s architectural conventions.

That includes:

- configuration-first runtime structure
- bootstrap initialization wiring
- adapter-ready application entry points
- optional GraphQL, Redis, logging, and GC integration
- runtime-aware project organization

The generated structure is designed so applications begin from a coherent operational baseline rather than assembling infrastructure incrementally over time.

At a high level, the generated system is prepared to support:

<SignalFlow
  aria-label="CLI architecture flow"
  :items='["Bootstrap", "Adapter", "Context", "Models", "MongoDB"]'
/>

The CLI scaffolds the architecture.
The runtime executes later.

## Quick start

```ts
npx tenra init my-app
```

This creates a new project directory with runtime configuration, bootstrap wiring, adapter integration, and the foundational project structure already prepared.

## Interactive mode

```bash
npx tenra init
```

When no project name is provided, the CLI enters interactive mode and prompts for runtime capabilities such as multi-tenancy, GraphQL support, Redis integration, logging, garbage collection, and dependency installation.

The purpose of interactive mode is not convenience alone. It allows the generated architecture to align with the operational requirements of the system from the beginning.

## Command structure

```bash
tenra init [projectName] [options]
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
npx tenra init my-saas \
  --multi-tenant \
  --with-graphql \
  --with-redis \
  --logger \
  --with-garbage-collector \
  --install
```

This scaffolds a project aligned with Tenra’s broader runtime capabilities, including tenancy, observability, and operational infrastructure.

## Generated project structure

A generated project typically follows a structure similar to:

```text
my-app/
├── tenra.config.json
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── core/
│   │   └── initTenra.ts
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

The CLI generates a configuration-first runtime:

```JSON
tenra.config.json
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

Rather than scattering infrastructure configuration across unrelated startup files, Tenra centralizes runtime capabilities into a predictable operational surface.

## Generated bootstrap layer

The CLI scaffolds a bootstrap entry responsible for runtime initialization and adapter integration.

Example:

```ts
import { TenraBootstrapFactory } from "@tenra/core";
import { createExpressAdapter } from "@tenra/express";

export async function initTenra() {
  const adapter = createExpressAdapter();

  return TenraBootstrapFactory.create({
    adapter,
    config: "./tenra.config.json"
  });
}
```

This generated layer initializes the runtime using the project configuration while keeping startup orchestration separate from request execution.

The generated structure may later be customized, but the default composition is intentionally aligned with Tenra’s runtime architecture.

## Application entry point

The CLI also scaffolds the application entry boundary:

```ts
src/main.ts
```

This layer connects the initialized runtime to the surrounding server or execution environment.

The generated structure keeps startup orchestration, adapter integration, and request execution clearly separated.

## Configuration-first architecture

The CLI intentionally promotes configuration-driven runtime assembly.

Example:

```JSON
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

As systems grow, configuration-first architecture improves consistency across environments, deployment pipelines, and teams.

### Running the generated project

```bash
cd my-app
npm install
npm run dev
```

Once initialized, the generated project already contains the runtime structure required for development.

## Relationship with TenraBootstrap

The CLI and TenraBootstrap solve different problems.

```Plain Text
CLI              → scaffolds architecture
TenraBootstrap   → initializes runtime infrastructure
Adapters         → establish request boundaries
TenraContext     → carries execution state
```

The CLI generates the bootstrap layer automatically so projects begin with a consistent runtime structure from the first commit.

`TenraBootstrap` then becomes responsible for runtime initialization when the application actually starts.

## Architectural position

The CLI exists before runtime execution begins.

Conceptually:

```text
CLI → Scaffold → Bootstrap → Adapter → Context → Models → MongoDB
```

<SignalFlow 
  aria-label="CLI runtime architecture relationship" 
  :items='["CLI", "Scaffold", "Bootstrap", "Adapter", "Context", "Models", "MongoDB"]'
 />

The CLI generates the structure.
Bootstrap initializes the runtime.
Adapters establish execution boundaries.
Context carries runtime state.
Models execute operations.

## Installation behavior

Dependencies are not installed automatically unless requested.

To install dependencies during generation:

```bash
npx tenra init my-app --install
```

Typical generated dependencies include:

- @tenra/core
- mongodb
- selected adapter packages
- optional GraphQL dependencies
- optional Redis dependencies

The exact dependency surface depends on the chosen runtime capabilities.

## Recommended usage

The CLI is best suited for full applications and long-lived systems where runtime structure, operational consistency, and startup organization matter.

It is especially valuable for:

- multi-tenant SaaS systems
- GraphQL applications
- distributed services
- operationally sensitive production environments
- teams standardizing runtime architecture

Smaller scripts, isolated experiments, or low-level infrastructure tooling may not require a generated runtime structure.

In those cases, direct TenraClient usage is often simpler.

## Best practices

Generated runtime structure should generally remain stable unless the application is intentionally evolving toward a custom runtime architecture.

For generated projects, prefer modifying:

```JSON
tenra.config.json
```

rather than rewriting initialization behavior manually.

Keeping runtime configuration centralized improves operational consistency and reduces startup drift across environments.

## Troubleshooting

### CLI not prompting

Ensure the terminal supports interactive input and confirm that command flags are not bypassing prompts automatically.

### ESM or module errors

If errors such as:

```sh
ERR_REQUIRE_ESM
```

appear during startup, confirm that runtime tooling and dependencies are aligned to the same module system.

### Missing dependencies

If dependencies were not installed automatically during scaffolding:

```bash
npm install
```

## Summary

The Tenra CLI scaffolds architecture, not runtime execution.

It generates a configuration-first system where bootstrap orchestration, adapters, runtime boundaries, and operational capabilities are already aligned with Tenra’s execution model.

From the first generated project, applications begin with a runtime structure designed for scalable, context-aware, and operationally coherent systems.

## Related pages

- [TenraBootstrap](/advanced/bootstrap-cli)
- [Adapters Overview](/adapters/overview)
- [Multi-Tenancy](/architecture/multi-tenancy)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
