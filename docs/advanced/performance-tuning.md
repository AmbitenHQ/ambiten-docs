# Performance Tuning

Performance tuning in Ambiten is about understanding the full execution path, not only the MongoDB query.

A slow operation may originate from the database, but it may also come from middleware overhead, tenant resolution, cache negotiation, transaction scope, or repeated model execution inside the same request lifecycle.

Ambiten approaches performance as a runtime concern rather than a query-only concern. The goal is not simply to make MongoDB faster, but to make the entire execution boundary measurable and predictable.

<DocOverviewCards 
eyebrow="Runtime Performance" title="Tune the execution system, not only the database query." description="Ambiten performance work begins with runtime telemetry, then narrows into query shape, middleware overhead, tenant routing, cache behavior, transaction scope, and connection pressure." accent="#E10098"
:signals='["durationMs", "queriesExecuted", "totalBudgetUsed", "tenantId", "collectionName", "cacheHit"
]'
:cards='[
{ "label": "Measure", "title": "Start with runtime-aware telemetry", "text": "Performance tuning begins by identifying where execution time is actually spent across the runtime path."
}, 
{ "label": "Reduce", "title": "Eliminate repeated or unnecessary work", "text": "Focused queries, smaller middleware chains, and batched access patterns keep request cost predictable."
}, 
{ "label": "Constrain", "title": "Keep runtime boundaries intentional", "text": "Short transactions, efficient tenant resolution, and scoped caching prevent operational overhead from dominating execution."
}
]'
:flow='[
{ "label": "Instrument", "title": "Capture telemetry" },
{ "label": "Locate", "title": "Identify runtime cost" },
{ "label": "Tune", "title": "Adjust execution path" },
{ "label": "Verify", "title": "Compare telemetry" }
]'
/>

## The execution path

A Ambiten operation typically flows through several runtime boundaries:

```Plain text
Adapter → AmbitenContext → AmbitenModel → Middleware → Provider → AmbitenClient → MongoDB
```

Performance work starts by understanding which part of that path is introducing cost.

A slow request is not automatically a slow database query.

The database may be healthy while middleware performs excessive work, tenant resolution performs repeated lookups, or transaction scope becomes unnecessarily large.

## Start with instrumentation

Instrumentation should always come before optimization.

Ambiten’s runtime-aware telemetry allows performance work to begin with evidence instead of assumptions.

```ts
const users = await measureQuery(
  {
    operation: "find",
    collectionName: "users",
    filter: { active: true },
    extra: {
      feature: "users.list"
    }
  },
  async () => {
    return UserModel.find({ active: true });
  }
);
```

A measured operation can expose telemetry such as:

```JSON
{
  "operation": "find",
  "collectionName": "users",
  "tenantId": "tenant-a",
  "requestId": "req-123",
  "durationMs": 32.4,
  "queriesExecuted": 4,
  "totalBudgetUsed": 118.7,
  "status": "success"
}
```

The important signal is not only duration.

The combination of request identity, tenant scope, query count, collection access, and accumulated budget is what reveals the real operational cost.

## Query shape still matters

Even in a runtime-aware system, inefficient queries remain one of the most common causes of poor performance.

Prefer selective filters and predictable access patterns.

```ts
await UserModel.find({
  email: "amina@example.com"
});
```

Fields frequently used for lookup should be indexed intentionally:

```ts
userSchema.index({ email: 1 });
```

Multi-tenant systems should also index fields commonly involved in lifecycle or isolation behavior:

```ts
userSchema.index({ isDeleted: 1 });
userSchema.index({ createdAt: -1 });
```

Indexes should reflect real execution patterns rather than theoretical access paths.

## Watch request budgets

Runtime-level instrumentation makes repeated query behavior visible.

Signals such as `queriesExecuted`, `maxQueries`, and `totalBudgetUsed` help identify request inflation and N+1 execution patterns.

This pattern becomes expensive quickly:

```ts
const users = await UserModel.find({});

for (const user of users) {
  await ConversionModel.find({ userId: user._id });
}
```

A batched approach is typically safer:

```ts
const users = await UserModel.find({});
const userIds = users.map((user) => user._id);

const conversions = await ConversionModel.find({
  userId: { $in: userIds }
});
```

Reducing repeated round trips keeps request cost more predictable and easier to scale.

## Keep middleware lightweight

Middleware runs directly inside the execution path.

Validation, policy enforcement, and normalization are appropriate middleware responsibilities, but expensive external work inside hot execution paths can degrade throughput quickly.

A focused middleware hook remains inexpensive and predictable:

```ts
userSchema.pre("find", async (ctx) => {
  ctx.filter = {
    ...(ctx.filter || {}),
    isDeleted: { $ne: true }
  };
});
```

Middleware should remain operationally local to the persistence boundary.

Long-running network calls, large transformations, or unrelated orchestration logic are usually better placed elsewhere.

## Use caching intentionally

Caching can reduce database load, but poorly designed cache boundaries often create operational complexity or additional latency.

Effective cache strategy begins with clarity around:

```Plain text
What is cached?
How long does it live?
How is it invalidated?
Which tenant owns the namespace?
```

In multi-tenant systems, cache scope should remain tenant-aware:

```ts
tenant-a:users:active
```

Caching is most effective when applied to stable, frequently requested data with predictable invalidation behavior.

## Keep transaction scope small

Transactions improve consistency, but they introduce coordination cost.

Use transactions when multiple writes must succeed or fail together:

```ts
await AmbitenContext.withTransaction(async () => {
  await OrderModel.create(order);
  await InventoryModel.updateOne(filter, update);
});
```

Avoid external latency inside transaction boundaries:

```ts
await AmbitenContext.withTransaction(async () => {
  await callExternalPaymentApi();
  await OrderModel.create(order);
});
```

Long-running transactions hold resources longer and increase operational contention under load.

## Optimize tenant resolution

In multi-tenant systems, runtime routing itself can become a bottleneck.

If tenant lookup requires repeated expensive work on every request, infrastructure resolution becomes slower than persistence.

Efficient tenant resolution should:

- reuse initialized clients where possible
- cache stable tenant metadata
- avoid repeated infrastructure negotiation
- keep routing deterministic

Ambiten’s provider model keeps tenant routing outside business logic so infrastructure optimization can evolve independently from application code.

## Use explicit scopes in workers

Background jobs and detached execution flows should establish explicit runtime scope rather than relying on request-bound context.

```ts
const tenantProvider = client.withTenant("tenant-a");

const JobModel = new AmbitenModel({
  collectionName: "jobs",
  schema: jobSchema,
  provider: tenantProvider
});
```

Explicit scope creation keeps background execution predictable and avoids accidental runtime leakage.

## Connection pool discipline

Connection behavior should be tuned according to workload characteristics and tenancy strategy.

Database-per-tenant architectures often require more careful connection management than shared-database systems.

Watch for operational symptoms such as:

```Plain text
Pool exhaustion
Excessive tenant clients
Slow server selection
Long-lived sessions
```

Connection tuning should be driven by production telemetry rather than static assumptions.

## Aggregation efficiency

Aggregation pipelines can become expensive quickly if filtering happens too late.

Selective `$match` stages should appear early:

```ts
[
  { $match: { isDeleted: { $ne: true } } },
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", total: { $sum: 1 } } }
]
```

Reducing the dataset earlier lowers the cost of downstream pipeline stages.

## Prefer structured telemetry over debug output

Verbose debug output may be useful during development, but production systems should rely on structured instrumentation instead.

Structured telemetry is easier to aggregate, search, correlate, and alert against.

Operational visibility should come from runtime signals rather than uncontrolled console output.

## Operational checklist

Performance tuning becomes more reliable when approached systematically.

Before optimizing an operation, verify:

```Plain text
Is the operation instrumented?
Is the query indexed?
Is middleware introducing unnecessary cost?
Is the request making repeated model calls?
Is transaction scope larger than necessary?
Is tenant resolution efficient?
Is cache helping or adding latency?
Is aggregation filtering early enough?
Is connection pressure observable?
```

## Summary

Performance tuning in Ambiten begins at the runtime layer, not only at the database layer.

Because execution is instrumented across middleware, context propagation, transactions, tenant routing, provider resolution, and persistence, teams can identify where operational cost actually originates.

That visibility allows optimization work to become more precise, more measurable, and better aligned with real production behavior.

## Related pages

- [Instrumentation](/core/instrumentation)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Multi-Tenancy](/architecture/multi-tenancy)
- [AmbitenClient](/reference/api/ambiten-client)
