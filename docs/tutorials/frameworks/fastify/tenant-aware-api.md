# Runtime Boundary & Tenant-Aware API

::: info Planned page
This is the second page of the Fastify framework track. Its detailed walkthrough will be added with the next brief. Start with the [Fastify Overview](/tutorials/frameworks/fastify), which installs the public adapter and validates sample tenants.
:::

## Purpose

Connect a working Fastify execution boundary to tenant-specific MongoDB infrastructure. Tenant identity answers who the execution is for; infrastructure resolution answers where that tenant's data lives.

## Planned scope

- Install the adapter in the application route scope and verify context inside asynchronous handlers.
- Resolve and validate tenant identity at ingress, keeping authorization distinct from routing.
- Configure reusable MongoDB infrastructure and `MultiTenantManager`.
- Extend `core/tenancy.ts` and add the application's `core/db.ts`, `models/user.model.ts`, and `routes/users.routes.ts` modules.
- Build model-backed Workspace API endpoints without passing Fastify request objects into the persistence layer.
- Demonstrate that requests for two tenants resolve the correct database without leaking context.

## Target checkpoint

```text
Fastify Request → Adapter → AmbitenContext → UserModel
                                              ↓
                                  Effective ModelContext
                                              ↓
                                    Tenant Infrastructure
                                              ↓
                                      Tenant Database
```

A completed checkpoint will demonstrate actual tenant-isolated reads and writes. Merely returning a tenant header is not sufficient. Transactions remain out of scope until this path is verified.

## Continue the track

Previous: [Fastify Overview](/tutorials/frameworks/fastify).

Next: [Transaction Continuity](/tutorials/frameworks/fastify/transaction-continuity), also planned.
