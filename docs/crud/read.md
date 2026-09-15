# Read

Read operations retrieve documents through the Ambiten model layer.

Although reads often look like straightforward database lookups, they can still participate in the runtime. Queries can be shaped by middleware, inherit execution state, participate in tenant-aware infrastructure resolution, observe soft-delete controls, reuse active transaction sessions, and expose structured information to instrumentation where those capabilities are configured.

This keeps the API surface simple while allowing read behavior to remain aligned with the surrounding runtime.

## What read means in Ambiten

In Ambiten, a model read participates in the same execution model as other model operations.

```text
Application
      ↓
AmbitenModel Read Operation
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

The model can inherit execution state from `AmbitenContext`, merge it with explicit operation context and model defaults, and use the resulting Effective `ModelContext` throughout the operation.

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

This allows the same read API to participate in adapters, workers, scripts, transactions, and tenant-aware infrastructure without requiring every caller to manually coordinate database resources.

## Finding multiple documents

Use `find()` to retrieve multiple matching documents:

```ts
const users =
  await UserModel.find({});
```

This is the standard path for list-style queries, filtered datasets, dashboards, and application reads that expect multiple results.

More selective filters should be preferred when the application does not actually need the full collection.

## Finding a single document

Use `findOne()` when the query should resolve to one matching document:

```ts
const user =
  await UserModel.findOne({
    email: "alice@example.com"
  });
```

This pattern is useful for identifier lookups, unique-field queries, and workflows where only one matching result is required.

## Typical execution flow

<ReadOperationFlow />

Read behavior can be shaped before the query reaches MongoDB.

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Read Middleware
      ↓
Collection Resolution
      ↓
Provider Resolution
      ↓
MongoDB Query
      ↓
Post-Operation Behavior
```

The model owns the collection boundary.

The provider path resolves the database, MongoDB client, and active session needed by the operation.

## Runtime behavior

In a configured read flow:

- middleware can inspect or modify the filter
- execution state can contribute tenant, database, request, and session information
- soft-delete controls can affect which records are eligible for retrieval
- the model resolves its collection
- the provider resolves the MongoDB infrastructure used by the query
- post-operation behavior can observe or transform the result where configured

This keeps read behavior aligned with the same runtime model used by other Ambiten model operations.

## Returned results

A read result may look like:

```json
{
  "_id": "64f...",
  "name": "Alice"
}
```

The exact result shape depends on the document type, schema behavior, projection, query method, and any configured post-operation processing.

Ambiten should not be understood as forcing every read into one universal result shape.

Instead, the model runtime provides a consistent execution path around the query.

## Context-aware reads

Read operations can receive explicit persistence-facing context when a particular operation needs it:

```ts
await UserModel.find(
  {
    active: true
  },
  {
    tenantId: "tenant-a"
  }
);
```

The Effective `ModelContext` follows the normal precedence:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

Explicit operation context can be useful for:

```text
workers
maintenance jobs
scripts
administrative tooling
controlled infrastructure workflows
```

In adapter-managed application flows, explicit overrides usually do not need to be supplied when the required execution state has already been established through `AmbitenContext`.

## Middleware around reads

Read middleware can centralize persistence-level query behavior.

For example:

```ts
userSchema.pre(
  "find",
  async (ctx) => {
    ctx.filter = {
      ...(ctx.filter || {}),
      active: true
    };
  }
);
```

Middleware can be useful for concerns such as:

```text
default filters
soft-delete behavior
query normalization
persistence-level policy
instrumentation hooks
```

This keeps reusable query behavior close to the persistence boundary rather than duplicating it throughout application services and controllers.

Middleware should not be treated as a replacement for application authentication or authorization.

A query filter may contribute to data access policy, but authorization still depends on the surrounding security model.

## Soft-delete behavior

When soft-delete behavior is configured, read operations can exclude deleted records by default.

For example:

```ts
await UserModel.find({});
```

may return only active records when the model's lifecycle policy applies an appropriate deleted-state filter.

The operation context also supports explicit lifecycle controls.

Include deleted records:

```ts
await UserModel.find(
  {},
  {
    withDeleted: true
  }
);
```

Return only deleted records:

```ts
await UserModel.find(
  {},
  {
    onlyDeleted: true
  }
);
```

Conceptually:

```text
ModelContext
      ↓
withDeleted /
onlyDeleted
      ↓
Read Lifecycle Behavior
      ↓
MongoDB Query
```

These controls keep lifecycle behavior centralized without requiring every application query to manually reconstruct the same deleted-state filter.

The exact behavior still depends on the model and schema soft-delete configuration.

## Transaction-aware reads

Read operations can participate in an active Ambiten transaction when they execute through compatible transaction-aware infrastructure.

```ts
await AmbitenContext.withTransaction(
  async () => {
    const user =
      await UserModel.findOne({
        email:
          "alice@example.com"
      });

    // other participating operations
  }
);
```

The session path is:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Read Operation
```

This can be useful when a read must observe the same transactional state as other MongoDB operations in the surrounding workflow.

The transaction boundary owns session lifecycle, commit, and rollback.

The read operation participates in that boundary; it does not create or complete the transaction itself.

## Multi-tenant query behavior

When execution state contains tenant identity and tenant infrastructure has been configured, reads can participate in tenant-aware infrastructure resolution.

```ts
await UserModel.find({
  active: true
});
```

Conceptually:

```text
AmbitenContext.tenantId
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.tenantId
      ↓
Tenant Infrastructure
      ↓
Tenant MongoClient / Database
      ↓
Model Collection
      ↓
Read Operation
```

The application does not need to manually resolve and pass the tenant MongoDB client into every model query.

The model still owns collection resolution.

Tenant infrastructure determines which client and database resources are used for the execution.

This does **not** mean that `find()` or `findOne()` authenticates the caller, authorizes tenant access, or independently guarantees tenant isolation.

Those properties depend on the application's authentication, authorization, tenant-resolution strategy, storage topology, and infrastructure configuration.

## Shared-collection tenant filtering

Some multi-tenant architectures separate tenants by database.

Others may store multiple tenants in a shared collection.

When a shared-collection topology is used, tenant discrimination may also need to be represented in query filters or persistence middleware.

For example:

```text
Shared Database
      ↓
Shared Collection
      ↓
Tenant Filter
      ↓
Read Result
```

That is a different isolation strategy from:

```text
Tenant Identity
      ↓
Tenant Database
      ↓
Model Collection
```

Ambiten's runtime can carry tenant identity through both approaches, but the application architecture determines where the actual data separation is enforced.

## Query design considerations

Ambiten coordinates runtime behavior, but MongoDB query performance still depends on sound query design.

Useful principles include:

```text
use selective filters
index frequently queried fields
avoid unnecessary collection scans
limit result shape where appropriate
observe query cost
keep middleware measurable
```

Broad reads can become expensive even when the runtime itself is functioning correctly.

Lifecycle filters such as soft-delete predicates should also be considered when designing indexes because they may become part of frequently executed query shapes.

For analytical or transformation-heavy workloads, aggregation may be more appropriate than forcing increasingly complex behavior into ordinary reads.

## Common read patterns

Simple list query:

```ts
const users =
  await UserModel.find({});
```

Single-record lookup:

```ts
const user =
  await UserModel.findOne({
    email:
      "alice@example.com"
  });
```

Execution established explicitly:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "read-001"
  },
  async () => {
    return UserModel.find({
      active: true
    });
  }
);
```

Include soft-deleted records:

```ts
await UserModel.find(
  {},
  {
    withDeleted: true
  }
);
```

Only soft-deleted records:

```ts
await UserModel.find(
  {},
  {
    onlyDeleted: true
  }
);
```

Read inside a transaction:

```ts
await AmbitenContext.withTransaction(
  async () => {
    return UserModel.findOne({
      email:
        "alice@example.com"
    });
  }
);
```

## Performance guidance

Read performance begins with MongoDB query discipline.

Prefer meaningful filters over broad collection reads.

Index fields that participate frequently in lookups, sorting, and lifecycle filtering.

Use projection when callers only need part of the document.

Keep middleware measurable so implicit query shaping does not make query cost difficult to understand.

Monitor query behavior as tenant infrastructure, soft-delete rules, and runtime policies become more sophisticated.

The runtime can make execution consistent.

It does not make an inefficient MongoDB query efficient by itself.

## Mental model

```text
Context carries execution.

Model binds execution
to the read operation.

ModelContext carries
persistence state.

Middleware can shape
query behavior.

Infrastructure resolves
database resources.

MongoDB executes
the query.
```

## Best practices

Keep read filters selective and intentional.

Use schema middleware for persistence-oriented query behavior that should remain consistent across model operations.

Keep authentication and authorization outside read middleware unless an application deliberately models part of its access policy at the persistence boundary.

Use `withDeleted` and `onlyDeleted` only when the workflow intentionally needs deleted-state visibility.

Prefer context-driven execution when tenant, request, or transaction state has already been established.

Use explicit `ModelContext` values for controlled operations that intentionally need different persistence-facing state.

Treat tenant-aware execution and tenant isolation as related but distinct concerns.

Measure query performance independently from runtime correctness.

## Summary

Read operations in Ambiten are runtime-aware model queries.

They can participate in:

```text
AmbitenContext
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Lifecycle Controls
      ↓
Tenant-Aware Infrastructure
      ↓
Transaction Session
      ↓
MongoDB
```

The read operation itself does not establish every surrounding guarantee.

Instead, it participates in the execution context, model behavior, middleware, lifecycle policy, provider infrastructure, tenant configuration, and transaction state established around it.

This keeps ordinary reads simple while allowing them to remain consistent with the larger Ambiten runtime model.

## Related pages

- [Create](/crud/create)
- [Aggregate](/crud/aggregate)
- [Middleware](/core/middleware)
- [Context](/core/context)
- [Schema](/models/schema)