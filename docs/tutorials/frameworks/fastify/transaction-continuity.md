# Transaction Continuity

::: info Planned page
This is the third page of the Fastify framework track. The detailed workflow and code will be added in a later brief, after the [Tenant-Aware API](/tutorials/frameworks/fastify/tenant-aware-api) is established.
:::

## Purpose

Show multiple model operations participating in one execution transaction without introducing Fastify-specific persistence logic.

## Planned scope

- Begin with a verified adapter boundary and working tenant-specific persistence.
- Establish one transaction boundary and explain who owns its completion.
- Carry the active `ClientSession` through `AmbitenContext` into participating model operations.
- Demonstrate both successful commit and rollback after a deliberate failure.
- Verify persisted results, not only HTTP status codes or transaction log messages.

## Target checkpoint

```text
Fastify Request → AmbitenContext → Transaction Boundary
                                         ↓
                                Shared ClientSession
                                         ↓
                               Multiple Model Operations
                                         ↓
                                  Commit / Rollback
```

This page will require a transaction-capable MongoDB deployment. Transactions are not enabled in the overview. The eventual walkthrough must also distinguish participating MongoDB operations from external effects such as email, file storage, or queue publishing.

## Continue the track

Previous: [Runtime Boundary & Tenant-Aware API](/tutorials/frameworks/fastify/tenant-aware-api).

Next: [Middleware, Instrumentation & Production Notes](/tutorials/frameworks/fastify/middleware-instrumentation-production), also planned.
