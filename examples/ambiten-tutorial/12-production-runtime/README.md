# Tutorial 12 — Production Runtime

The final independent checkpoint for the 12-part Ambiten core learning path.
Read the [full tutorial](../../../docs/tutorials/12-production-runtime.md).
It organizes the existing API and worker around three lifetimes:

- Process: configuration, clients, tenant registry, models, and lifecycle setup.
- Execution: an HTTP request or job and its Ambiten context.
- Operation: a model call, filter, update, and effective persistence context.

This is a production-oriented teaching example, not a fully hardened deployment.
It adds no queue, telemetry backend, query-budget feature, or bootstrap framework.

## Setup

Use Node.js 22.13 or later and a running MongoDB server. From this directory:

```bash
npm ci
cp .env.example .env
npm run typecheck
npm run build
```

On PowerShell, use `Copy-Item .env.example .env`. Preserve an existing `.env`.
Both `MONGO_URI` and `DB_NAME` are required and must be nonblank. `PORT` defaults
to 3000 and must be an integer from 1 to 65535. Configuration errors fail startup.

The two demo tenants still map to `ambiten_tutorial_tenant_a` and
`ambiten_tutorial_tenant_b`. `DB_NAME` selects the base runtime database, not those
tenant databases. Ordinary reads work on standalone MongoDB; the inherited
transaction endpoint requires a replica set or sharded deployment.

With pnpm, use `pnpm install`, `pnpm typecheck`, and `pnpm build` instead.

## API

```bash
npm run dev
# Or, after stopping the development API:
npm start
```

`GET /health` reports process liveness. `GET /ready` reports readiness and returns
200 or 503; neither requires tenant headers. Readiness checks initialization,
shutdown state, and a base-database ping with a two-second operation timeout.
It does not open every lazy tenant or certify every tenant database's health.

Initially `/ready` reports two registered tenants and zero activated clients.
Tenant traffic may increase the connected count. `/users`, `/tenant/infrastructure`,
and `/instrumentation/users` retain their previous behavior. Supply a demo
`x-tenant-id` and optional `x-request-id`. The final API rejects `x-db-name` and
`x-collection-name`: physical routing belongs to the server.

## Worker

```bash
npm run worker
# Or, after building:
npm run worker:start
```

The finite worker processes the same two user-summary jobs and exits. The API
does not need to be running. Each process owns its own clients and registry,
although both use `initializeRuntime()` and `shutdownRuntime()` from the same
application-owned runtime module. Jobs retain their own execution scopes and
query signals; soft-deleted users remain excluded.

The pnpm equivalents are `pnpm dev`, `pnpm start`, `pnpm worker`, and
`pnpm worker:start`.

## Startup and shutdown ownership

Concurrent initialization calls share one startup attempt. Initialization does
not establish a tenant execution context. A failure is reported by the entry
point, which also requests cleanup; it is not silently retried.

On SIGINT or SIGTERM, the API marks itself unready, stops accepting connections,
and drains active HTTP requests before closing tenant clients and the base
client. The HTTP drain deadline is ten seconds; exceeding it closes remaining
HTTP connections and sets a failure exit status. A deployment supervisor still
owns the final hard process deadline.

All shutdown callers await the same promise. Cleanup attempts every activated
tenant client and the base client even if one close fails. Shutdown is terminal;
start a new process instead of attempting to reinitialize this runtime.

## Verify

With `mongod` available on `PATH`:

```bash
npm run test:smoke
```

Otherwise set `MONGOD_BINARY` to the full path of the MongoDB server executable.
The suite creates an isolated loopback-only replica set and uses unused ports,
ignoring your `.env` and existing databases. It stops its processes and removes
only its temporary data afterward.

Tests cover configuration validation, tenant-free probes, readiness degradation,
lazy tenants, routing restrictions, concurrent initialization, startup/shutdown
races, idempotent cleanup, tenant-close failures, HTTP bind failure, and in-flight
request draining. Source and compiled workers, tenant isolation, CRUD, lifecycle
policy, transaction commit/rollback, query signals, and error propagation are
also checked. On Windows, signal-handler tests emit Node's registered signal
events rather than claiming to simulate an operating system's hard termination.

## Deployment boundaries

Retained package compatibility measures include Bundler type resolution, the
Express 5 type mapping, localized schema assertions, observer callback draining,
and the cross-model transaction collection-scope fix. Compiled entry points
still use the existing `tsx` loader; keep development dependencies installed.

Before deployment, supply real authentication and tenant authorization, validate
external job payloads, protect secrets and operational endpoints, and configure
network security, MongoDB topology/backups, monitoring, and a supervisor grace
period. The demo tenant header is not authorization. Queue-specific draining,
retries, idempotency, and external-side-effect coordination remain application
responsibilities.

This closes the numbered core series. The framework tracks are separate
follow-up work; the Document-to-PDF SaaS tutorial remains separate and unchanged.
