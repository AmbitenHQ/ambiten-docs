# Fastify Framework Track

Runnable **first checkpoint**: install the public Fastify adapter and verify that tenant/request identity reaches asynchronous handlers.

Read the [overview](https://docs.ambiten.dev/tutorials/frameworks/fastify) or its [Markdown source](../../../../docs/tutorials/frameworks/fastify/fastify.md).

## Requirements and setup

Use Node.js 22.15 or newer and npm. Core 1.2.4, adapter-fastify **1.0.4**, and Fastify 5.12.5 are pinned. No running MongoDB server or credentials are needed.

```sh
cd examples/ambiten-tutorial/framework-tracks/fastify
npm ci
npm run typecheck
npm run dev
```

Optionally copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell or `cp .env.example .env` in a POSIX shell). It contains `PORT=3000`.

The server binds loopback at `http://127.0.0.1:3000`. Stop with Ctrl+C.

## Public API integration

`src/app.ts` creates the adapter with `createFastifyAdapter()` and calls `adapter.install(api, { tenancy: ... })` before defining protected routes. Its validation callback calls `MultiTenantManager.resolveTenant(tenantId)` and rejects unknown tenants.

`src/core/tenancy.ts` registers `tenant-a` and `tenant-b` lazily for this standalone example. Registration opens no connections. No local adapter implementation or context wrapper is required.

## Try it

Health needs no tenant:

```sh
curl http://127.0.0.1:3000/health
```

Response: `{"status":"ok"}`.

Inspect execution identity after an await:

```sh
curl -H "x-tenant-id: tenant-a" -H "x-request-id: fastify-tenant-a-001" http://127.0.0.1:3000/context
```

```json
{
  "tenantId": "tenant-a",
  "requestId": "fastify-tenant-a-001"
}
```

Use `curl.exe` in Windows PowerShell when `curl` is an alias. Repeat with `tenant-b`. Without `x-request-id`, the optional request ID is absent. `dbName` is absent for these requests; no execution database has been selected.

Missing/unknown tenants are rejected. Plain errors use Fastify's default HTTP 500 response; this checkpoint does not implement an application-specific error policy.

**Local diagnostic example only:** tenant selection is not authorization. The adapter supports infrastructure headers, and this first checkpoint has no production routing policy or model operations. Establish trusted database selection and authentication/authorization before building or exposing a data API.

## Files

- `src/app.ts`: public adapter installation, tenant validation, health/context routes.
- `src/core/tenancy.ts`: sample lazy tenant registrations using Core's public API.
- `src/main.ts`: environment, listener, and shutdown.
- `test/runtime.test.cjs`: public API and real HTTP acceptance tests.

## Verify and build

```sh
npm test
npm run build
npm start
```

Tests need no external services. They ignore `.env`, use ephemeral ports, and stop their own processes. They cover the published adapter's awaited context, 40 overlapping requests, validation, lazy registrations without connections, handler behavior, and source/compiled launchers. An architecture check prevents consumer-side adapter implementations from returning.

The launcher closes Fastify on SIGINT/SIGTERM. No database connections are opened.

## What comes next?

This completes the **overview checkpoint**, not all four planned pages. Tenant-backed model operations, transactions, middleware, and instrumentation follow in later briefs.
