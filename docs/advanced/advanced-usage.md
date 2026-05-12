# Advanced Usage

Advanced usage in Tenra begins when the runtime becomes part of broader platform architecture rather than a simple application dependency.

At this stage, the system is no longer concerned only with CRUD operations or isolated request handling. The focus shifts toward transaction orchestration, tenant isolation strategy, worker execution, observability, scaling discipline, and operational correctness across distributed runtime boundaries.

These patterns are especially relevant for multi-tenant SaaS platforms, high-throughput APIs, queue-driven systems, distributed services, and production environments where execution behavior must remain predictable under load.

<AdvancedUsageOverview />

## What “advanced” means in Tenra

Advanced usage is not about obscure APIs or complicated abstractions.

It is about understanding how Tenra’s runtime model behaves when applications become more concurrent, more distributed, and more operationally sensitive.

At that point, architectural decisions around context propagation, transaction scope, tenant isolation, instrumentation, and runtime boundaries become significantly more important than individual method calls.

The runtime itself becomes part of the system architecture.

## Transaction orchestration

Tenra already provides automatic transaction propagation through `TenraContext.withTransaction(...)`, but advanced systems require a more deliberate understanding of transaction boundaries and execution behavior.

A standard transaction flow remains intentionally simple:

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.create({ name: "Alice" });
  await OrderModel.create({ user: "Alice" });
});
```

The important architectural behavior is what happens underneath the surface.

Nested execution paths reuse the same session boundary automatically, preventing conflicting transaction scopes from emerging across deep service chains. The runtime maintains one coherent transactional unit rather than allowing multiple competing sessions to form accidentally.

In some systems, lower-level transaction orchestration may still be appropriate:

```ts
await runManualTransaction(async (session) => {
  await UserModel.create(
    { name: "Alice" },
    { session }
  );
});
```

This style is typically reserved for workflow engines, infrastructure orchestration layers, or specialized integrations where commit timing must be controlled explicitly.

For most application-level execution, the runtime-managed transaction boundary remains the preferred model.

## Multi-tenancy as architecture

Multi-tenancy is one of the most consequential design decisions in any Tenra-based system.

The chosen isolation strategy directly affects operational safety, scalability, infrastructure cost, observability, and long-term maintainability.

A tenant-per-database model usually aligns best with enterprise SaaS systems:

```sh
tenantA → dbA
tenantB → dbB
```

This approach provides stronger operational separation, clearer recovery boundaries, and safer long-term governance. It is particularly valuable in environments where tenant isolation, backups, auditing, or regulatory separation matter operationally.

Collection-based segmentation can still be appropriate in lighter-weight deployments:

```sh
users_tenantA
users_tenantB
```

This lowers infrastructure overhead but introduces more operational discipline requirements around naming, indexing, and isolation enforcement.

Some systems eventually adopt hybrid approaches, using stronger isolation for sensitive workloads while allowing lighter segmentation elsewhere.

The important principle is consistency. Tenant strategy should be treated as a foundational architectural decision rather than a late-stage optimization.

## Explicit context management

Once execution leaves the standard request lifecycle, context handling becomes an explicit responsibility.

Inside adapter-managed requests, runtime boundaries are established automatically. Outside those flows, context must be created deliberately.

```ts
await TenraContext.run(
  {
    tenantId: "tenant-a",
    requestId: "manual-ctx"
  },
  async () => {
    await UserModel.find({});
  }
);
```

This pattern becomes essential for scheduled jobs, queue workers, CLI commands, migrations, maintenance tooling, and detached background execution.

The key principle is simple:

If execution does not originate from a managed adapter boundary, the runtime scope should usually be established explicitly.

## Background workers and detached execution

Background processing is one of the most common places where runtime guarantees are accidentally lost.

Detached async execution does not automatically inherit request context, transaction state, or tenant boundaries.

A worker should establish its own execution scope intentionally:

```ts
async function processJob(job) {
  await TenraContext.run(
    {
      tenantId: job.tenantId,
      requestId: `job-${job.id}`
    },
    async () => {
      await UserModel.updateMany(
        {},
        { $set: { processed: true } }
      );
    }
  );
}
```

This preserves tenant-aware execution, observability continuity, and predictable runtime behavior even outside normal HTTP request lifecycles.

Detached execution without an explicit runtime boundary is generally unsafe:

```ts
setTimeout(async () => {
  await UserModel.find({});
});
```

In these cases, execution may occur after the original context boundary has already been released.

## Performance and scaling discipline

Advanced Tenra usage also requires operational discipline around infrastructure efficiency.

Runtime coherence does not remove the need for strong MongoDB operational practices.

Connection reuse remains important. Shared MongoClient instances should generally remain long-lived rather than being recreated per request.

Query discipline also matters:

```ts
await UserModel.find(
  {},
  {
    projection: { name: 1 }
  }
);
```

Efficient projections, intentional indexing, measurable aggregation pipelines, and tenant-aware workload analysis remain critical for high-throughput systems.

Tenra improves execution consistency. It does not eliminate the realities of distributed database performance.

## Observability and diagnostics

Production systems require more than correctness. They must also remain inspectable under operational pressure.

Instrumentation becomes significantly more valuable when enriched by runtime context:

```ts
await measureQuery(
  "UserModel.find",
  async () => {
    return UserModel.find({});
  }
);
```

Runtime-aware logging also becomes more meaningful when correlated with tenant and request scope:

```ts
const ctx = TenraContext.get();

console.log({
  tenant: ctx?.tenantId,
  requestId: ctx?.requestId
});
```

Because execution metadata flows through the runtime automatically, logs, traces, metrics, and telemetry remain aligned across the execution chain.

This is especially important in multi-tenant systems where operational visibility must remain tenant-aware.

## Middleware as operational control

In advanced systems, middleware evolves from a convenience mechanism into a centralized operational control layer.

Policies such as auditing, tenant enforcement, normalization, soft delete behavior, and observability shaping become easier to manage when they execute consistently around model operations.

Example:

```ts
userSchema.pre("find", async (ctx) => {
  if (!ctx.tenantId) {
    throw new Error("Missing tenant context");
  }
});
```

This approach prevents infrastructure and policy logic from spreading across services, controllers, or resolver layers.

The runtime becomes the enforcement surface rather than the application layer itself.

## Cross-service execution boundaries

In distributed systems, execution context cannot remain isolated to a single process boundary.

Tenant identity and correlation identifiers often need to propagate explicitly between services:

```ts
fetch("/api/users", {
  headers: {
    "x-tenant-id": tenantId,
    "x-request-id": requestId
  }
});
```

This preserves traceability, tenant-aware execution, and operational continuity across service boundaries.

Without this propagation, distributed systems quickly lose observability coherence.

## Production readiness

Production readiness in Tenra is primarily about execution discipline.

Context boundaries should be established consistently. Tenant resolution should be validated under real workloads. Transaction boundaries should remain intentional rather than indiscriminate. Background workers should establish explicit execution scope. Instrumentation should include tenant and request metadata. Infrastructure ownership and connection lifecycles should remain operationally stable.

The runtime model is strongest when operational discipline matches architectural intent.

## Mental model

```Plain Text
Context defines execution.
Transactions protect consistency.
Providers resolve infrastructure.
Middleware enforces policy.
Instrumentation exposes behavior.
```

Advanced Tenra systems emerge when these layers work together coherently rather than independently.

## Summary

Advanced usage in Tenra is ultimately about runtime architecture.

As systems scale across tenants, requests, services, workers, and infrastructure boundaries, execution correctness becomes increasingly dependent on consistent runtime behavior rather than isolated application code.

Tenra’s architecture is designed to preserve that consistency through context-aware execution, runtime-scoped transactions, centralized policy enforcement, tenant-aware infrastructure resolution, and structured observability.

The larger the system becomes, the more important those guarantees become.

## Related pages

- [Context](/core/context)
- [Transactions](/core/transactions)
- [Instrumentation](/core/instrumentation)
- [TenraBootstrap](/advanced/bootstrap-cli)
- [CLI Init](/advanced/cli-init)
- [Architecture](/architecture/whitepaper)
