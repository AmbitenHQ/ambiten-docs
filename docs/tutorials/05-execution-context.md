# Tutorial 5 — Execution Context

> Estimated time: 15–20 minutes

Tutorial 4 added an HTTP boundary. This tutorial makes the adapter-managed execution state visible:

```text
HTTP Request → Express → Ambiten Express Adapter → AmbitenContext → Route → Service → AmbitenModel → Effective ModelContext → MongoDB
```

## What you will learn

`AmbitenContext` is execution-scoped state. The Express adapter establishes the request boundary; application code reads the active context with `AmbitenContext.get()` without manually passing it through every asynchronous function.

## The example

The Tutorial 5 checkpoint is [05-context](../../examples/ambiten-tutorial/05-context). Its `GET /users` route reads context, calls a service, and the service reads it before and after `await Promise.resolve()` before querying `UserModel`.

```text
Route Context → Service Context before await → Service Context after await → Helper Context → Model runtime
```

These are reads of one active execution, not separate contexts. Optional fields may be `undefined` for the current adapter configuration; the demonstration is that the same scope remains available.

## Process state vs execution state

```text
Process lifetime:   Express app, AmbitenClient, MongoDB connection, models
Execution lifetime: requestId, dbName, collectionName, future tenant/session metadata
Operation lifetime: Effective ModelContext and a model operation
```

Create infrastructure once; do not create a client per request or use mutable global request state.

## Model context binding

`AmbitenContext` represents the broader execution. `ModelContext` is the persistence-facing state of one operation.

```text
AmbitenContext → AmbitenModel → Effective ModelContext → Persistence operation
```

They are complementary. The model derives relevant execution state while coordinating persistence.

## Run

```bash
pnpm install
pnpm dev
curl http://localhost:3000/users
```

The JSON response includes route, service-before-await, service-after-await, and helper context reads plus the users collection.

## Common mistakes

- Do not manually call `AmbitenContext.run()` inside adapter-managed routes.
- Do not carry business payloads in execution context.
- Do not treat a context value as authorization.
- Do not assume in-memory context crosses process or service boundaries.

Use `AmbitenContext.run(...)` for work that originates outside an adapter—such as jobs, CLI commands, or scheduled work.

## Next tutorial

Tutorial 6 introduces tenant identity and tenant-aware infrastructure. Context will carry `tenantId`; tenant infrastructure will remain a separate runtime responsibility.
