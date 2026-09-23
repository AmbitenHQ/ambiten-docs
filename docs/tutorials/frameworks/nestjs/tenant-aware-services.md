# Tenant-Aware Services and Models

::: info Planned page
This is the second NestJS framework-track page. The detailed walkthrough will be added with its brief. The runnable checkpoint currently implements the [Overview & Runtime Boundary](/tutorials/frameworks/nestjs) only.
:::

## Purpose

Turn the execution-bound service into a tenant-aware Workspace API. Resolving identity at ingress and resolving tenant infrastructure are separate responsibilities.

## Planned scope

- Define tenant validation, authorization boundaries, and explicit HTTP error behavior without a fallback tenant.
- Add `core/db.ts` and `core/tenancy.ts` for reusable database infrastructure.
- Connect `MultiTenantManager` to a context-aware `UserModel`.
- Use the model through `UsersService` without passing NestJS request objects or routine tenant arguments into model calls.
- Verify isolated persistence for multiple tenants.

## Target checkpoint

```text
NestJS Request → Ambiten Interceptor → AmbitenContext
                                            ↓
                                    UsersController
                                            ↓
                                      UsersService
                                            ↓
                                        UserModel
                                            ↓
                                    Tenant Infrastructure
                                            ↓
                                      Tenant Database
```

Transactions remain out of scope until actual tenant-specific reads and writes work.

Previous: [NestJS Overview & Runtime Boundary](/tutorials/frameworks/nestjs).

Next: [Transaction Continuity Across Services](/tutorials/frameworks/nestjs/transaction-continuity), also planned.
