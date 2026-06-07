# Aggregate

Aggregation allows Ambiten models to execute MongoDB pipelines for advanced filtering, reshaping, grouping, and analytical reads.

In Ambiten, aggregation is still part of the runtime. Pipelines can participate in middleware, tenant-aware resolution, transaction scope, streaming execution, and caching behavior without leaving the model layer.

## What aggregation means in Ambiten

Aggregation is the execution path used when ordinary reads are no longer expressive enough.

Typical workloads include:

- grouped or summarized data
- analytical projections
- reporting pipelines
- transformation-heavy reads
- staged filtering and reshaping

Unlike isolated driver calls, Ambiten aggregates still move through the same runtime model as the rest of the system.

## Basic aggregation

```ts
const results = await UserModel.aggregate([
  { $match: { active: true } },
  { $group: { _id: "$role", count: { $sum: 1 } } }
]);
```

MongoDB performs the grouping and transformation directly in the pipeline, reducing application-side reshaping work.

## Typical execution flow

<AggregateOperationFlow />

Aggregation often becomes one of the most performance-sensitive parts of the data layer, which makes runtime visibility and pipeline discipline especially important.

## Runtime behavior

In a standard aggregation flow:

- middleware can reshape or prepend pipeline stages
- tenant and database scope resolve from context
- the pipeline executes against the resolved collection
- post-execution hooks can observe or enrich the result

This keeps aggregate behavior aligned with the same execution contract used by reads and writes.

## Middleware around aggregation

Aggregation middleware is commonly used for policy injection and runtime safety.

```ts
userSchema.pre("aggregate", async (ctx) => {
  ctx.pipeline.unshift({
    $match: { isDeleted: false }
  });
});
```

This pattern is useful for soft-delete enforcement, tenant-safe filtering, audit stages, and default query constraints that should remain centralized.

## Context-aware aggregation

Aggregates can execute against an explicit runtime scope when necessary:

```ts
await UserModel.aggregate(
  [{ $match: { active: true } }],
  {},
  undefined,
  { tenantId: "tenant-a" }
);
```

Most request-driven systems should still rely on adapter-managed or `AmbitenContext`-managed execution rather than manually passing runtime state.

Explicit overrides are mainly useful for workers, maintenance jobs, and controlled infrastructure workflows.

## Aggregation inside transactions

Aggregates can participate in an active transaction boundary:

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.aggregate([
    { $match: { active: true } }
  ]);
});
```

This is useful when read consistency matters inside a larger transactional workflow, although long-running aggregates inside transactions should still be approached carefully because transactions add coordination overhead.

## Streaming aggregation

For large result sets or incremental processing, streaming is often the better execution model:

```ts
const stream = await UserModel.streamAggregation([
  { $match: { active: true } }
]);

stream.on("data", console.log);
```

Streaming avoids loading the full result into memory and works well for reporting pipelines, workers, and batch-oriented processing.

## Cached aggregation

Aggregation is frequently a strong candidate for caching because analytical reads can become expensive under load.

```ts
await UserModel.aggregateWithCache(
  pipeline,
  "cache:key",
  300
);
```

Caching is especially valuable for dashboards, repeated summaries, and tenant-specific reporting workloads where results change less frequently than they are requested.

## Multi-tenant aggregation

Aggregation becomes especially sensitive in multi-tenant systems because analytical queries often expose large data surfaces.

When execution scope includes tenant identity, aggregates can still resolve:

- the correct tenant database
- the correct collection scope
- the active session when transactions are involved

This helps analytical reads remain tenant-safe without pushing infrastructure rules into every pipeline definition.

## Pipeline design considerations

Aggregation pipelines should be treated as operational architecture, not only query syntax.

Good pipeline design usually means:

- pushing selective `$match` stages early
- supporting filters with indexes
- keeping `$lookup` usage intentional
- reducing unnecessary projections
- measuring pipeline cost continuously

The more central aggregation becomes to product behavior or reporting infrastructure, the more important those decisions become.

## Common patterns

Group active users by role

```ts
const results = await UserModel.aggregate([
  { $match: { active: true } },
  { $group: { _id: "$role", count: { $sum: 1 } } }
]);
```

Inject pipeline safety through middleware

```ts
userSchema.pre("aggregate", async (ctx) => {
  ctx.pipeline.unshift({
    $match: { isDeleted: false }
  });
});
```

Stream large aggregate results

```ts
const stream = await UserModel.streamAggregation([
  { $match: { active: true } }
]);

stream.on("data", (row) => {
  console.log(row);
});
```

Cache analytical reads

```ts
await UserModel.aggregateWithCache(
  [
    { $match: { active: true } },
    { $group: { _id: "$role", count: { $sum: 1 } } }
  ],
  "users:active-by-role",
  300
);
```

## Best practices

Keep pipelines measurable and deliberate. Aggregation becomes expensive quickly when stages are broad or poorly ordered.

Prefer early filtering, intentional projections, and middleware-based policy injection where runtime safety must remain consistent.

Use streaming or caching when workload shape makes them operationally advantageous rather than defaulting to fully materialized reads.

Most importantly, treat aggregation as part of the runtime—not as an escape hatch from it.

## Summary

Aggregate operations in Ambiten provide a runtime-aware path for advanced MongoDB pipeline execution.

By combining pipelines with middleware, context propagation, transaction awareness, streaming, and caching, Ambiten keeps analytical reads aligned with the same execution model as the rest of the system instead of turning them into isolated infrastructure code.

## Related pages

- [Read](/crud/read)
- [Create](/crud/create)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Instrumentation](/core/instrumentation)
