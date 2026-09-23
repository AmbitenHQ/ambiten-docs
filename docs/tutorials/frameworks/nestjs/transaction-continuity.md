# Transaction Continuity Across Services

::: info Planned page
This is the third NestJS framework-track page. The detailed workflow will follow [Tenant-Aware Services and Models](/tutorials/frameworks/nestjs/tenant-aware-services). Transactions are not enabled in the current runnable checkpoint.
:::

## Purpose

Demonstrate multiple service and model operations participating in one execution transaction, with a single owner for commit and rollback.

## Planned scope

- Begin with verified context propagation and tenant-specific persistence.
- Establish one transaction boundary using a transaction-capable MongoDB deployment.
- Carry a shared `ClientSession` through service calls and participating model operations.
- Verify that the chosen boundary waits for downstream asynchronous completion before committing.
- Demonstrate successful commit and deliberate failure with rollback, checking persisted results.
- Distinguish MongoDB transaction participation from external effects such as email or queue publishing.

## Target checkpoint

```text
NestJS → AmbitenContext → Transaction Boundary
                                ↓
                    Service A + Service B
                                ↓
                   Models sharing one session
                                ↓
                         Commit / Rollback
```

Context propagation alone does not prove transaction lifecycle correctness. The transaction page needs its own completion and rollback tests.

Previous: [Tenant-Aware Services and Models](/tutorials/frameworks/nestjs/tenant-aware-services).

Next: [Middleware, Instrumentation & Production Structure](/tutorials/frameworks/nestjs/middleware-instrumentation-production), also planned.
