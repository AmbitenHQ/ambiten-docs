# Tutorial 10 — Instrumentation

> Estimated time: 15–20 minutes

Tutorial 9 added persistence lifecycle policy.

Our runtime now understands:

```text
execution context
tenant identity
tenant infrastructure
transactions
model middleware
schema lifecycle
```

But a production runtime also needs to answer questions about what happened during execution.

For example:

```text
Which operation ran?

Which collection was involved?

Which tenant did it belong to?

Which request triggered it?

Did the operation succeed?

Did it fail?
```

These are instrumentation concerns.

In this tutorial, we will attach a query observer to Ambiten execution and observe model operations without adding telemetry code to every model call.

The architecture becomes:

```text
HTTP Request
      ↓
Express Adapter
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
      ↓
measureQuery()
      ↓
Model Lifecycle / MongoDB
      ↓
Query Observer
      ↓
Structured Runtime Signal
```

## What you will learn

You will learn:

```text
where query instrumentation lives

how observer state belongs to execution context

how model operations emit runtime signals

how tenant and request identity can accompany those signals

why instrumentation is different from logging

why instrumentation is not the same thing as a tracing backend

how observability tooling can build on runtime signals
```

## What you need

Complete [Tutorial 9 — Middleware and Lifecycle](/tutorials/09-middleware-and-lifecycle) first. Use Node.js 22.13 or later, a compatible pnpm installation, and a running MongoDB instance. Some of Core's transitive dependencies require a newer Node release than Core's own declared minimum.

The observation endpoint only reads data and works with standalone MongoDB. The inherited `POST /users/transactional` workflow still requires a replica set or sharded deployment.

## Starting point

The finished checkpoint is independent of the other example directories:

```bash
cd examples/ambiten-tutorial/10-instrumentation
pnpm install
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` for the last command. If you already configured `.env`, keep your existing settings.

```env
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
PORT=3000
```

No logger, tracing, or metrics package is added. The project is named `ambiten-tutorial-10-instrumentation`. When building your own checkpoint from Tutorial 9, copy its source and configuration, excluding `node_modules`, `dist`, and private environment files. Use this checkpoint's package and TypeScript configuration for the compatibility details below.

If you prefer npm, the checkpoint includes `package-lock.json`: use `npm ci`, then `npm run typecheck`, `npm run dev`, or `npm run build` / `npm start`.

```text
10-instrumentation/
├── src/
│   ├── core/
│   │   ├── db.ts
│   │   └── tenancy.ts
│   ├── instrumentation/
│   │   └── query-observer.ts
│   ├── models/
│   │   ├── audit-log.model.ts
│   │   └── user.model.ts
│   ├── policies/
│   │   └── user-lifecycle.ts
│   ├── routes/
│   │   ├── instrumentation.routes.ts
│   │   ├── tenant.routes.ts
│   │   └── users.routes.ts
│   ├── services/
│   │   └── user.service.ts
│   ├── utils/
│   │   └── execution.ts
│   └── index.ts
├── scripts/
│   └── smoke.mjs
├── .env.example
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
└── tsconfig.json
```

### Published-package compatibility

This checkpoint pins `@ambiten/core` to `1.2.4` and `@ambiten/adapter-express` to `1.0.2`. It includes small compatibility measures for those published versions:

- TypeScript uses `module: "ESNext"` and `moduleResolution: "Bundler"` because Core's declarations contain extensionless imports. Application imports retain `.js` extensions in the emitted ESM.
- `@types/express-serve-static-core` is a direct development dependency. The TypeScript `paths` entry selects those Express 5 declarations instead of the legacy `express-serve-static-core` peer package pulled in by Core.
- The schemas use runtime field options such as `{ type: String, required: true }`. A localized `SchemaDefinition<T>` assertion works around Core 1.2.4's incorrect field-definition type; model documents and middleware remain typed.
- `start` uses `node --import tsx --env-file=.env dist/index.js`. The existing `tsx` loader resolves extensionless imports inside the published adapter-types package. Keep development dependencies installed for this tutorial, including when running the compiled checkpoint.
- The inherited cross-model transaction clears only the transaction's collection override inside an inner context. Core 1.2.4 otherwise carries the initiating `users` collection into `AuditLogModel`; the inner scope preserves tenant identity and the session while allowing `audit_logs` to use its own collection.

These compatibility fixes do not add an observability backend or change the instrumentation concept.

## Step 1 — Instrumentation vs logging

Instrumentation answers:

```text
what happened during runtime execution?
```

Logging answers:

```text
what information should be written
to a logging destination?
```

They can work together, but they are not identical.

An instrumentation signal can eventually be sent to:

```text
console output

structured logger

metrics system

trace system

analytics pipeline

operational dashboard
```

Ambiten's responsibility at this layer is to expose runtime signals.

The downstream system decides how those signals are stored, indexed, visualized, or alerted on.

## Step 2 — Model operations are already instrumented

We do not want application code to become:

```ts
startTimer();

try {
  const result =
    await UserModel.find({});

  recordSuccess();

  return result;
} catch (error) {
  recordFailure(error);

  throw error;
}
```

for every database operation.

Ambiten model operations already execute through the runtime instrumentation layer.

Conceptually:

```text
UserModel.find()
      ↓
measureQuery()
      ↓
query execution
```

The application can therefore remain focused on:

```ts
await UserModel.find({});
```

while the runtime observes the operation.

## Step 3 — Observer belongs to execution state

Instrumentation is most useful when it can be correlated with the active execution.

For example:

```text
requestId
tenantId
operation
collection
```

should describe one execution rather than global mutable state.

So the observer belongs inside:

```text
AmbitenContext
```

Conceptually:

```text
AmbitenContext
├── tenantId
├── requestId
├── session
└── observer
```

The observer can then follow the same asynchronous execution scope as the operation it observes.

## Step 4 — Create an observer helper

Create:

```text
src/instrumentation/query-observer.ts
```

Add:

```ts
import { setImmediate as waitForObserver } from "node:timers/promises";
import { AmbitenContext } from "@ambiten/core";

export interface QuerySignal {
  status: "success" | "error";
  requestId?: string;
  tenantId?: string;
  operation?: string;
  collectionName?: string;
  error?: string;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function withQueryObservation<R>(
  operation: () => Promise<R>
): Promise<{ result: R; signals: QuerySignal[] }> {
  const current = AmbitenContext.get();
  const signals: QuerySignal[] = [];

  const observer = {
    onQuery(payload: Record<string, unknown>) {
      const ctx = AmbitenContext.get();
      const signal: QuerySignal = {
        status: "success",
        requestId: ctx.requestId,
        tenantId: ctx.tenantId,
        operation: readString(payload.operation),
        collectionName: readString(payload.collectionName)
      };

      signals.push(signal);
      console.log("[ambiten query]", signal);
    },

    onQueryError(payload: Record<string, unknown>) {
      const ctx = AmbitenContext.get();
      const signal: QuerySignal = {
        status: "error",
        requestId: ctx.requestId,
        tenantId: ctx.tenantId,
        operation: readString(payload.operation),
        collectionName: readString(payload.collectionName),
        error: payload.error instanceof Error
          ? payload.error.message
          : readString(payload.error)
      };

      signals.push(signal);
      console.error("[ambiten query error]", signal);
    }
  };

  return AmbitenContext.run({ ...current, observer }, async () => {
    try {
      const result = await operation();
      return { result, signals };
    } finally {
      // Ambiten 1.2.4 schedules observer callbacks with setImmediate().
      // Flush those callbacks before this demonstration serializes its signals.
      // A failed query still rejects with its original error after this wait.
      await waitForObserver();
    }
  });
}
```

### Observer delivery timing

The published `@ambiten/core@1.2.4` implementation dispatches observer callbacks using `setImmediate()`. A model promise can settle before its observer runs. The helper therefore awaits one event-loop turn in `finally` before the route serializes `signals`.

The callbacks record their signals synchronously. This wait covers callbacks already queued by the awaited operations; it is not a general flush mechanism for detached work or asynchronous telemetry transports.

If the query throws, the error callback is allowed to run, then the original error continues to Express. The helper does not turn a failure into a successful result.

## Step 5 — Preserve the existing context

Notice:

```ts
const current =
  AmbitenContext.get();
```

followed by:

```ts
AmbitenContext.run(
  {
    ...current,
    observer
  },
  ...
);
```

This matters.

Our Express adapter has already established execution state.

For example:

```text
tenantId
requestId
```

and a transaction may additionally establish:

```text
session
```

Spreading the current state makes the intended inheritance explicit. Ambiten 1.2.4 also merges parent state in `run()`; this helper deliberately carries the current values while replacing only the observer for the inner scope. On return, the parent observer is restored.

We want:

```text
Existing Context
      +
Observer
      ↓
Observed Execution
```

Instrumentation augments execution.

It does not redefine tenant identity or transaction state.

## Step 6 — Create an instrumentation endpoint

Create:

```text
src/routes/instrumentation.routes.ts
```

Add:

```ts
import {
  Router
} from "express";

import {
  AmbitenContext
} from "@ambiten/core";

import {
  UserModel
} from "../models/user.model.js";

import {
  withQueryObservation
} from "../instrumentation/query-observer.js";

export const instrumentationRouter =
  Router();

instrumentationRouter.get(
  "/users",
  async (_req, res, next) => {
    try {
      const observed =
        await withQueryObservation(
          async () => {
            return UserModel.find(
              {}
            );
          }
        );

      const ctx =
        AmbitenContext.get();

      return res.json({
        execution: {
          requestId:
            ctx.requestId,

          tenantId:
            ctx.tenantId
        },

        signals:
          observed.signals,

        users:
          observed.result
      });
    } catch (error) {
      next(error);
    }
  }
);
```

The model call remains ordinary:

```ts
UserModel.find({});
```

There is no instrumentation parameter passed into `find()`.

The observer is resolved from the active execution context.

## Step 7 — Mount the route inside the Ambiten boundary

The complete `src/index.ts` connects infrastructure, installs the adapter, and mounts the instrumentation route **after** that execution boundary:

```ts
import express, { type ErrorRequestHandler } from "express";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { MultiTenantManager } from "@ambiten/core";
import { client } from "./core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "./core/tenancy.js";
import { configureUserLifecycle } from "./policies/user-lifecycle.js";
import { instrumentationRouter } from "./routes/instrumentation.routes.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { usersRouter } from "./routes/users.routes.js";

const port = Number(process.env.PORT ?? 3000);

async function closeInfrastructure() {
  try {
    await closeTutorialTenants();
  } finally {
    await client.close();
  }
}

async function main() {
  registerTutorialTenants();
  await client.connect();
  configureUserLifecycle();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Process health is available before the tenant-aware boundary.
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const adapter = createExpressAdapter();
  await adapter.install(app, {
    tenancy: {
      header: "x-tenant-id",
      validate: async tenantId => MultiTenantManager.hasTenant(tenantId)
    }
  });

  app.use("/instrumentation", instrumentationRouter);
  app.use("/tenant", tenantRouter);
  app.use("/users", usersRouter);

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  };
  app.use(handleError);

  const server = app.listen(port, () => {
    console.log(`Ambiten API running on http://localhost:${port}`);
  });

  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(() => {
      void closeInfrastructure().catch(error => {
        console.error("Shutdown failed:", error);
        process.exitCode = 1;
      });
    });
  }

  server.on("error", error => {
    console.error("HTTP server failed:", error);
    process.exitCode = 1;
    void closeInfrastructure().catch(console.error);
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(async error => {
  console.error("Application failed:", error);
  process.exitCode = 1;
  await closeInfrastructure().catch(console.error);
});
```

The route must execute inside the Ambiten boundary because we want its signals correlated with execution state.

Conceptually:

```text
Request
      ↓
Adapter
      ↓
AmbitenContext
      ↓
Instrumentation Route
```

## Step 8 — Run the application

Run:

```bash
pnpm typecheck
```

Then:

```bash
pnpm dev
```

## Step 9 — Observe Tenant A

Run:

```bash
curl \
  http://localhost:3000/instrumentation/users \
  -H "x-tenant-id: tenant-a" \
  -H "x-request-id: tutorial-10-a"
```

The response should conceptually contain:

```json
{
  "execution": {
    "requestId": "...",
    "tenantId": "tenant-a"
  },

  "signals": [
    {
      "status": "success",
      "requestId": "...",
      "tenantId": "tenant-a",
      "operation": "find",
      "collectionName": "users"
    }
  ]
}
```

The server should also log a structured signal.

The important part is not the console output itself.

The important part is that:

```text
query execution
      ↓
runtime instrumentation
      ↓
observer
```

occurred without changing the model call.

## Step 10 — Observe Tenant B

Now:

```bash
curl \
  http://localhost:3000/instrumentation/users \
  -H "x-tenant-id: tenant-b" \
  -H "x-request-id: tutorial-10-b"
```

The same observer code now belongs to another execution:

```text
tenantId = tenant-b
```

So:

```text
Request A
→ Tenant A
→ Query Signal A

Request B
→ Tenant B
→ Query Signal B
```

The observer is not globally switching tenant state.

It reads the execution in which the query occurred.

The adapter reads `x-request-id` in this configuration. Without that header, `requestId` may be absent from JSON. These examples send it explicitly; a production application should establish its own trusted correlation policy.

## Step 11 — Request correlation

Suppose two requests execute concurrently:

```text
Request A
requestId = req-a
tenantId = tenant-a

Request B
requestId = req-b
tenantId = tenant-b
```

Their instrumentation can conceptually remain:

```text
req-a
→ tenant-a
→ find users

req-b
→ tenant-b
→ find users
```

This is why request identity is useful operationally.

A plain message:

```text
users query executed
```

contains little context.

A structured signal:

```text
requestId
tenantId
operation
collectionName
```

is significantly more useful.

## Step 12 — Successful query signals

The observer exposes:

```ts
onQuery(...)
```

for successful query instrumentation.

Our tutorial converts the payload into a small application-facing signal:

```ts
{
  status:
    "success",

  requestId,
  tenantId,
  operation,
  collectionName
}
```

This object is intentionally small.

A real telemetry pipeline may retain additional instrumentation metadata.

## Step 13 — Query error signals

The observer also supports:

```ts
onQueryError(...)
```

This lets instrumentation distinguish:

```text
successful execution
```

from:

```text
failed execution
```

without forcing every caller to implement separate telemetry handling.

Our tutorial records:

```ts
{
  status:
    "error",

  requestId,
  tenantId,
  operation,
  collectionName,
  error
}
```

Application error handling still remains separate.

Instrumentation observes the failure.

It does not replace the application's error boundary.

## Step 14 — Instrumentation does not replace error handling

These are different concerns:

```text
Observer
→ describe operation failure

Express error handler
→ produce HTTP error response
```

For example:

```text
MongoDB operation fails
      ↓
instrumentation error signal
      ↓
error continues upward
      ↓
Express error handler
      ↓
HTTP response
```

Observing an error does not mean swallowing it.

## Step 15 — Instrumentation and middleware are different

Tutorial 9 introduced:

```text
middleware
```

Tutorial 10 introduces:

```text
instrumentation
```

They should not be confused.

Middleware can influence execution:

```text
change filter
change document
enable soft delete
enforce lifecycle policy
```

Instrumentation primarily describes execution:

```text
operation happened
operation succeeded
operation failed
runtime metadata
```

A useful mental model is:

```text
Middleware
→ behavior

Instrumentation
→ signals
```

## Step 16 — Instrumentation and logging are different

Our example currently uses:

```ts
console.log(...)
```

only so that we can see the signal.

That does not mean Ambiten instrumentation is synonymous with console logging.

A production observer could instead send the structured signal to:

```text
@ambiten/logger

OpenTelemetry integration

metrics backend

analytics pipeline

application monitoring system

custom operational store
```

Those systems are downstream consumers.

This tutorial remains focused on the runtime signal itself.

## Step 17 — Do not put domain entities in execution context

Instrumentation context should describe execution.

Appropriate examples include:

```text
tenantId
requestId
collection
operation
session state
runtime metadata
observer
```

Do not use AmbitenContext as a general application data container for things such as:

```text
complete User objects
shopping carts
business documents
large request bodies
arbitrary domain state
```

Context describes how execution behaves.

Application data belongs in application structures.

## Step 18 — Observability is built from signals

One query signal is useful.

A stream of correlated signals is more useful.

Conceptually:

```text
Runtime
      ↓
Instrumentation Signals
      ↓
Collector / Transport
      ↓
Storage / Analysis
      ↓
Operational View
```

Ambiten Core is responsible for runtime instrumentation capability.

It does not by itself imply:

```text
hosted dashboard

distributed trace backend

long-term telemetry storage

automatic alerting system
```

Those require an operational backend or integration.

## Step 19 — Relationship to future operational tooling

This runtime layer creates the raw ingredients that higher-level tooling can use.

For example:

```text
request identity

tenant identity

operation type

collection scope

query outcome

runtime timing

transaction state

other execution metadata
```

can eventually be correlated into richer operational views.

But the important architectural boundary is:

```text
Ambiten Core
→ produces execution signals

Operational system
→ stores, correlates,
  analyzes and presents them
```

The runtime should not pretend that emitting signals is the same as providing a complete observability platform.

## Verify the checkpoint

```bash
pnpm typecheck
pnpm build
pnpm start
```

Stop the development server before starting the compiled server on the same port. Repeat the Tenant A and Tenant B requests against the compiled application. Each response includes `users` and a success signal for the `find` operation on `users`.

The lifecycle middleware from Tutorial 9 is still active. A user hidden by soft deletion should also be absent from `/instrumentation/users`. The observer describes the normal model execution, including that policy.

An empty database still produces a successful `find` signal, with `users: []`. To see a document, create one first:

```bash
curl http://localhost:3000/users \
  -H "content-type: application/json" \
  -H "x-tenant-id: tenant-a" \
  -d '{"name":"Alice","email":"ALICE@example.com"}'
```

The lifecycle hook normalizes the email to `alice@example.com`. Re-run the observed read to see the user and its correlated query signal.

### Automated smoke test

With `mongod` installed and available on `PATH`, run:

```bash
pnpm test:smoke
```

If necessary, set `MONGOD_BINARY` to the full path of your MongoDB server executable first. The test creates its own loopback-only, single-node replica set on an unused port, and starts the compiled server on another unused port. It does not load `.env` settings or use your existing database. It stops its processes and removes only its own temporary database files afterward.

The checks cover populated success signals, concurrent tenant/request isolation, normalization, CRUD, soft deletion, restoration, purge, cross-model transaction commit/rollback, query-error signals, original error propagation, and restoration of the parent observer and session. The error-path check deliberately rejects a model middleware operation; no failure endpoint is added to the application.

For PowerShell, you can use:

```powershell
Invoke-RestMethod http://localhost:3000/instrumentation/users -Headers @{
  'x-tenant-id' = 'tenant-a'
  'x-request-id' = 'tutorial-10-a'
} | ConvertTo-Json -Depth 10
```

## What just happened

Before Tutorial 10:

```text
Request
      ↓
Context
      ↓
Model
      ↓
Middleware
      ↓
MongoDB
```

Now we have:

```text
Request
      ↓
Context
      ↓
Model
      ↓
Instrumentation
      ├── Query Signal
      │
      ↓
Middleware / Schema Lifecycle
      ↓
MongoDB
```

More precisely, the model operation is measured around its execution:

```text
AmbitenModel
      ↓
measureQuery()
      ↓
Model Operation Lifecycle
      ↓
MongoDB
      ↓
Observer Signal
```

The application still performs normal model operations.

Instrumentation belongs to the runtime.

## Runtime flow

The runtime now looks like:

```text
HTTP Request
      ↓
Express Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
├── tenantId
├── requestId
└── observer
      ↓
Application
      ↓
AmbitenModel
      ↓
measureQuery()
      ↓
Effective ModelContext
      ↓
Middleware
      ↓
Schema Lifecycle
      ↓
Tenant Infrastructure
      ↓
MongoDB
      ↓
Instrumentation Signal
      ↓
Observer
      ↓
Application / Telemetry Consumer
```

## Common mistakes

### Treating demonstration headers as authentication

The tenant and request headers demonstrate execution scope; they are not authentication or authorization. Keep this example local. Before exposing an application publicly, derive tenant identity from trusted authentication and restrict database/collection overrides at the boundary. The diagnostic response also contains runtime metadata and should not be exposed indiscriminately.

### Instrumenting every route manually

Avoid wrapping every model call in custom timers and telemetry code when the model operation is already instrumented.

### Treating console output as the instrumentation architecture

`console.log()` is only the demonstration consumer in this tutorial.

The structured signal is the important part.

### Replacing the current context

Do not create an instrumentation context that accidentally removes:

```text
tenantId
requestId
session
```

Preserve the active execution and add instrumentation state.

### Assuming instrumentation is a tracing backend

Runtime signals do not automatically create distributed tracing, long-term storage, dashboards, or alerting.

Those belong to downstream operational infrastructure.

### Making observers application-global mutable state

Instrumentation should remain correlated with the execution it describes.

Execution-scoped observer state avoids globally switching telemetry identity between concurrent requests.

### Swallowing query failures

Observation should not silently convert application failures into successful execution.

Emit the signal, then preserve normal error behavior.

## Checkpoint

The tutorial progression is now:

```text
Tutorial 1
AmbitenClient

Tutorial 2
Schema + Model

Tutorial 3
CRUD

Tutorial 4
Express Adapter

Tutorial 5
Execution Context

Tutorial 6
Tenant Identity

Tutorial 7
Tenant Infrastructure

Tutorial 8
Transaction Continuity

Tutorial 9
Middleware + Lifecycle

Tutorial 10
Instrumentation
```

Our architecture has now reached:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Lifecycle Policy
      ↓
Infrastructure
      ↓
MongoDB
```

with another parallel concern:

```text
Model Execution
      ↓
Instrumentation
      ↓
Structured Signal
```

The mental model is:

```text
Context
carries execution identity.

Model
coordinates persistence operations.

Middleware
controls persistence policy.

Infrastructure
resolves MongoDB resources.

Instrumentation
describes runtime behavior.
```

## Next tutorial

Continue to:

[Tutorial 11 — Background Worker Execution](/tutorials/11-background-worker)

So far our main execution boundary has been HTTP:

```text
Request
      ↓
Express Adapter
      ↓
AmbitenContext
```

But not every application execution begins with a request.

Tutorial 11 will move the same runtime model into:

```text
Background Job
      ↓
Explicit AmbitenContext.run()
      ↓
Tenant Identity
      ↓
Model Operations
      ↓
Instrumentation
      ↓
MongoDB
```

That will demonstrate an important Ambiten principle:

```text
HTTP requests are one execution source.

Workers are another.

AmbitenContext is the common runtime boundary.
```
