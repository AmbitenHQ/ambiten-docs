# Tutorial 12 — Production Runtime

> Estimated time: 20–25 minutes

This is the final tutorial in the main Ambiten learning path.

We began with:

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

Then gradually introduced:

```text
schemas
models
CRUD
framework adapters
execution context
tenant identity
tenant infrastructure
transactions
middleware
instrumentation
background execution
```

The goal of this final tutorial is not to add another major feature.

It is to organize everything we have built into a runtime structure with clear ownership and lifecycle boundaries.

The final architecture is:

```text
PROCESS
      ↓
Runtime Infrastructure
├── AmbitenClient
├── MultiTenantManager
├── Models
└── Lifecycle Configuration

      ↓

EXECUTION
├── HTTP Request
│     ↓
│   Express Adapter
│
└── Background Job
      ↓
    AmbitenContext.run()

      ↓

AmbitenContext
├── tenantId
├── requestId
├── session
├── observer
└── runtime metadata

      ↓

APPLICATION
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Middleware / Schema Lifecycle
      ↓
Tenant Infrastructure
      ↓
MongoDB
```

## What you will learn

By the end of this tutorial, you will understand:

```text
process lifetime

execution lifetime

operation lifetime

centralized runtime startup

shared process infrastructure

HTTP vs worker execution boundaries

liveness vs readiness

graceful shutdown

configuration ownership

resource reuse

production responsibility boundaries
```

## What you need

Complete [Tutorial 11 — Background Worker Execution](/tutorials/11-background-worker) first. Use Node.js 22.13 or later, pnpm or npm, and MongoDB. The inherited transaction endpoint and full smoke test require a replica set; ordinary API reads and worker summaries work on standalone MongoDB.

This is a production-oriented teaching checkpoint, not a fully hardened deployment. Authentication, tenant authorization, secrets management, TLS, backups, and telemetry infrastructure still require application and deployment work. No query-budget API, queue backend, or `AmbitenBootstrapFactory` rewrite is introduced here.

## Starting point

The complete independent checkpoint is already in the documentation repository:

```bash
cd examples/ambiten-tutorial/12-production-runtime
pnpm install
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env`. Do not overwrite an existing configuration. With npm, use `npm ci` and `npm run <script>`.

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
PORT=3000
```

The package is named `ambiten-tutorial-12-production-runtime`. It retains the API and worker scripts, locked dependencies, and package compatibility measures from Tutorials 10 and 11. The compiled entry points still use `--import tsx`; keep development dependencies installed for this checkpoint.

When building your own copy from Tutorial 11, copy source and configuration only, excluding `node_modules`, `dist`, and private environment files. Do not recursively copy another checkpoint into this already-existing directory.

The final source tree becomes:

```text
12-production-runtime/
├── src/
│   ├── config/
│   │   └── env.ts
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
│   ├── runtime/
│   │   └── runtime.ts
│   ├── services/
│   │   └── user.service.ts
│   ├── utils/
│   │   └── execution.ts
│   ├── index.ts
│   └── worker.ts
├── scripts/
│   ├── runtime-checks.mjs
│   └── smoke.mjs
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
└── tsconfig.json
```

## Step 1 — Think in lifetimes

The most important production concept in this tutorial is not a class or function.

It is lifetime.

Our application contains three different categories of state.

### Process lifetime

Process-level infrastructure lives for a large portion of the Node.js process lifetime.

Examples include:

```text
AmbitenClient

MongoClient connections

MultiTenantManager

model definitions

schema definitions

model lifecycle configuration

application configuration
```

These objects should generally be reusable.

They are not recreated for every request.

### Execution lifetime

Execution state belongs to one logical unit of work.

Examples include:

```text
tenantId

requestId

transaction session

observer

runtime metadata
```

For HTTP, the execution usually begins at the framework adapter.

For workers, it begins at:

```ts
AmbitenContext.run(...)
```

### Operation lifetime

An operation is narrower still.

Examples include:

```text
UserModel.find()

UserModel.create()

UserModel.updateOne()

filter

update document

Effective ModelContext

middleware lifecycle
```

This gives us:

```text
PROCESS
      ↓
many EXECUTIONS
      ↓
many OPERATIONS
```

Confusing those lifetimes creates fragile applications.

## Step 2 — Centralize environment configuration

Earlier tutorials used convenient development fallbacks.

A production-oriented application should know when required configuration is missing.

Create:

```text
src/config/env.ts
```

Add:

```ts
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolvePort(): number {
  const raw = process.env.PORT ?? "3000";
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}. Expected an integer from 1 to 65535.`);
  }
  return port;
}

export const env = Object.freeze({
  mongoUri: requireEnv("MONGO_URI"),
  dbName: requireEnv("DB_NAME"),
  port: resolvePort()
});
```

The application now fails early if required database configuration is missing.

`MONGO_URI` and `DB_NAME` must be nonblank. `PORT` defaults to `3000`, but a supplied value must be an integer from `1` to `65535`. Configuration is resolved once per process; invalid configuration fails before the server accepts work.

## Step 3 — Use configuration from infrastructure

Update `src/core/db.ts`:

```ts
import { AmbitenClient, MultiTenantManager } from "@ambiten/core";
import { env } from "../config/env.js";

export const client = new AmbitenClient({
  uri: env.mongoUri,
  options: { dbName: env.dbName },
  tenantResolver: {
    getClient: async (tenantId: string) => MultiTenantManager.getClient(tenantId)
  }
});
```

The client remains process-level infrastructure.

The tenant resolver still maps execution identity to tenant MongoDB capability.

Update `src/core/tenancy.ts` to use the same configuration:

```ts
import { MultiTenantManager } from "@ambiten/core";
import { env } from "../config/env.js";

export function registerTutorialTenants() {
  for (const [tenantId, dbName] of [
    ["tenant-a", "ambiten_tutorial_tenant_a"],
    ["tenant-b", "ambiten_tutorial_tenant_b"]
  ]) {
    if (!MultiTenantManager.hasTenant(tenantId)) {
      MultiTenantManager.registerLazyTenant(tenantId, env.mongoUri, { dbName });
    }
  }
}

export async function closeTutorialTenants() {
  const tenants = MultiTenantManager.getAllTenants();
  const outcomes = await Promise.allSettled(
    tenants.map(async tenant => { await tenant.client?.close(); })
  );
  MultiTenantManager.clearTenants();

  const errors = outcomes
    .filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected")
    .map(outcome => outcome.reason);
  if (errors.length) {
    throw new AggregateError(errors, "Failed to close tenant MongoDB clients.");
  }
}
```

The two tenant database names remain server-owned demonstration configuration. `DB_NAME` identifies the base runtime database; it does not replace those tenant mappings. Cleanup waits for all activated tenant clients, clears the registry, and reports collected failures.

## Step 4 — Centralize runtime startup

Create:

```text
src/runtime/runtime.ts
```

Add:

```ts
import { MultiTenantManager } from "@ambiten/core";
import { client } from "../core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "../core/tenancy.js";
import { configureUserLifecycle } from "../policies/user-lifecycle.js";

let initialized = false;
let shuttingDown = false;
let initializationPromise: Promise<void> | null = null;
let shutdownPromise: Promise<void> | null = null;

// One startup attempt per process, including concurrent callers.
export function initializeRuntime(): Promise<void> {
  if (shuttingDown) {
    return Promise.reject(new Error("Runtime shutdown has begun; start a new process."));
  }
  if (initialized) return Promise.resolve();

  initializationPromise ??= (async () => {
    await client.connect();
    if (shuttingDown) {
      throw new Error("Runtime shutdown began during initialization.");
    }
    registerTutorialTenants();
    configureUserLifecycle();
    initialized = true;
  })();
  return initializationPromise;
}

export function getRuntimeStatus() {
  const tenants = MultiTenantManager.getAllTenants();
  return {
    initialized,
    shuttingDown,
    tenants: {
      registered: tenants.length,
      connected: tenants.filter(tenant => Boolean(tenant.client)).length
    }
  };
}

// Stop advertising readiness before draining in-flight HTTP requests.
export function beginRuntimeShutdown() {
  shuttingDown = true;
}

export async function checkRuntimeReadiness(): Promise<boolean> {
  if (!initialized || shuttingDown) return false;
  try {
    const db = await client.db();
    await db.command({ ping: 1 }, { timeoutMS: 2000 });
    return initialized && !shuttingDown;
  } catch {
    return false;
  }
}

// Shutdown is terminal and all callers receive the same completion promise.
export function shutdownRuntime(): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  beginRuntimeShutdown();

  shutdownPromise = (async () => {
    // A startup failure is reported by its caller; cleanup must still run.
    await initializationPromise?.catch(() => {});
    const errors: unknown[] = [];
    try {
      await closeTutorialTenants();
    } catch (error) {
      errors.push(error);
    }
    try {
      await client.close();
    } catch (error) {
      errors.push(error);
    } finally {
      initialized = false;
    }
    if (errors.length) {
      throw new AggregateError(errors, "Runtime cleanup failed.");
    }
  })();
  return shutdownPromise;
}
```

This is application orchestration.

It does not replace Ambiten.

Its purpose is to establish explicit ownership of process-level resources.

The initialization promise coalesces simultaneous startup calls, while the shutdown promise coalesces repeated cleanup calls. Shutdown is terminal: this small runtime is not designed to be restarted in the same process.

`beginRuntimeShutdown()` changes readiness without closing connections. HTTP uses it before draining requests; `shutdownRuntime()` closes infrastructure after the drain. A shutdown racing with initialization waits for startup to settle before cleanup, and a tenant-close failure does not skip base-client cleanup.

## Step 5 — Startup is process infrastructure

The initialization path is now:

```text
Process Starts
      ↓
initializeRuntime()
      ↓
Connect AmbitenClient
      ↓
Register Tenant Infrastructure
      ↓
Configure Model Lifecycle
      ↓
Runtime Ready
```

This happens once per process.

It should not happen once per request.

## Step 6 — Different processes initialize separately

Our project has two executables:

```text
HTTP API

Background Worker
```

They use the same source module:

```text
initializeRuntime()
```

But if they run as different Node.js processes, they do not share memory.

Conceptually:

```text
API Process
├── AmbitenClient
├── MultiTenantManager
└── models

Worker Process
├── AmbitenClient
├── MultiTenantManager
└── models
```

Shared code does not mean shared live objects.

Each process initializes its own runtime infrastructure.

## Step 7 — Keep execution boundaries separate

HTTP execution:

```text
Request
      ↓
Express Adapter
      ↓
AmbitenContext
```

Worker execution:

```text
Job
      ↓
AmbitenContext.run()
      ↓
AmbitenContext
```

Both eventually reach:

```text
Application
      ↓
AmbitenModel
      ↓
MongoDB
```

The execution source is different.

The runtime model is the same.

## Step 8 — Liveness and readiness are different

Add two process-level endpoints.

### Liveness

```ts
app.get(
  "/health",
  (_req, res) => {
    return res.json({
      status:
        "ok"
    });
  }
);
```

This answers:

```text
Is the process responding?
```

### Readiness

```ts
app.get(
  "/ready",
  async (_req, res) => {
    const ready =
      await checkRuntimeReadiness();

    const status =
      getRuntimeStatus();

    return res
      .status(
        ready
          ? 200
          : 503
      )
      .json({
        ready,
        runtime:
          status
      });
  }
);
```

This answers a different question:

```text
Is this process prepared
to receive application work?
```

Our tutorial readiness check verifies that runtime initialization has completed and the base MongoDB capability can respond.

The ping has a two-second operation timeout, and readiness is checked again after it completes so a concurrent shutdown cannot report ready. The `connected` count means tenant clients have been activated; it is not a per-tenant health check. Lazy tenants are not opened merely to answer `/ready`.

Real applications may add more application-specific readiness requirements. These probes become available only after successful startup; startup failure exits instead of opening an unhealthy listener. Restrict detailed runtime status to your operational network as appropriate.

## Step 9 — Health routes do not require tenant identity

Register:

```text
/health

/ready
```

before the tenant-aware Express adapter.

That gives us:

```text
Process Routes
├── /health
└── /ready

      ↓

Ambiten Adapter
      ↓

Tenant-Aware Routes
├── /users
├── /tenant
└── /instrumentation
```

A deployment probe should not need to pretend to be one of your customers.

### Complete HTTP entry point

Replace `src/index.ts` with the complete shared-runtime entry point:

```ts
import { pathToFileURL } from "node:url";
import express, { type ErrorRequestHandler } from "express";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { MultiTenantManager } from "@ambiten/core";
import { env } from "./config/env.js";
import { instrumentationRouter } from "./routes/instrumentation.routes.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import {
  beginRuntimeShutdown,
  checkRuntimeReadiness,
  getRuntimeStatus,
  initializeRuntime,
  shutdownRuntime
} from "./runtime/runtime.js";

export async function startApi() {
  await initializeRuntime();
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Process probes deliberately sit outside the tenant boundary.
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", async (_req, res) => {
    const ready = await checkRuntimeReadiness();
    return res.status(ready ? 200 : 503).json({
      ready,
      runtime: getRuntimeStatus()
    });
  });

  app.use((req, res, next) => {
    if (getRuntimeStatus().shuttingDown) {
      return res.status(503).json({ error: "Runtime is shutting down." });
    }
    // Identity comes from the demo tenant header; topology is server-owned.
    if (req.headers["x-db-name"] !== undefined || req.headers["x-collection-name"] !== undefined) {
      return res.status(400).json({ error: "Database and collection routing is server-controlled." });
    }
    next();
  });

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
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(handleError);

  const server = app.listen(env.port);
  let closing: Promise<void> | null = null;
  const reportShutdownFailure = (error: unknown) => {
    console.error("Shutdown failed:", error);
    process.exitCode = 1;
  };
  const onInterrupt = () => { void shutdown("SIGINT").catch(reportShutdownFailure); };
  const onTerminate = () => { void shutdown("SIGTERM").catch(reportShutdownFailure); };

  function shutdown(reason: string): Promise<void> {
    if (closing) return closing;
    beginRuntimeShutdown();
    console.log(`Received ${reason}. Shutting down...`);

    closing = (async () => {
      // Bound HTTP draining. An orchestrator still owns the process hard deadline.
      const drainTimer = setTimeout(() => {
        console.error("HTTP drain deadline exceeded; closing remaining connections.");
        process.exitCode = 1;
        server.closeAllConnections();
      }, 10_000);
      drainTimer.unref();

      try {
        try {
          await new Promise<void>((resolve, reject) => {
            server.close(error => {
              if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") {
                reject(error);
              } else {
                resolve();
              }
            });
          });
        } finally {
          await shutdownRuntime();
        }
        console.log("Shutdown complete.");
      } finally {
        clearTimeout(drainTimer);
        process.removeListener("SIGINT", onInterrupt);
        process.removeListener("SIGTERM", onTerminate);
      }
    })();
    return closing;
  }

  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  server.on("error", error => {
    console.error("HTTP server failed:", error);
    process.exitCode = 1;
    void shutdown("HTTP server error").catch(reportShutdownFailure);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  console.log(`Ambiten API running on http://localhost:${env.port}`);
  return { app, server, shutdown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startApi().catch(async error => {
    console.error("Application failed:", error);
    process.exitCode = 1;
    try {
      await shutdownRuntime();
    } catch (shutdownError) {
      console.error("Runtime cleanup failed:", shutdownError);
    }
  });
}
```

The direct-entry guard starts the API when the file is executed. Exporting `startApi()` lets the smoke tests exercise the same server and shutdown handlers without adding diagnostic control routes to the application. Listen errors, including a port already in use, go through runtime cleanup and produce a nonzero exit status.

## Step 10 — Reuse runtime initialization in the worker

The worker keeps its jobs, job-scoped context, and query observation. Only process initialization and cleanup move to the shared module.

The complete `src/worker.ts` is:

```ts
import { pathToFileURL } from "node:url";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import {
  withQueryObservation,
  type QuerySignal
} from "./instrumentation/query-observer.js";
import { UserModel } from "./models/user.model.js";
import { initializeRuntime, shutdownRuntime } from "./runtime/runtime.js";

export interface UserSummaryJob {
  id: string;
  tenantId: string;
  type: "USER_SUMMARY";
}

export interface WorkerResult {
  jobId: string;
  tenantId: string;
  requestId?: string;
  contextPreserved: boolean;
  userCount: number;
  signals: QuerySignal[];
}

export const jobs: UserSummaryJob[] = [
  { id: "tenant-a-users", tenantId: "tenant-a", type: "USER_SUMMARY" },
  { id: "tenant-b-users", tenantId: "tenant-b", type: "USER_SUMMARY" }
];

export async function processJob(job: UserSummaryJob): Promise<WorkerResult> {
  // Core 1.2.4 merges parent context. A new job must not inherit a request session.
  if (AmbitenContext.hasActiveContext()) {
    throw new Error("Worker jobs must start outside an existing execution context.");
  }

  const tenant = await MultiTenantManager.resolveTenant(job.tenantId);
  if (!tenant) {
    throw new Error(`Tenant "${job.tenantId}" could not be resolved.`);
  }

  const requestId = `job-${job.id}`;
  return AmbitenContext.run({ tenantId: job.tenantId, requestId }, async () => {
    const beforeAwait = { ...AmbitenContext.get() };
    await Promise.resolve();
    const afterAwait = AmbitenContext.get();

    const observed = await withQueryObservation(() => UserModel.find({}));
    const current = AmbitenContext.get();

    return {
      jobId: job.id,
      tenantId: current.tenantId ?? job.tenantId,
      requestId: current.requestId,
      contextPreserved:
        beforeAwait.tenantId === afterAwait.tenantId &&
        beforeAwait.requestId === afterAwait.requestId,
      userCount: observed.result.length,
      signals: observed.signals
    };
  });
}

async function main() {
  try {
    await initializeRuntime();

    // Each call creates a fresh execution; process-level infrastructure is reused.
    for (const job of jobs) {
      console.log(`\nProcessing ${job.id}...`);
      const result = await processJob(job);
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await shutdownRuntime();
  }
}

// Keep the entry point runnable while allowing the same handler to be tested.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error("Worker failed:", error);
    process.exitCode = 1;
  });
}
```

Initialization stays inside `try`, so startup failures also reach `shutdownRuntime()`. The handler's inherited-context guard from Tutorial 11 is retained: a job must not silently inherit an HTTP transaction or observer.

## Step 11 — Initialization is not execution context

Calling:

```ts
await initializeRuntime();
```

does not create the active tenant for a request or worker job.

It establishes process infrastructure.

Execution still needs its own boundary.

That distinction is critical:

```text
initializeRuntime()
→ process infrastructure

Ambiten adapter
or
AmbitenContext.run()
→ execution scope
```

Do not combine the two concepts.

## Step 12 — Tenant registration is process-level

The runtime may know:

```text
tenant-a
tenant-b
tenant-c
```

at the process level.

That does not mean all three tenants are active in one execution.

An execution may carry:

```text
tenantId = tenant-a
```

while the process registry knows about many tenants.

This distinction remains:

```text
MultiTenantManager
→ registered tenant infrastructure

AmbitenContext
→ active execution tenant
```

## Step 13 — Lazy connections remain reusable infrastructure

Our tenants were registered lazily.

So process startup can look like:

```text
tenant-a config registered
tenant-b config registered
```

without forcing both tenant MongoClient instances to connect immediately.

Later:

```text
tenant-a request
      ↓
getClient("tenant-a")
      ↓
connect if necessary
      ↓
reuse client
```

Tenant identity is execution-scoped.

The resolved client is reusable infrastructure.

## Step 14 — Transactions remain workflow boundaries

Production organization does not mean every request should automatically become a transaction.

Tutorial 8 established:

```text
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
participating operations
```

Continue to place the boundary around the intended unit of work.

For example:

```ts
await createUserWithAudit({
  name: "Alice",
  email: "alice@example.com"
});
```

The existing `createUserWithAudit` service owns `UserModel.runInTransaction(...)`, user creation, and the audit entry. It retains the Core 1.2.4 compatibility scope that clears the initiating model's collection override while preserving tenant identity and the transaction session. The production runtime does not change transaction ownership.

## Step 15 — Lifecycle policy remains model-level

Tutorial 9 established our user soft-delete policy.

Production organization should not move that logic back into controllers.

Keep:

```text
Route
→ application intent

Service
→ workflow

Model Middleware
→ persistence policy

Schema
→ lifecycle

MongoDB
→ persistence
```

The model remains reusable from both HTTP and worker execution.

## Step 16 — Instrumentation remains execution-aware

Tutorial 10 established an observer around query execution.

Production deployment does not mean Ambiten Core suddenly becomes a hosted monitoring platform.

The relationship remains:

```text
Runtime Execution
      ↓
Instrumentation
      ↓
Structured Signal
      ↓
Your Telemetry Backend
```

A production system may send those signals to:

```text
structured logging

metrics

tracing

analytics

operations tooling
```

The backend owns retention, querying, alerting, and presentation.

## Step 17 — Graceful shutdown

Production services should not simply terminate long-lived infrastructure in the middle of cleanup when normal shutdown signals arrive.

Our HTTP shutdown order is:

```text
Receive SIGTERM / SIGINT
      ↓
Mark runtime unready
      ↓
Stop accepting new HTTP requests
      ↓
Wait for server close
      ↓
Close tenant clients
      ↓
Close base AmbitenClient
      ↓
Process exits
```

This is why we first call:

```ts
server.close(...)
```

and only then:

```ts
await shutdownRuntime();
```

The process boundary owns infrastructure cleanup. The example allows up to ten seconds for HTTP draining before closing remaining HTTP connections and setting a failure exit status. This is an HTTP drain deadline, not a complete process-kill policy: the deployment supervisor still owns the final hard deadline. Queue consumers and upgraded connections would need their own drain logic.

## Step 18 — Make shutdown idempotent

Our runtime uses:

```ts
shutdownPromise
```

so repeated cleanup calls reuse the same shutdown operation.

This matters because several paths may attempt cleanup:

```text
SIGTERM

SIGINT

startup failure

application failure
```

Infrastructure shutdown should not require every caller to know whether cleanup has already begun. All callers await the same completion promise, including its rejection if cleanup fails. Tenant cleanup attempts every activated client, and runtime cleanup still attempts the base client. Errors are reported instead of being silently converted into success.

## Step 19 — Worker shutdown is simpler

The tutorial worker has a finite job list.

So it can use:

```ts
try {
  // work
} finally {
  await shutdownRuntime();
}
```

A long-running queue consumer would additionally stop receiving new jobs and wait for in-flight work according to the queue system's lifecycle API.

That queue-specific responsibility is outside Ambiten.

## Step 20 — What belongs to Ambiten

At this point it is useful to define Ambiten's role precisely.

Ambiten provides runtime primitives for:

```text
context-aware execution

model operations

effective model context

tenant-aware infrastructure resolution

transaction continuity

middleware lifecycle

query instrumentation

MongoDB capability
```

It helps those concerns participate in one coherent runtime.

## Step 21 — What still belongs to your application

Ambiten does not decide your entire application architecture.

Your application remains responsible for concerns such as:

```text
business rules

HTTP contract

authentication

authorization

tenant membership

queue design

job retry policy

idempotency strategy

API versioning

domain workflows
```

For example:

```text
tenantId exists
```

still does not mean:

```text
caller may access tenant
```

Authentication and authorization remain separate.

## Step 22 — What belongs to infrastructure

Deployment and infrastructure remain responsible for concerns such as:

```text
MongoDB topology

secrets

network security

backups

replication

resource limits

containers

autoscaling

load balancing

monitoring backend

log storage

disaster recovery
```

Runtime consistency does not replace operational engineering.

## Step 23 — Configuration ownership

Avoid allowing random application layers to decide:

```text
MongoDB URI

tenant database name

connection pool

deployment secrets
```

Those belong to configuration and infrastructure.

Likewise, ordinary client requests should normally identify:

```text
tenant
```

rather than choose:

```text
physical database topology
```

The separation remains:

```text
identity
→ execution

topology
→ infrastructure
```

The HTTP entry point enforces this for the adapter's optional override headers: requests containing `x-db-name` or `x-collection-name` receive `400`. The demo `x-tenant-id` header still only demonstrates identity routing; it is not authentication or proof of tenant membership. Unexpected errors are logged server-side and produce a generic `500` response.

## Step 24 — Do not create infrastructure per request

Avoid:

```ts
app.get(
  "/users",
  async () => {
    const client =
      new AmbitenClient(...);

    await client.connect();
  }
);
```

MongoDB clients and connection pools are reusable process infrastructure.

The request should use the runtime that already exists.

## Step 25 — Do not create execution state globally

Likewise, avoid:

```ts
let currentTenantId:
  string |
  undefined;
```

and updating it for every request.

Process infrastructure is shared.

Execution state must remain isolated.

Use:

```text
Adapter boundary
```

or:

```ts
AmbitenContext.run(...)
```

depending on the execution source.

## Step 26 — Direct client access remains valid

Even after building the full runtime, this remains a valid Ambiten usage style:

```ts
const db =
  await client.db();
```

or:

```ts
const collection =
  await client.collection(
    "diagnostics"
  );
```

Not every operation must pass through `AmbitenModel`.

The application can choose the level of runtime structure appropriate for the work.

## Step 27 — The production path

The complete HTTP path is now:

```text
Process Startup
      ↓
initializeRuntime()
      ↓
Express
      ↓
Ambiten Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Application
      ↓
Optional Transaction Boundary
      ↓
AmbitenModel
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
Response
```

The complete worker path is:

```text
Worker Startup
      ↓
initializeRuntime()
      ↓
Receive Job
      ↓
AmbitenContext.run()
      ↓
Application
      ↓
Optional Transaction Boundary
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Tenant Infrastructure
      ↓
MongoDB
      ↓
Instrumentation Signal
      ↓
Complete Job
```

## Step 28 — The three lifetimes

The entire tutorial series can now be summarized through three lifetimes.

### Process

```text
AmbitenClient
MongoClient
MultiTenantManager
configuration
models
schema definitions
middleware registration
```

### Execution

```text
AmbitenContext
tenantId
requestId
session
observer
runtime metadata
```

### Operation

```text
Effective ModelContext
filter
update
document
collection
middleware state
MongoDB operation
```

A healthy architecture avoids leaking responsibilities between them.

## Step 29 — Production checklist

Before deploying an Ambiten application, review at least:

```text
[ ] required configuration fails fast

[ ] MongoClient infrastructure is reused

[ ] tenant configuration has a clear owner

[ ] tenant identity is validated

[ ] tenant authorization is handled separately

[ ] HTTP execution enters through an adapter

[ ] non-HTTP work creates an explicit context

[ ] transaction boundaries match units of work

[ ] external side effects are not assumed transactional

[ ] model middleware is registered once

[ ] instrumentation has a downstream consumer

[ ] liveness and readiness are distinguished

[ ] shutdown stops new work before closing resources

[ ] worker jobs carry serializable identity,
    not live runtime objects

[ ] MongoDB backups, security, topology,
    monitoring and scaling are handled
    by deployment infrastructure
```

## Run the final API

Run:

```bash
pnpm typecheck
```

Then:

```bash
pnpm build
```

Start:

```bash
pnpm dev
```

Check:

```bash
curl \
  http://localhost:3000/health
```

Then:

```bash
curl \
  http://localhost:3000/ready
```

Then execute tenant traffic:

```bash
curl \
  http://localhost:3000/users \
  -H "x-tenant-id: tenant-a"
```

The same runtime should still provide:

```text
tenant routing

lifecycle policy

instrumentation

model execution
```

from the previous tutorials.

## Run the final worker

In a separate process:

```bash
pnpm worker
```

It should still establish:

```text
job
→ explicit AmbitenContext
→ tenant-aware UserModel
→ instrumentation
→ tenant MongoDB
```

but now process startup and cleanup are shared with the API through the runtime module.

## Verify the final checkpoint

After configuring the environment, the source and compiled scripts are:

```bash
pnpm typecheck
pnpm build
pnpm dev
# Or, after stopping the development API:
pnpm start

# In a separate terminal:
pnpm worker
# Or:
pnpm worker:start
```

An initial `GET /ready` without tenant headers should return:

```json
{
  "ready": true,
  "runtime": {
    "initialized": true,
    "shuttingDown": false,
    "tenants": { "registered": 2, "connected": 0 }
  }
}
```

After tenant traffic, the activated-client count can increase. A base-database readiness failure yields `503`; liveness remains `200` while the process is responding. During shutdown, readiness becomes false before infrastructure closes.

With a local `mongod` executable, run the full isolated suite:

```bash
pnpm test:smoke
```

Set `MONGOD_BINARY` to its full path if it is not on `PATH`. The suite creates its own loopback-only MongoDB replica set, uses unused ports, ignores your `.env`, and removes only its temporary database after stopping its processes. It never uses your existing databases.

The checks cover the inherited API, workers, tenant isolation, soft-delete policy, transactions, and instrumentation, plus missing configuration, invalid ports, listener failures, readiness degradation, concurrent initialization, startup/shutdown races, cleanup failures, idempotent shutdown, and in-flight HTTP draining. On Windows, the test emits Node's registered signal events to exercise the SIGINT/SIGTERM handlers; it does not claim to simulate a supervisor's hard termination.

## What just happened

We did not add a new persistence feature.

We gave all existing features clear lifecycle ownership.

Before:

```text
feature
+
feature
+
feature
```

Now:

```text
Process Infrastructure
      ↓
Execution Boundary
      ↓
Runtime Context
      ↓
Application Logic
      ↓
Model Operation
      ↓
Infrastructure
      ↓
MongoDB
```

That organization is what turns individual runtime capabilities into a coherent application architecture.

## Final runtime flow

The complete Ambiten learning path ends here:

```text
Execution Source
├── HTTP Request
├── Background Job
├── Scheduled Task
├── CLI Workflow
└── Other Runtime Entry
        ↓
Execution Boundary
├── Framework Adapter
└── AmbitenContext.run()
        ↓
AmbitenContext
        ↓
Application Logic
        ↓
AmbitenModel
        ↓
Effective ModelContext
        ↓
Schema / Middleware
        ↓
Provider / MultiTenantManager
        ↓
AmbitenClient
        ↓
MongoDB
        ↓
Instrumentation / Post-operation behavior
        ↓
Execution Completes
```

The surrounding process owns long-lived infrastructure.

The boundary owns execution state.

The model owns the persistence operation.

MongoDB owns persistence.

## What Ambiten gives you

At the end of the series, the core mental model is:

```text
Establish execution once.

Carry execution state
through the runtime.

Bind that state
to model operations.

Resolve infrastructure
at the appropriate boundary.

Keep persistence behavior
close to persistence.

Observe execution
without turning application
logic into telemetry plumbing.
```

## Where to go next

The numbered tutorial path is complete.

From here, continue with the framework-specific tracks:

```text
Fastify

NestJS

GraphQL

AWS Lambda
```

Those guides do not introduce a different Ambiten architecture.

They change the ingress:

```text
Framework
      ↓
Ambiten execution boundary
      ↓
same runtime model
```

The separate framework-track entry points are [Fastify](/tutorials/frameworks/fastify), [NestJS](/tutorials/frameworks/nestjs), [GraphQL](/tutorials/frameworks/graphql), and [Lambda](/tutorials/frameworks/lambda). They are follow-up work, not Tutorial 13.

You can also return to the [tutorial overview](/tutorials/) or explore the [architecture guide](/architecture/whitepaper) for deeper coverage. The [Document-to-PDF SaaS tutorial](/tutorials/pdf-saas) remains a separate learning path.

## Series complete

You have progressed from:

```text
AmbitenClient
      ↓
MongoDB
```

to:

```text
Execution Source
      ↓
Ambiten Runtime Boundary
      ↓
Context
      ↓
Models
      ↓
Transactions
      ↓
Lifecycle
      ↓
Tenant Infrastructure
      ↓
Instrumentation
      ↓
MongoDB
```

That is the complete core Ambiten tutorial path.

## Bonus — Agentic Development

Continue with [Build an Agent-Ready MCP Server with Ambiten](/tutorials/bonus-mcp-server) to expose the same application capabilities to an AI host. This optional bonus sits outside the numbered core path; it adds an MCP execution boundary without replacing the REST API or worker.
