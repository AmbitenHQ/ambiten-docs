# Tutorial 11 — Background Worker Execution

> Estimated time: 15–20 minutes

Until now, most of our Ambiten execution has started with an HTTP request.

The Express adapter established the execution boundary:

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
```

But not every application operation begins with HTTP.

Real systems also contain:

```text
queue workers

scheduled jobs

cron tasks

event consumers

maintenance tasks

CLI processes

data processing jobs
```

Those execution sources do not have an Express adapter to establish runtime context for them.

So they must establish their own execution boundary deliberately.

In this tutorial we will create a background worker that processes jobs for two tenants.

The worker will reuse the same:

```text
AmbitenClient
MultiTenantManager
AmbitenContext
UserModel
middleware
instrumentation
MongoDB infrastructure
```

that our HTTP API already uses.

The runtime becomes:

```text
Background Job
      ↓
Worker
      ↓
AmbitenContext.run()
      ↓
tenantId + execution identity
      ↓
UserModel
      ↓
Effective ModelContext
      ↓
Tenant Infrastructure
      ↓
MongoDB
```

## What you will learn

By the end of this tutorial, you will understand:

```text
why workers need explicit execution boundaries

how AmbitenContext.run() replaces
the adapter boundary outside HTTP

how tenant identity enters worker execution

how the same models can be reused
from APIs and workers

how instrumentation follows worker execution

why request context should not simply
be assumed to survive into detached work

why database sessions should not be
serialized into jobs

how worker processes initialize
their own process-level infrastructure
```

## What you need

Complete [Tutorial 10 — Instrumentation](/tutorials/10-instrumentation) first. Use Node.js 22.13 or later, pnpm or npm, and a running MongoDB instance. The worker only reads users, so standalone MongoDB is enough. The inherited transactional API still requires a replica set or sharded deployment.

This is a finite demonstration worker: it processes two in-memory jobs sequentially and exits. It does not introduce a queue, scheduler, retry mechanism, logging backend, or separate worker model.

## Starting point

The finished checkpoint is already available as an independent project:

```bash
cd examples/ambiten-tutorial/11-background-worker
pnpm install
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env`. Keep an existing `.env` rather than overwriting it. The example settings are:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
PORT=3000
```

With npm, use `npm ci` and `npm run <script>` instead. The lockfile pins the tested dependency tree. No new dependency is needed for worker execution.

If you are building your own checkpoint from Tutorial 10, copy its source and configuration, excluding `node_modules`, `dist`, and private environment files. Do not recursively copy Tutorial 10 into this already-existing directory.

The package is named `ambiten-tutorial-11-background-worker`:

```text
11-background-worker/
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
│   ├── index.ts
│   └── worker.ts
├── scripts/
│   └── smoke.mjs
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
└── tsconfig.json
```

The compiler settings, localized schema type assertions, observer callback wait, and cross-model transaction compatibility from Tutorial 10 are retained. The compiled API and worker use the existing `tsx` loader for the pinned packages' ESM imports; keep development dependencies installed for this tutorial.

## Step 1 — Add a worker script

Update `package.json` so its scripts include:

```json
{
  "scripts": {
    "dev":
      "tsx --env-file=.env src/index.ts",

    "worker":
      "tsx --env-file=.env src/worker.ts",

    "typecheck":
      "tsc --noEmit",

    "build":
      "tsc -p tsconfig.json",

    "start":
      "node --import tsx --env-file=.env dist/index.js",

    "worker:start":
      "node --import tsx --env-file=.env dist/worker.js"
  }
}
```

We now have two executable entry points:

```text
src/index.ts
→ HTTP API

src/worker.ts
→ background worker
```

They share application infrastructure.

They do not share execution boundaries.

## Step 2 — HTTP execution vs worker execution

Our API gets an execution boundary from the framework adapter:

```text
Request
      ↓
Express Adapter
      ↓
AmbitenContext
```

The worker has no request and no adapter.

So its equivalent flow must be:

```text
Job
      ↓
Worker Handler
      ↓
AmbitenContext.run()
```

This is one of the most important Ambiten concepts:

```text
the framework is not the runtime

the framework is one way
to enter the runtime
```

## Step 3 — Define a job

Our tutorial worker will process a simple user-summary job:

```ts
interface UserSummaryJob {
  id: string;
  tenantId: string;
  type: "USER_SUMMARY";
}
```

A job contains application data required to establish a new execution.

For this tutorial that includes:

```text
job ID
tenant ID
job type
```

It does not contain:

```text
MongoClient

Db instance

ClientSession

AmbitenContext object
```

Those are runtime resources.

They should be reconstructed or resolved inside the worker process.

## Step 4 — Create two tutorial jobs

Add:

```ts
const jobs:
  UserSummaryJob[] = [
    {
      id:
        "tenant-a-users",

      tenantId:
        "tenant-a",

      type:
        "USER_SUMMARY"
    },

    {
      id:
        "tenant-b-users",

      tenantId:
        "tenant-b",

      type:
        "USER_SUMMARY"
    }
  ];
```

Conceptually:

```text
Job A
tenantId = tenant-a

Job B
tenantId = tenant-b
```

The worker code is identical for both.

## Step 5 — Resolve tenant infrastructure before execution

Before processing a job, resolve its tenant:

```ts
const tenant =
  await MultiTenantManager.resolveTenant(
    job.tenantId
  );

if (!tenant) {
  throw new Error(
    `Tenant "${job.tenantId}" could not be resolved.`
  );
}
```

The job supplies tenant identity.

The runtime owns tenant infrastructure.

That preserves the architecture from Tutorials 6 and 7:

```text
Job
      ↓
tenantId
      ↓
MultiTenantManager
      ↓
TenantConfig
```

The job does not supply the MongoDB database name directly.

## Step 6 — Establish the worker execution boundary

Now create the execution:

```ts
return AmbitenContext.run(
  {
    tenantId:
      job.tenantId,

    requestId:
      `job-${job.id}`
  },

  async () => {
    // worker application logic
  }
);
```

We reuse `requestId` as an execution correlation identifier.

Although this execution did not originate from an HTTP request, the identifier still gives runtime tooling a stable way to correlate work:

```text
job-tenant-a-users
```

The important idea is:

```text
HTTP execution
→ request identity

worker execution
→ job identity
```

Both can occupy the same runtime correlation field.

The checkpoint refuses to start a job while another Ambiten context is active. Core 1.2.4 merges parent state in `run()`, so merely replacing `tenantId` and `requestId` could otherwise retain an HTTP session, database override, or observer. A standalone worker receives serializable job data outside a request scope and then establishes its own boundary.

## Step 7 — Context survives async worker execution

Inside the boundary:

```ts
const beforeAwait =
  { ...AmbitenContext.get() };

await Promise.resolve();

const afterAwait =
  AmbitenContext.get();
```

Then compare:

```ts
const contextPreserved =
  beforeAwait.tenantId ===
    afterAwait.tenantId &&
  beforeAwait.requestId ===
    afterAwait.requestId;
```

The same execution scope remains available after asynchronous work.

That is the same context behavior we observed inside Express.

The execution source has changed.

The propagation model has not.

## Step 8 — Use the existing UserModel

Inside the worker we can simply run:

```ts
const users =
  await UserModel.find({});
```

We do not create:

```text
WorkerUserModel
```

and we do not call:

```ts
UserModel.find(
  {},
  {
    tenantId:
      job.tenantId
  }
);
```

for ordinary context-managed worker execution.

The tenant identity already belongs to:

```text
AmbitenContext
```

The model binds that execution state into its effective persistence context.

Conceptually:

```text
AmbitenContext
tenantId = tenant-a
      ↓
UserModel
      ↓
Effective ModelContext
      ↓
Tenant Infrastructure
      ↓
tenant-a database
```

## Step 9 — Reuse instrumentation

Tutorial 10 created:

```ts
withQueryObservation(...)
```

We can use the same instrumentation helper inside the worker:

```ts
const observed =
  await withQueryObservation(
    async () => {
      return UserModel.find(
        {}
      );
    }
  );
```

Now the worker flow becomes:

```text
Job
      ↓
AmbitenContext
      ↓
Instrumentation Observer
      ↓
UserModel.find()
      ↓
Query Signal
```

The resulting signal can contain:

```text
job execution ID
tenant ID
operation
collection
outcome
```

Instrumentation is therefore not tied to Express.

It belongs to runtime execution.

## Step 10 — Create `worker.ts`

Create `src/worker.ts` with the complete entry point:

```ts
import { pathToFileURL } from "node:url";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { client } from "./core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "./core/tenancy.js";
import {
  withQueryObservation,
  type QuerySignal
} from "./instrumentation/query-observer.js";
import { UserModel } from "./models/user.model.js";
import { configureUserLifecycle } from "./policies/user-lifecycle.js";

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
    registerTutorialTenants();
    await client.connect();
    configureUserLifecycle();

    // Each call creates a fresh execution; process-level infrastructure is reused.
    for (const job of jobs) {
      console.log(`\nProcessing ${job.id}...`);
      const result = await processJob(job);
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    // Also clean up if initialization or a job fails.
    try {
      await closeTutorialTenants();
    } finally {
      await client.close();
    }
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

The typed `signals` reuse Tutorial 10's `QuerySignal`. The entry-point check runs `main()` only when this file is executed directly; importing `processJob` in the smoke test does not start a second worker.

Initialization is inside the `try`, and nested cleanup attempts to close the base client even if tenant cleanup fails. A rejected job or startup failure reaches the top-level error handler and sets a nonzero exit status. This small demonstration stops on the first failure; retries and dead-letter handling belong to the queue system in a later application.

## Step 11 — Why the worker initializes infrastructure

Notice:

```ts
registerTutorialTenants();

await client.connect();

configureUserLifecycle();
```

The worker is its own process entry point.

If the HTTP API and worker run as separate Node.js processes, they do not share in-memory objects.

That means the worker process needs its own:

```text
MongoDB client initialization

tenant registry

model lifecycle setup

runtime configuration
```

The configuration can be shared as source code.

The actual in-memory runtime is process-local.

## Step 12 — Process lifetime vs execution lifetime

This gives us two lifetimes.

Process-level worker infrastructure:

```text
Worker Process
├── AmbitenClient
├── MultiTenantManager
├── models
└── lifecycle configuration
```

Per-job execution:

```text
Job A
└── AmbitenContext
    ├── tenantId
    ├── requestId
    └── observer
```

Then later:

```text
Job B
└── AmbitenContext
    ├── tenantId
    ├── requestId
    └── observer
```

Long-lived resources can be reused.

Execution-specific state must remain scoped to each job.

## Step 13 — Run the worker

Run:

```bash
pnpm typecheck
```

Then:

```bash
pnpm worker
```

The first result should conceptually resemble:

```json
{
  "jobId":
    "tenant-a-users",

  "tenantId":
    "tenant-a",

  "requestId":
    "job-tenant-a-users",

  "contextPreserved":
    true,

  "userCount":
    3,

  "signals": [
    {
      "status":
        "success",

      "requestId":
        "job-tenant-a-users",

      "tenantId":
        "tenant-a",

      "operation":
        "find",

      "collectionName":
        "users"
    }
  ]
}
```

The actual number of users depends on your tutorial database. With no users, expect `userCount: 0` and a successful `find` signal. Tutorial 9's lifecycle policy still applies: soft-deleted users are excluded.

The worker does not require the HTTP server to be running and does not open an HTTP port. Once both jobs finish, it closes its own clients. To run compiled code:

```bash
pnpm build
pnpm worker:start
```

With npm, use `npm run worker`, `npm run build`, and `npm run worker:start`. The API remains available through `pnpm dev` or `pnpm start` in a separate process.

## Step 14 — Observe Tenant B

The second job should execute against:

```text
tenant-b
```

rather than inheriting the previous job's tenant.

Conceptually:

```text
Job A boundary
tenant-a
      ↓
complete
      ↓
boundary ends

Job B boundary
tenant-b
      ↓
complete
      ↓
boundary ends
```

Worker execution must not be implemented as:

```text
set global tenant = A
process job A

set global tenant = B
process job B
```

Tenant identity belongs to execution scope.

## Step 15 — Each job owns its boundary

The rule is:

```text
one logical job
→ one execution boundary
```

Not:

```text
worker process
→ one permanent AmbitenContext
→ every job
```

A permanent process-wide context would make unrelated jobs share execution identity.

Instead:

```ts
for (const job of jobs) {
  await AmbitenContext.run(
    jobContext,
    async () => {
      // process this job
    }
  );
}
```

Each job gets its own runtime state.

## Step 16 — Real queue systems fit the same model

Our `jobs` array is only a stand-in for a queue.

A real consumer may look conceptually like:

```ts
queue.on(
  "job",
  async (job) => {
    await processJob(
      job.data
    );
  }
);
```

The Ambiten part does not change:

```text
Queue Message
      ↓
processJob()
      ↓
AmbitenContext.run()
      ↓
Application Logic
```

Ambiten does not need to own the queue system.

It owns the execution scope used while processing the job.

## Step 17 — Carry identity, not live runtime resources

Suppose an HTTP request schedules a background job.

Do not attempt to put this into a queue message:

```text
ClientSession

MongoClient

Db

AsyncLocalStorage state

live AmbitenContext object
```

Those are process-local runtime resources.

Instead send serializable execution identity such as:

```text
jobId

tenantId

correlation identifier

domain payload
```

The worker uses those values to construct a new execution.

## Step 18 — A request transaction does not continue into a worker

Tutorial 8 introduced:

```text
ClientSession
```

inside a transaction boundary.

That session belongs to the MongoDB client and process executing that transaction.

If an HTTP request enqueues a job:

```text
Request Transaction
      ↓
Queue
      ↓
Worker
```

the worker does not automatically continue the original MongoDB transaction.

Instead:

```text
Request
→ transaction boundary A

Worker
→ new execution boundary
→ optional transaction boundary B
```

If the worker needs transactional persistence, it can create its own transaction after establishing worker context.

Do not serialize the original `ClientSession`.

## Step 19 — Detached work should establish a new boundary

Consider:

```ts
setTimeout(
  async () => {
    await UserModel.find({});
  },
  10_000
);
```

inside an HTTP handler.

Node's async context may propagate into a timer created inside a request; that does not keep the request's transaction or resource lifetime valid. In Core 1.2.4, nesting `AmbitenContext.run()` also merges parent state. Do not assume a delayed callback is a clean, independent job boundary.

That creates lifecycle ambiguity:

```text
Will the request still exist?

Should the transaction still exist?

Which tenant owns the work?

What happens if the process restarts?

Who retries the work?
```

Once execution becomes a real background responsibility, treat it as its own runtime unit.

Conceptually:

```text
Request
      ↓
enqueue serializable job
      ↓
request ends

Worker
      ↓
receive job
      ↓
create new AmbitenContext
      ↓
process work
```

That boundary is much clearer.

## Step 20 — Worker instrumentation

Our worker's query signal may resemble:

```text
requestId:
job-tenant-a-users

tenantId:
tenant-a

operation:
find

collectionName:
users
```

This lets operational systems distinguish:

```text
HTTP-generated query
```

from:

```text
worker-generated query
```

when the surrounding application supplies appropriate correlation metadata.

In a larger system you may also include job-specific runtime metadata, but the basic execution architecture remains the same.

## Step 21 — Concurrent worker execution

Workers often process more than one job concurrently.

Once the sequential version is working, you can change:

```ts
for (const job of jobs) {
  const result =
    await processJob(job);

  console.log(result);
}
```

to:

```ts
const results =
  await Promise.all(
    jobs.map(
      (job) =>
        processJob(job)
    )
  );

console.log(
  JSON.stringify(
    results,
    null,
    2
  )
);
```

Conceptually:

```text
Worker Process
      │
      ├── Job A
      │   └── AmbitenContext
      │       tenant-a
      │
      └── Job B
          └── AmbitenContext
              tenant-b
```

The jobs share process infrastructure.

They do not share execution state.

For the tutorial checkpoint, keep the sequential version first because its output is easier to follow.

## Step 22 — API and worker now share one runtime model

We now have:

```text
                ┌── HTTP Request
                │
Execution Source┤
                │
                └── Background Job
                        ↓
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
               Tenant Infrastructure
                        ↓
                     MongoDB
```

Express is no longer the conceptual center of the application.

Execution is.

## Verify the checkpoint

Run the static checks:

```bash
pnpm typecheck
pnpm build
```

Then run the complete smoke test with a locally installed `mongod` executable:

```bash
pnpm test:smoke
```

Set `MONGOD_BINARY` to its full path if it is not on `PATH`. The test starts its own loopback-only MongoDB replica set and uses unused ports. It ignores your `.env`, does not use existing databases, and stops its processes and removes only its own temporary data.

It checks the source and compiled workers, per-tenant counts, exclusion of soft-deleted users, populated job-correlated signals, concurrent job isolation, unknown-tenant rejection, context restoration, startup failure, and query-error propagation. It also reruns the inherited API, lifecycle, and transaction checks.

In a real queue consumer, validate the job payload and authorize the supplied tenant before processing it. Resolving a registered tenant is infrastructure lookup, not authorization. Correlation IDs identify execution; they do not implement deduplication or exactly-once processing.

## What just happened

Tutorial 4 introduced:

```text
HTTP
→ Express Adapter
→ AmbitenContext
```

Tutorial 11 demonstrates:

```text
Background Job
→ AmbitenContext.run()
→ AmbitenContext
```

After the context exists, the downstream runtime remains familiar:

```text
AmbitenContext
      ↓
UserModel
      ↓
Effective ModelContext
      ↓
Middleware
      ↓
Instrumentation
      ↓
Tenant Infrastructure
      ↓
MongoDB
```

The entry mechanism changed.

The persistence architecture did not.

## Runtime flow

The complete worker flow is:

```text
Worker Process Starts
      ↓
Initialize Process Infrastructure
      ├── AmbitenClient
      ├── MultiTenantManager
      └── Model Lifecycle
      ↓
Receive Job
      ↓
Read tenantId
      ↓
Resolve Tenant
      ↓
AmbitenContext.run()
      ├── tenantId
      └── requestId
      ↓
Worker Application Logic
      ↓
Query Observer
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
      ↓
Instrumentation Signal
      ↓
Complete Job
      ↓
Execution Boundary Ends
```

## Common mistakes

### Running worker model operations without context

Avoid:

```ts
async function processJob(
  job
) {
  return UserModel.find({});
}
```

when tenant identity belongs to that job but has not been established in runtime context.

### Reusing one permanent tenant context

The worker process is long-lived.

The tenant context should be job-scoped.

### Serializing ClientSession into a queue

A MongoDB session is a live runtime resource, not portable job data.

Create transaction state in the process that actually executes the transaction.

### Assuming request context crosses process boundaries

An API process and worker process do not share AsyncLocalStorage.

Pass the necessary serializable identity and create a new worker context.

### Creating new MongoClient infrastructure for every job

Process-level MongoDB infrastructure should normally be reused across jobs.

Do not confuse job lifetime with connection lifetime.

### Creating separate model definitions for workers

If HTTP and worker execution operate on the same domain model, reuse the model definition.

Change the execution boundary, not the domain architecture.

## Checkpoint

The series is now:

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

Tutorial 11
Background Worker
```

We can now describe Ambiten execution independently of HTTP:

```text
Execution Source
      ↓
Boundary
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
      ↓
Infrastructure
      ↓
MongoDB
```

An execution source may be:

```text
HTTP request

background job

scheduled task

CLI command

event consumer

serverless invocation

application workflow
```

The important requirement is that runtime state has a clear boundary.

## Next tutorial

Continue to:

[Tutorial 12 — Production Runtime](/tutorials/12-production-runtime)

Tutorial 12 will bring the pieces together:

```text
Process Infrastructure
      ↓
AmbitenClient
MultiTenantManager
Model Configuration
      ↓

Execution Boundaries
      ├── HTTP Adapter
      └── Worker Context
      ↓

AmbitenContext
      ↓
Models
      ↓
Transactions
Middleware
Instrumentation
      ↓
MongoDB
```

We will also separate:

```text
process lifetime

execution lifetime

operation lifetime
```

and examine shutdown, resource reuse, configuration, deployment boundaries, and the operational responsibilities Ambiten intentionally leaves to the surrounding application and infrastructure.
