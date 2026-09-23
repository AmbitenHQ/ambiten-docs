# Fastify Framework Track

Bring an existing Fastify application into Ambiten's execution model without moving runtime concerns into route handlers.

Fastify owns the HTTP application. Ambiten's Fastify adapter establishes the execution context used by handlers, services, and models. Consumers install the adapter through its public API; they do not implement a second adapter.

## A four-page framework track

This track adapts the Workspace API from the [core tutorials](/tutorials/) to Fastify. It is separate from the numbered series and the [Document-to-PDF SaaS tutorial](/tutorials/pdf-saas).

1. **Fastify Overview** — this page and its runnable execution-context checkpoint.
2. [Runtime Boundary & Tenant-Aware API](/tutorials/frameworks/fastify/tenant-aware-api) — tenant infrastructure and model-backed routes. Planned.
3. [Transaction Continuity](/tutorials/frameworks/fastify/transaction-continuity) — multiple model operations sharing a transaction. Planned.
4. [Middleware, Instrumentation & Production Notes](/tutorials/frameworks/fastify/middleware-instrumentation-production) — reusable policies and application lifetime. Planned.

The initialized checkpoint lives at `examples/ambiten-tutorial/framework-tracks/fastify`; see its [source and README](https://github.com/AmbitenHQ/ambiten-docs/tree/main/examples/ambiten-tutorial/framework-tracks/fastify). It validates two sample tenant registrations and observes request context. It does not open MongoDB connections, perform model operations, or enable transactions.

## Before you begin

Use Node.js 22.15 or newer, npm, and TypeScript. This checkpoint pins `@ambiten/adapter-fastify` **1.0.4**, `@ambiten/core` 1.2.4, and Fastify 5.12.5. No running MongoDB server or credentials are required for this page.

The concepts come from [Execution Context](/tutorials/05-execution-context) and [Tenant Infrastructure Resolution](/tutorials/07-tenant-infrastructure-resolution). Transactions, middleware, and instrumentation arrive later in this track.

## What changes from Express?

Fastify owns routing, plugins, parsing, validation, serialization, and HTTP responses. Ambiten owns execution context for application work reached through the adapter.

```text
Fastify request → Fastify adapter → AmbitenContext → handler / service → model
```

The integration is small: create the adapter, install it before registering the protected routes, and configure the tenant policy. Application handlers consume the active context. They do not construct it or copy request headers into model calls.

## Run the repository checkpoint

```sh
cd examples/ambiten-tutorial/framework-tracks/fastify
npm ci
npm run typecheck
npm run dev
```

Optionally copy `.env.example` to `.env` using `Copy-Item .env.example .env` in PowerShell or `cp .env.example .env` in a POSIX shell. The only setting is `PORT=3000`.

The server listens at `http://127.0.0.1:3000`. Stop it with Ctrl+C before starting another process on the same port.

### Files in this checkpoint

```text
fastify/
├── src/
│   ├── core/
│   │   └── tenancy.ts
│   ├── app.ts
│   └── main.ts
├── test/runtime.test.cjs
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

`tenancy.ts` registers sample tenants using Core's public API. `app.ts` installs the public Fastify adapter and defines routes. `main.ts` owns listening and shutdown. Database clients, models, and model-backed routes belong to the next checkpoint.

### Package and compiler configuration

`package.json`:

```json
{
  "name": "ambiten-framework-track-fastify",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "engines": {
    "node": ">=22.15.0"
  },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test test/runtime.test.cjs"
  },
  "dependencies": {
    "@ambiten/adapter-fastify": "1.0.4",
    "@ambiten/core": "1.2.4",
    "dotenv": "^16.4.7",
    "fastify": "5.12.5",
    "mongodb": "^6.21.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
}
```

The MongoDB driver is installed for Core and the later database page. Installing it does not open a database connection. The application depends on the framework adapter, not its implementation packages.

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmitOnError": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": [
      "node"
    ]
  },
  "include": [
    "src/**/*.ts"
  ]
}
```

`tsx` runs the TypeScript entry point during development; `npm run build` emits the CommonJS launcher at `dist/main.js`.

## Register the sample tenants

Tenant validation needs an application-owned source of known tenants. For this standalone checkpoint, register two local demonstration records with `MultiTenantManager`.

`src/core/tenancy.ts`:

```ts
import { MultiTenantManager } from "@ambiten/core";

export function registerDemoTenants(): void {
  // Registration is lazy: this checkpoint never opens a database connection.
  MultiTenantManager.registerLazyTenant("tenant-a", "mongodb://127.0.0.1:27017", {
    dbName: "ambiten_fastify_tenant_a"
  });
  MultiTenantManager.registerLazyTenant("tenant-b", "mongodb://127.0.0.1:27017", {
    dbName: "ambiten_fastify_tenant_b"
  });
}
```

`registerLazyTenant()` records configuration without opening a connection. This makes `resolveTenant()` usable in the validation callback without requiring MongoDB to be running. The sample database names are server-owned configuration for the next page; this page never accesses them.

In an existing application, use its established tenant registration or resolver instead of these demonstration records.

## Install the adapter and define routes

`src/app.ts`:

```ts
import Fastify from "fastify";
import { createFastifyAdapter } from "@ambiten/adapter-fastify";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { registerDemoTenants } from "./core/tenancy";

export function buildApp(logger = false) {
  registerDemoTenants();
  const app = Fastify({ logger });

  // This root route is outside the tenant-protected child plugin.
  app.get("/health", async () => ({ status: "ok" }));

  app.register(async api => {
    const adapter = createFastifyAdapter();
    await adapter.install(api, {
      tenancy: {
        header: "x-tenant-id",
        validate: async tenantId => {
          const tenant = await MultiTenantManager.resolveTenant(tenantId);
          if (!tenant) {
            throw new Error(`Tenant with ID "${tenantId}" not found.`);
          }
          return true;
        }
      }
    });

    api.get("/context", async () => {
      await new Promise<void>(resolve => setImmediate(resolve));
      const ctx = AmbitenContext.get();
      return {
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
        dbName: ctx.dbName
      };
    });
  });

  return app;
}
```

The adapter is installed once inside a Fastify child plugin, before that plugin's routes are defined. This keeps `/health` outside the tenant-protected scope while `/context` requires a resolvable tenant.

`tenancy.header` selects the identity input. The asynchronous `validate` callback calls the public `MultiTenantManager.resolveTenant()` API and rejects unknown tenants. The callback supplies application policy; Ambiten supplies context propagation.

No application-owned request conversion, lifecycle wrapper, or context-storage mechanism is needed.

## Inspect context inside the handler

`/context` reads `AmbitenContext.get()` after awaited work. It does not read tenant identity from a Fastify request object. The returned tenant and request ID belong to that execution.

First check the ordinary Fastify route:

```sh
curl http://127.0.0.1:3000/health
```

```json
{ "status": "ok" }
```

Then request runtime identity:

```sh
curl -H "x-tenant-id: tenant-a" -H "x-request-id: fastify-tenant-a-001" http://127.0.0.1:3000/context
```

```json
{
  "tenantId": "tenant-a",
  "requestId": "fastify-tenant-a-001"
}
```

Use `curl.exe` in Windows PowerShell when `curl` is an alias. Repeat with `tenant-b` and a different request ID.

With these requests, `dbName` is absent because the checkpoint has not selected a database for the execution. Lazy registration alone does not populate that context field. JSON omits undefined fields. If `x-request-id` is omitted, `requestId` is also absent; this example does not add an ID generator.

Missing tenant identity and an unknown tenant both prevent the route from running. This deliberately minimal checkpoint throws plain errors, so Fastify returns HTTP 500 for those cases; it does not claim a custom 400/401 policy. A production application should define an appropriate error policy without exposing internal details.

::: warning Local diagnostic checkpoint
The tenant header is development input, not authentication or authorization. The adapter also supports database and collection headers; this checkpoint does not configure a production routing policy for those options and must not be treated as a secure data API. Before adding model-backed endpoints, establish trusted infrastructure selection and authorize the caller's tenant access. Do not expose this diagnostic endpoint publicly.
:::

## Startup and shutdown

`src/main.ts`:

```ts
import "dotenv/config";
import { buildApp } from "./app";

export function readPort(value = process.env.PORT): number {
  const port = value === undefined ? 3000 : Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer from 0 to 65535.");
  }
  return port;
}

async function main() {
  const app = buildApp(true);
  try {
    const address = await app.listen({ port: readPort(), host: "127.0.0.1" });
    console.log(`Fastify ready at ${address}`);
    let stopping = false;
    const shutdown = async () => {
      if (stopping) return;
      stopping = true;
      try { await app.close(); }
      catch (error) { console.error("Shutdown failed:", error); process.exitCode = 1; }
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    try { await app.close(); }
    finally { throw error; }
  }
}

if (require.main === module) {
  void main().catch(error => {
    console.error("Fastify startup failed:", error);
    process.exitCode = 1;
  });
}
```

`buildApp()` does not listen by itself, so tests can create independent instances. The launcher validates `PORT`, binds loopback, and closes Fastify on SIGINT/SIGTERM. There are no open database clients at this checkpoint.

## Verify the checkpoint

```sh
npm test
```

The tests build the project and use ephemeral loopback ports. They need no external service and ignore a developer's `.env`.

They verify:

- The published adapter alone retains context through awaited handler work.
- The application's tenant validation uses `MultiTenantManager` without connecting to MongoDB.
- Forty overlapping requests retain separate tenant and request IDs.
- Missing and unknown tenants are rejected, while `/health` stays unprotected.
- Normal Fastify handler behavior, parsed bodies, errors, and HEAD requests still work.
- Both TypeScript and compiled launchers serve real HTTP requests.
- Consumer source does not import adapter implementation packages or construct execution boundaries.

For compiled execution:

```sh
npm run build
npm start
```

## Keep framework objects out of models

Once the next page adds infrastructure and `UserModel`, an ordinary operation remains:

```ts
await UserModel.find({});
```

Do not pass Fastify's request object or repeat its tenant header in every persistence call. The model consumes the established execution context, allowing the same application logic to work behind other supported frameworks.

## Process, execution, and operation lifetimes

| Lifetime | Responsibilities |
| --- | --- |
| Process | Fastify instance, configuration, and tenant registry; later, shared clients and models |
| Execution | Tenant/request identity; later, trusted database selection and transaction state |
| Operation | Model inputs, filters, explicit operation overrides, and middleware state |

Keep required work awaited inside the handler. Do not retain execution context as a substitute for a separate background-job boundary. Transactions are not required merely to establish identity.

## Checkpoint

You now have a runnable TypeScript project, a public Fastify adapter installation, tenant validation, health/context routes, verified asynchronous isolation, and startup/shutdown handling.

Database-backed CRUD, transactions, and model instrumentation are not part of this first checkpoint.

## Next: Tenant-Aware Fastify API

Continue to [Runtime Boundary & Tenant-Aware API](/tutorials/frameworks/fastify/tenant-aware-api). Its detailed brief is still pending. That page will connect the tenant registrations to MongoDB and add model-backed routes. [Transaction Continuity](/tutorials/frameworks/fastify/transaction-continuity) then adds an explicit transaction and a visible commit/rollback workflow.
