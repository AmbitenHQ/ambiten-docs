# Tutorial 6 — Multi-Tenant Execution

> Estimated time: 20–25 minutes

Tutorial 6 makes tenant-aware infrastructure tangible: the same `UserModel` routes to different MongoDB databases according to `x-tenant-id`.

```text
Request → x-tenant-id → Express Adapter → AmbitenContext.tenantId → UserModel → Effective ModelContext → MultiTenantManager → Tenant Database
```

## Tenant mapping

```text
tenant-a → ambiten_tutorial_tenant_a
tenant-b → ambiten_tutorial_tenant_b
```

Both use the same MongoDB server but separate databases and `users` collections. The request supplies tenant identity, never a database name.

## Responsibilities

```text
Adapter tenant resolver → identifies the tenant
AmbitenContext          → carries the active tenantId
MultiTenantManager      → owns tenant infrastructure
AmbitenModel            → binds execution state to persistence
MongoDB                 → persists tenant data
```

The checkpoint registers the two known tenants lazily in `src/core/tenancy.ts`, validates `x-tenant-id` through the adapter, and closes any created tenant clients on shutdown.

## Test isolation

Create the same email for both tenants:

```bash
curl -X POST http://localhost:3000/users -H "x-tenant-id: tenant-a" -H "Content-Type: application/json" -d '{"name":"Amina — Tenant A","email":"shared@example.com"}'
curl -X POST http://localhost:3000/users -H "x-tenant-id: tenant-b" -H "Content-Type: application/json" -d '{"name":"Amina — Tenant B","email":"shared@example.com"}'
```

Reading `GET /users` with each header resolves a different database while using the same route, service, model, and collection name.

## Important boundaries

- `x-tenant-id` is not authorization; authentication and authorization remain separate.
- Tenant registration is process infrastructure, not per-route work.
- Do not use a public database-name header or mutable global database switching.
- Missing or unknown tenants should fail rather than silently fall back to another tenant.

## Next tutorial

Tutorial 7 introduces transaction continuity: a transaction boundary owns commit and rollback while model operations participate through execution-scoped session state.
