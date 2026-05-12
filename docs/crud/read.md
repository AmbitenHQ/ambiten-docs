# Read

Read operations retrieve documents through the Tenra model layer.

Although reads are often treated as straightforward database lookups, they still participate in the runtime. Queries can be shaped by middleware, scoped by tenant and database context, filtered by lifecycle policies such as soft delete, instrumented for observability, and normalized before results reach application code.

This allows reads to remain simple at the API surface while still behaving consistently across environments and execution boundaries.

## What read means in Tenra

In Tenra, a read operation is part of the runtime execution flow rather than a direct driver call.

A query may pass through middleware, inherit tenant scope from `TenraContext`, resolve the correct database and collection, execute under transaction-aware conditions, and return results in a normalized form.

This keeps query behavior predictable across services, adapters, workers, and request lifecycles.

## Finding multiple documents

Use `find()` to retrieve multiple matching documents:

```ts
const users = await UserModel.find({});
```

This is the standard path for list-style queries, filtered datasets, dashboards, and general application reads that expect multiple results.

## Finding a single document

Use `findOne()` when the query should resolve to one record:

```ts
const user = await UserModel.findOne({
  email: "alice@example.com"
});
```

This pattern is typically used for identifier lookups, unique-field queries, and workflows where only one result is expected.

## Typical execution flow

<ReadOperationFlow />

Read behavior is often shaped by runtime rules before the query reaches MongoDB. Middleware, tenant scope, instrumentation, and lifecycle policies can all influence execution.

## Runtime behavior

In a standard read flow, middleware may modify the filter before execution, the active tenant and database are resolved from context, the query executes against the correct persistence boundary, and post-query hooks can observe or normalize the returned result.

This allows reads to participate in system-wide query policies without scattering filtering logic across controllers, services, or resolvers.

## Normalized results

Results can be normalized before they are returned to application code.

For example:

```json
{
  "_id": "64f...",
  "name": "Alice"
}
```

The exact structure depends on the schema and model configuration, but the goal is to keep result handling consistent and predictable across the application.

## Context-aware reads

Read operations can execute against an explicit runtime scope when necessary:

```ts
await UserModel.find(
  { active: true },
  { tenantId: "tenant-a" }
);
```

This is useful for operational tooling, workers, scripts, or controlled maintenance flows.

In normal request-driven applications, explicit runtime overrides should be rare. Most reads should inherit scope from adapters or `TenraContext`.

## Middleware around reads

Read middleware is commonly used to enforce centralized query policies.

Example:

```ts
userSchema.pre("find", async (ctx) => {
  ctx.filter = {
    ...(ctx.filter || {}),
    active: true
  };
});
```

Because middleware executes inside the runtime boundary, query shaping, lifecycle rules, observability behavior, and access policies can remain centralized instead of being repeated throughout the application.

## Soft delete behavior

Read operations are one of the primary places where soft-delete policy is enforced.

A standard query such as:

```ts
await UserModel.find({});
```

may automatically exclude deleted records through middleware or runtime policy.

Different retrieval behavior can still be requested explicitly.

Include deleted records:

```ts
await UserModel.find({}, { withDeleted: true });
```

Return only deleted records:

```ts
await UserModel.find({}, { onlyDeleted: true });
```

This keeps lifecycle behavior consistent without forcing every query path to remember the same filtering rules manually.

## Multi-tenant query behavior

Read operations become tenant-aware automatically when execution occurs inside a runtime scope containing tenant identity.

```ts
await UserModel.find({ active: true });
```

A single query can still resolve the active tenant, database, collection scope, and request metadata without exposing those infrastructure concerns to the caller.

This is especially important in multi-tenant systems where query safety should not rely entirely on developer discipline.

## Query design considerations

Tenra improves runtime consistency, but query performance still depends on good MongoDB design.

Reads should remain selective and measurable. Frequently queried fields should be indexed, broad collection scans should be avoided in high-traffic paths, and projection should limit unnecessary payload size.

Middleware and lifecycle policies should also remain observable so query cost stays predictable as systems scale.

For analytical or transformation-heavy workloads, aggregation is often more appropriate than overloading standard reads.

## Common read patterns

Simple list query:

```ts
const users = await UserModel.find({});
```

Single-record lookup:

```ts
const user = await UserModel.findOne({
  email: "alice@example.com"
});
```

Context-bound execution:

```ts
await TenraContext.run(
  {
    tenantId: "tenant-a",
    requestId: "read-001"
  },
  async () => {
    return UserModel.find({ active: true });
  }
);
```

Soft-delete override:

```ts
await UserModel.find({}, { withDeleted: true });
```

## Performance guidance

Read performance should always begin with instrumentation and query discipline.

Use meaningful filters instead of broad collection reads. Index fields that participate in lookups and lifecycle policies. Keep middleware measurable. Avoid unnecessary payloads. Monitor query cost when tenant resolution, soft-delete enforcement, or middleware participate in the execution path.

The runtime provides consistency, but operational efficiency still depends on deliberate query design.

## Mental model

```sh
Context defines scope.
Middleware shapes behavior.
Model executes the query.
MongoDB returns the result.
```

## Summary

Read operations in Tenra are runtime-aware queries.

They can be shaped by middleware, scoped by tenant and database context, aligned to lifecycle policies such as soft delete, and normalized before results reach application code.

This allows reads to remain predictable, policy-aware, and operationally consistent as systems grow in scale and complexity.

## Related pages

- [Create](/crud/create)
- [Aggregate](/crud/aggregate)
- [Middleware](/core/middleware)
- [Context](/core/context)
- [Schema](/models/schema)
