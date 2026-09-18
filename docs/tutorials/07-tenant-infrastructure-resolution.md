# Tutorial 7 — Tenant Infrastructure Resolution

> Estimated time: 20–25 minutes

Tutorial 6 established tenant identity. Tutorial 7 connects that identity to MongoDB infrastructure:

```text
AmbitenContext.tenantId → AmbitenClient tenant resolver → MultiTenantManager → Tenant MongoClient → Tenant Database
```

`tenant-a` maps to `ambiten_tutorial_tenant_a`; `tenant-b` maps to `ambiten_tutorial_tenant_b`. The new checkpoint is `examples/ambiten-tutorial/07-tenant-infrastructure`.

The explicit `tenantResolver.getClient()` bridge lets direct `client.db({ tenantId })` resolve a lazy registered tenant client. `GET /tenant/infrastructure`, inside the tenant-aware adapter boundary, reports the configured and resolved database names plus whether its lazy client is connected.

`/health` remains a process-level route; tenant-aware routes are registered after adapter installation. The request supplies tenant identity only—database topology remains infrastructure-owned.

## Next tutorial

Continue to [Tutorial 8 — Transaction Continuity](/tutorials/08-transaction-continuity).
