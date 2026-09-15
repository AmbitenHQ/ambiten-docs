# Aggregate

Aggregation allows Ambiten models to execute MongoDB pipelines for advanced filtering, reshaping, grouping, and analytical reads.

In Ambiten, aggregation remains part of the model runtime. Depending on the configured execution path, pipelines can participate in schema middleware, tenant-aware infrastructure resolution, transaction session propagation, streaming, caching, and instrumentation without dropping down to unrelated database plumbing.

## What aggregation means in Ambiten

Aggregation is useful when ordinary reads are no longer expressive enough.

Typical workloads include:

- grouped or summarized data
- analytical projections
- reporting pipelines
- transformation-heavy reads
- staged filtering and reshaping

An aggregate operation still participates in the model execution path.

```text
Application
      ↓
AmbitenModel.aggregate()
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Collection Resolution
      ↓
DbProvider / AmbitenClient
      ↓
MongoDB
```

MongoDB performs the pipeline execution, while Ambiten coordinates the model and runtime state surrounding that operation.

## Basic aggregation

```ts
const results =
  await UserModel.aggregate([
    {
      $match: {
        active: true
      }
    },
    {
      $group: {
        _id: "$role",
        count: {
          $sum: 1
        }
      }
    }
  ]);
```

MongoDB performs the grouping and transformation directly in the pipeline, reducing the amount of reshaping that must happen in application code.

## Typical execution flow

<AggregateOperationFlow />

Aggregation can become one of the more performance-sensitive areas of a data layer, which makes pipeline design, runtime visibility, indexing, and workload discipline especially important.

## Runtime behavior

In a configured aggregation flow:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Aggregate Middleware
      ↓
Collection Resolution
      ↓
Provider Resolution
      ↓
MongoDB Pipeline
      ↓
Post-Operation Behavior
```

Schema middleware can inspect or modify the pipeline where aggregate middleware has been configured.

Tenant identity, database scope, and transaction session can be inherited through the Effective `ModelContext`.

The model retains responsibility for the collection boundary, while the provider path resolves the MongoDB infrastructure required by the operation.

This keeps aggregation aligned with the same runtime model used by other Ambiten model operations.

## Middleware around aggregation

Aggregation middleware can be useful for persistence-level policy and default query behavior.

```ts
userSchema.pre(
  "aggregate",
  async (ctx) => {
    ctx.pipeline.unshift({
      $match: {
        isDeleted: false
      }
    });
  }
);
```

This pattern can be appropriate for concerns such as:

```text
soft-delete filtering
default query constraints
pipeline normalization
persistence-level policy
```

Tenant filtering can also be introduced through middleware when the application's storage topology requires tenant discrimination inside a shared collection.

It should not be assumed that every multi-tenant system needs a tenant `$match` stage.

For example, applications using separate tenant databases may establish tenant separation through infrastructure resolution rather than through pipeline filtering.

## Context-aware aggregation

Aggregate operations can also receive explicit persistence-facing context when a controlled execution path requires it:

```ts
await UserModel.aggregate(
  [
    {
      $match: {
        active: true
      }
    }
  ],
  {},
  undefined,
  {
    tenantId: "tenant-a"
  }
);
```

The normal context precedence remains:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

In adapter-managed application flows, explicit tenant or database overrides usually do not need to be supplied when the required execution state has already been established through `AmbitenContext`.

Explicit operation context is more useful for controlled paths such as workers, maintenance jobs, scripts, and operational tooling.

## Aggregation inside transactions

Aggregate operations can participate in an active Ambiten transaction when they execute through compatible transaction-aware infrastructure.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.aggregate([
      {
        $match: {
          active: true
        }
      }
    ]);
  }
);
```

The transaction path is:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Aggregate Operation
```

This can be useful when an aggregate read needs to participate in the same MongoDB transaction as other operations in a workflow.

Long-running or computationally expensive aggregation should still be used carefully inside transactions because the transaction remains open for the duration of that work.

The pipeline must also remain compatible with MongoDB's transaction rules.

## Streaming aggregation

For large result sets or incremental processing, streaming can provide a more memory-conscious execution model.

```ts
const stream =
  await UserModel.streamAggregation([
    {
      $match: {
        active: true
      }
    }
  ]);

stream.on(
  "data",
  console.log
);
```

Streaming allows results to be processed incrementally instead of requiring the complete result set to be materialized before application processing begins.

This can be useful for reporting pipelines, workers, exports, and batch-oriented processing.

Streaming does not make an expensive pipeline inexpensive by itself.

Indexes, stage ordering, result cardinality, and MongoDB execution cost still matter.

## Cached aggregation

Aggregation can be a good candidate for caching when expensive analytical results are requested more frequently than the underlying data changes.

```ts
await UserModel.aggregateWithCache(
  pipeline,
  "cache:key",
  300
);
```

Caching can be useful for dashboards, repeated summaries, and reporting workloads.

In multi-tenant systems, cache identity must preserve the same tenant boundaries as the underlying data.

A cache key should therefore not allow results produced for one tenant to be reused for another tenant unless that sharing is explicitly intended.

Conceptually:

```text
Tenant Execution
      ↓
Aggregate Operation
      ↓
Tenant-Aware Cache Identity
      ↓
Cached Result
```

Caching changes result reuse behavior, not the underlying authorization or tenant-resolution model.

## Multi-tenant aggregation

When execution state contains tenant identity and tenant infrastructure has been configured, aggregate operations can participate in tenant-aware infrastructure resolution.

```text
AmbitenContext.tenantId
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.tenantId
      ↓
MultiTenantManager /
Tenant Provider
      ↓
Tenant MongoClient
      ↓
Tenant Database
      ↓
Model Collection
      ↓
Aggregation Pipeline
```

The model owns collection resolution.

Tenant infrastructure determines which database and client resources the operation uses.

This means application code does not need to manually discover the tenant MongoDB client before every aggregate operation.

It does **not** mean that `aggregate()` itself authenticates the caller, authorizes tenant access, or independently guarantees tenant isolation.

Those properties depend on the application's authentication, authorization, tenant-resolution strategy, storage topology, and infrastructure configuration.

## Pipeline design considerations

Aggregation pipelines should be treated as operational architecture, not only query syntax.

Useful principles include:

```text
apply selective filtering early
support frequent filters with indexes
use $lookup intentionally
avoid unnecessary transformations
reduce result shape where appropriate
measure expensive pipelines
watch result cardinality
```

A pipeline can be syntactically valid while still being operationally expensive.

The more central aggregation becomes to reporting or product behavior, the more important those decisions become.

## Common patterns

Group active users by role:

```ts
const results =
  await UserModel.aggregate([
    {
      $match: {
        active: true
      }
    },
    {
      $group: {
        _id: "$role",
        count: {
          $sum: 1
        }
      }
    }
  ]);
```

Inject a default persistence constraint through middleware:

```ts
userSchema.pre(
  "aggregate",
  async (ctx) => {
    ctx.pipeline.unshift({
      $match: {
        isDeleted: false
      }
    });
  }
);
```

Stream a large aggregate result:

```ts
const stream =
  await UserModel.streamAggregation([
    {
      $match: {
        active: true
      }
    }
  ]);

stream.on(
  "data",
  (row) => {
    console.log(row);
  }
);
```

Cache a repeated analytical result:

```ts
await UserModel.aggregateWithCache(
  [
    {
      $match: {
        active: true
      }
    },
    {
      $group: {
        _id: "$role",
        count: {
          $sum: 1
        }
      }
    }
  ],
  "users:active-by-role",
  300
);
```

For tenant-aware caching, the cache identity should also account for the tenant scope where results are tenant-specific.

## Best practices

Keep aggregation pipelines measurable and deliberate.

Prefer selective filtering, intentional projections, appropriate indexes, and middleware-based persistence policy where behavior should remain consistent across model operations.

Use streaming when incremental consumption is more appropriate than materializing a full result set.

Use caching when result reuse is justified by workload shape, and ensure tenant-specific cache entries remain correctly scoped.

Use transactions only when the aggregate actually needs to participate in a larger transactional unit of work.

Keep authentication, authorization, tenant access policy, and external system coordination outside the aggregate operation itself.

Most importantly, treat aggregation as a model operation participating in the runtime rather than as an escape hatch from it.

## Summary

Aggregate operations in Ambiten provide a runtime-aware model path for MongoDB pipeline execution.

They can participate in:

```text
AmbitenContext
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Tenant-Aware Infrastructure
      ↓
Transaction Session
      ↓
MongoDB Aggregation
```

Streaming and caching provide additional execution strategies for workloads that benefit from incremental processing or result reuse.

The aggregate operation itself does not establish every surrounding guarantee.

Instead, it participates in the context, model, middleware, provider, tenant infrastructure, transaction, and caching behavior configured around it.

That keeps advanced analytical reads aligned with the same execution model as the rest of the Ambiten runtime.

## Related pages

- [Read](/crud/read)
- [Create](/crud/create)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Instrumentation](/core/instrumentation)