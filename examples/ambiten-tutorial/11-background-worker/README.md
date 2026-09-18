# Tutorial 11 — Background Worker Execution

Complete, independent checkpoint for
[`docs/tutorials/11-background-worker.md`](../../../docs/tutorials/11-background-worker.md).
It retains Tutorial 10's HTTP API and adds a finite worker using the same models,
tenant registry, lifecycle policy, and query observer. No queue package is added.

## Run the worker

Use Node.js 22.13 or later and a running MongoDB instance. From this directory:

```bash
npm ci
cp .env.example .env
npm run typecheck
npm run worker
```

On PowerShell, use `Copy-Item .env.example .env`. Preserve any existing `.env`.
Set `MONGO_URI` for your MongoDB server; the tenants use
`ambiten_tutorial_tenant_a` and `ambiten_tutorial_tenant_b`.

The worker sequentially summarizes `tenant-a` and `tenant-b`, prints their
visible user counts and job-correlated query signals, closes its clients, and
exits. Counts depend on your existing data; zero is valid. Soft-deleted users
are excluded. It does not need the API to be running or open an HTTP port.

To run compiled code:

```bash
npm run build
npm run worker:start
```

With pnpm, use `pnpm install`, `pnpm typecheck`, `pnpm worker`, `pnpm build`, and
`pnpm worker:start` instead.

## The API is still included

Run `npm run dev`, or `npm start` after building. `GET /health` checks the process;
the tenant-aware routes remain `/users`, `/tenant/infrastructure`, and
`/instrumentation/users`. Supply `x-tenant-id: tenant-a` or `tenant-b` and an
optional `x-request-id` for HTTP correlation. The inherited transaction endpoint
requires a replica set or sharded MongoDB; the worker itself only needs reads.

API and worker source code is shared, but each running process initializes and
owns its own connections, registry, lifecycle configuration, and execution state.

## Verify

With `mongod` installed locally and on `PATH`:

```bash
npm run test:smoke
```

Otherwise set `MONGOD_BINARY` to its full executable path. The smoke test uses
its own temporary loopback-only MongoDB replica set and unused ports. It ignores
your `.env` and existing databases. It stops its processes and removes only the
temporary data it created.

Tests cover the source and compiled workers, tenant counts, soft-delete policy,
query signals, sequential and concurrent job scopes, unknown tenants, startup
failure, original error propagation, and context restoration. The inherited API,
CRUD, lifecycle, and cross-model transaction checks are also retained.

## Execution boundary and compatibility

Each job receives `requestId: job-<job ID>` inside its own `AmbitenContext.run()`.
The handler refuses to run inside an existing context: Core 1.2.4 merges parent
state, which could otherwise carry a request's transaction into a nested job.
Pass serializable identity through a queue; never serialize live sessions,
database clients, or AsyncLocalStorage state.

The worker exports its handler for testing, with a direct-entry guard preventing
imports from starting the job loop. The demonstration stops on its first failure
and exits nonzero; retries, scheduling, deduplication, and authorization are not
implemented by the in-memory jobs array.

Tutorial 10's package compatibility fixes remain in place: Bundler type
resolution, Express 5 type mapping, localized schema assertions, observer
callback draining, and collection-scoped transaction handling. Compiled entry
points retain `--import tsx`; keep development dependencies installed.

Production Runtime is the next checkpoint, Tutorial 12. The separate PDF SaaS
tutorial is unchanged.
