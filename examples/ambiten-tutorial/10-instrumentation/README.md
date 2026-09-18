# Tutorial 10 — Instrumentation

This is the complete, independent checkpoint for the documentation read-through at
[`docs/tutorials/10-instrumentation.md`](../../../docs/tutorials/10-instrumentation.md).
The separate PDF SaaS tutorial is unchanged.

## Run

Use Node.js 22.13 or later and a running MongoDB server. From this directory:

```bash
npm ci
cp .env.example .env
npm run typecheck
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env`. Do not overwrite an existing
configuration. Edit `MONGO_URI`, `DB_NAME`, and `PORT` as needed. The two demo
tenants use `ambiten_tutorial_tenant_a` and `ambiten_tutorial_tenant_b`.

Alternatively, use `pnpm install`, `pnpm typecheck`, and `pnpm dev`.
To run compiled code, stop the development server and run `npm run build` followed
by `npm start` (or `pnpm build` and `pnpm start`).

```bash
curl http://localhost:3000/instrumentation/users \
  -H "x-tenant-id: tenant-a" \
  -H "x-request-id: tutorial-10-a"
```

Repeat with `tenant-b`. Each response contains `execution`, `signals`, and `users`.
An empty tenant database still produces a successful `find` signal. Request IDs
come from `x-request-id`; the adapter does not generate them when omitted.

The checkpoint includes the user and audit models, lifecycle policy, CRUD and
soft-delete/restore/purge routes, tenant infrastructure route, and transaction
service. `POST /users/transactional` requires a replica set or sharded MongoDB
deployment; the observed read works on standalone MongoDB.

## Verify automatically

Install `mongod` locally and make it available on `PATH`, then run:

```bash
npm run test:smoke
```

If it is not on `PATH`, set `MONGOD_BINARY` to its full executable path first.
The test uses its own temporary MongoDB replica set, unused ports, and compiled
application. It verifies HTTP instrumentation, concurrent tenant/request
isolation, lifecycle behavior, transaction commit/rollback, error signals, and
parent context/session restoration. It stops its processes and removes only its
own temporary data. It does not use your existing MongoDB databases or `.env`.

## Compatibility notes

- Core `1.2.4` dispatches observers with `setImmediate()`. The helper waits for
  queued callbacks before returning signals, including on failure.
- The pinned package's declarations need Bundler resolution and the explicit
  Express 5 type mapping in `tsconfig.json`. The schema assertions isolate an
  upstream declaration mismatch; runtime schemas use `{ type, required }` options.
- `npm start` retains the existing `tsx` loader to resolve extensionless imports
  in the published adapter-types ESM. Keep development dependencies installed.
- The cross-model transaction clears the initiating collection override without
  changing its tenant or session, so audit entries go into `audit_logs`.

This is a local teaching application. Tenant headers are not authentication;
production applications must derive tenant identity from trusted authentication
and restrict infrastructure overrides. No logger backend, tracing integration,
dashboard, or metrics store is configured here.
