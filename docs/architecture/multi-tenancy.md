# Multi-Tenancy

Multi-tenancy is a foundational runtime capability in Ambiten.

It is not implemented as a query convention layered on top of application code. It is enforced through the runtime itself.

That distinction defines the architecture.

This page explains how Ambiten preserves tenant isolation within an execution boundary. If you are looking for how execution state propagates through asynchronous operations, see [Context Binding](/models/context-binding).

<MultiTenancyOverview />

## Multi-tenancy in Ambiten

Multi-tenancy allows a single runtime environment to serve multiple tenants while preserving strict execution isolation between them.

In Ambiten, a tenant is not treated as a simple identifier attached to queries. A tenant defines an execution boundary. Depending on system design, that boundary may influence database resolution, collection scope, transaction continuity, middleware behavior, instrumentation metadata, and infrastructure routing.

Once a tenant boundary is established, execution remains scoped to that tenant for the lifetime of the runtime context unless explicitly overridden.

This model intentionally moves tenancy concerns out of business logic and into runtime coordination.

## The Ambiten model

Ambiten implements context-driven multi-tenancy.

Tenant identity is resolved at the system boundary, stored within `AmbitenContext`, and enforced through provider-aware infrastructure resolution. `AmbitenModel` operations execute inside that scope automatically without requiring tenant identifiers to be manually threaded through service calls or query helpers.

```ts
await UserModel.find({});
```

The operation remains tenant-aware even though no tenant information appears inside the model call itself.

## Typical execution flow

<SignalFlow
  aria-label="Multi-tenancy execution flow"
  :items='["Incoming request", "Tenant resolution", "AmbitenContext", "Model operation", "AmbitenClient", "MongoDB"]'
/>

Execution enters the runtime through an adapter or execution boundary. The adapter resolves tenant identity before runtime context initialization begins. Once the boundary is active, AmbitenContext stores the tenant scope and all subsequent runtime-aware components resolve infrastructure through that context automatically.

Application logic continues executing normally while providers resolve the correct tenant-aware infrastructure bindings underneath the runtime.

### Tenant resolution

Tenant identity should always be resolved at the edge of the system.

A common implementation uses request headers:

```ts
x-tenant-id: tenantA
```

The resolved tenant is then bound into the runtime context:

```ts
await AmbitenContext.run(
  {
    tenantId: 'tenantA'
  },
  async () => {
    await UserModel.find({});
  }
);
```

After the execution boundary is initialized, tenant identity becomes implicit throughout the runtime. Model operations remain infrastructure-independent while isolation continues to be enforced consistently underneath execution.

This separation is intentional. Application code focuses on domain behavior while the runtime owns tenant coordination.

### Provider-driven isolation

Tenant isolation is enforced through the provider layer rather than the model layer.

```ts
const db = await provider.db({
  tenantId: "tenantA"
});
```

In normal execution, application code still appears simple:

```ts
await UserModel.find({});
```

The model coordinates execution behavior while the provider resolves infrastructure bindings associated with the active tenant context.

This separation of responsibility is central to Ambiten’s architecture. Models remain focused on execution pipelines, middleware coordination, and schema-aware behavior, while providers remain responsible for tenant-aware infrastructure resolution.

**Conceptually:**

```ts
Model = execution
Provider = tenant isolation
```

### Tenant resolver

Tenant resolution itself is implemented through a resolver layer.

```ts
const client = new AmbitenClient({
  uri: "mongodb://127.0.0.1:27017",
  tenantResolver: {
    async getClient(tenantId) {
      return createTenantClient(tenantId);
    }
  }
});
```

The resolver defines how tenant identity maps to infrastructure resources such as MongoDB clients or databases.

Conceptually:

```ts
tenantId → MongoClient → Database
```

This is the only layer where tenancy resolution logic should exist. Centralizing tenant resolution prevents tenancy concerns from leaking into services, repositories, or business workflows.

## Isolation strategies

Ambiten supports multiple tenancy strategies, although they do not provide equivalent operational guarantees.

### Database-per-tenant

The recommended strategy is database-per-tenant isolation.

```ts
tenantA -> db_tenantA
tenantB -> db_tenantB
```

This approach provides the cleanest operational boundary, the safest isolation model, simpler backup and restore behavior, and the most predictable scaling characteristics. The tradeoff is increased infrastructure coordination and connection management overhead.

### Collection-per-tenant

Some systems isolate tenants through collection naming conventions.

```ts
users_tenantA
users_tenantB
```

This reduces some infrastructure overhead compared to database-per-tenant architectures, but introduces operational complexity around naming, lifecycle management, indexing, migrations, and scaling behavior.

### Shared database with filtering

The simplest model uses shared collections with tenant filtering:

```ts
{ tenantId: "tenantA" }
```

Although easy to implement initially, this strategy creates the highest risk of accidental cross-tenant leakage because correctness depends heavily on application discipline and consistent filtering behavior.

Ambiten supports this model, but does not treat it as equivalent to runtime-scoped tenant isolation.

## Runtime guarantees

Once tenant context is established, runtime behavior becomes tenant-scoped automatically.

Model operations resolve infrastructure through the correct tenant boundary, transactions remain attached to the active tenant session, middleware executes with tenant-aware context, and instrumentation carries tenant metadata consistently throughout execution.

This allows isolation guarantees to emerge from runtime behavior rather than developer convention.

## Scoped tenant execution

Outside request lifecycles, tenant scope can still be established explicitly.

```ts
const tenantClient = client.withTenant("tenantA");

await tenantClient.collection("users");
```

This pattern is useful for background workers, scheduled jobs, maintenance tooling, or administrative scripts where no external adapter boundary exists.

Even outside HTTP execution, tenant scope remains explicit and deterministic.

## Middleware integration

Middleware executes inside the active tenant boundary.

```ts
userSchema.post("create", async (ctx) => {
  console.log(ctx.tenantId);
});
```

Because middleware participates in the runtime context, systems such as auditing, policy enforcement, observability pipelines, soft-delete handling, and lifecycle instrumentation automatically remain tenant-aware without additional infrastructure propagation.

## Transactions and tenancy

Transactions remain tenant-bound throughout execution.

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(data);
});
```

All participating operations share the same tenant-aware database resolution and remain attached to the same MongoDB session for the lifetime of the transaction scope.

This prevents transaction drift across tenant boundaries.

## Caching and infrastructure reuse

Tenant-aware infrastructure resources can be cached and reused across execution boundaries.

```ts
tenantDBs: Map<tenantId, db>
```

This allows systems to reduce connection overhead, lower infrastructure latency, and improve runtime efficiency while still preserving strict tenant isolation.

Infrastructure reuse must still remain aware of tenant lifecycle management, provisioning models, and cluster topology considerations.

## Failure modes and guardrails

Tenant resolution should always be treated as a strict runtime concern.

If execution begins without a valid tenant boundary:

```bash
Error: Tenant not resolved in context
```

the runtime should fail immediately rather than continue with ambiguous infrastructure resolution.

In practice, this means tenant identity should be validated at the adapter boundary, overrides should remain tightly controlled, and fallback behavior should only exist when explicitly intended by the system architecture.

## What Ambiten prevents

A properly configured multi-tenant runtime prevents an entire category of infrastructure failures that commonly emerge in manually coordinated systems.

Cross-tenant query leakage, inconsistent tenant filtering, broken transaction continuity, duplicated tenancy logic, and fragmented infrastructure coordination are prevented by centralizing tenant enforcement inside the runtime itself rather than distributing that responsibility across application code.

## Best practices

Tenant resolution should occur at the system edge and remain outside application services or models. Database-per-tenant architectures should generally be preferred because they provide the clearest operational boundaries and the safest isolation guarantees.

Tenancy logic should remain centralized inside the `tenantResolver`, and systems should avoid mixing multiple isolation strategies unless there is a deliberate operational requirement to do so.

Most importantly, tenant identity should be treated as infrastructure state rather than business-domain data.

That distinction is fundamental to Ambiten’s runtime model.

## Mental model

<SignalFlow
  aria-label="Multi-tenancy mental model"
  :items='["Adapter", "AmbitenContext", "AmbitenModel", "Provider", "MongoDB"]'
/>

The adapter resolves tenant identity, `AmbitenContext` stores the active boundary, the model coordinates execution, the provider enforces infrastructure isolation, and MongoDB persists against the resolved tenant scope.

Tenant-aware execution becomes a runtime property rather than an application convention.

## Summary

Multi-tenancy in Ambiten is runtime-enforced, context-driven, and provider-resolved.

By treating tenant identity as part of the execution boundary rather than part of query construction, Ambiten allows systems to scale across tenants without pushing isolation logic into business code.

The result is a runtime architecture where tenant isolation remains predictable, enforceable, and safe by default.

## Related pages

- [Context](/core/context)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [AmbitenClient](/reference/api/ambiten-client)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
