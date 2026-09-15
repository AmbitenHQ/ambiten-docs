# Create

Create operations insert new documents through the Ambiten model layer.

At the surface, creation looks like a simple model call. Inside the runtime, it can also participate in schema validation, middleware execution, tenant-aware infrastructure resolution, transaction session propagation, and instrumentation where those capabilities are configured.

That makes create operations more than raw insert calls. They are runtime-aware model operations.

## What create means in Ambiten

A create operation participates in the same execution model as other Ambiten model operations.

The model receives the document, resolves an Effective `ModelContext`, applies configured schema and middleware behavior, resolves the required persistence infrastructure through the provider path, and performs the MongoDB insert.

Conceptually:

```text
Application
      ↓
AmbitenModel.create()
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

If a transaction is active, participating create operations can inherit the active MongoDB session through the Effective `ModelContext`.

This keeps creation simple in application code while allowing it to participate in the operational rules established by the surrounding runtime.

## Basic creation

The simplest form inserts a single document through the model:

```ts
await UserModel.create({
  name: "Alice",
  email: "alice@example.com"
});
```

In a configured runtime flow, Ambiten can validate the document, run create middleware, resolve the effective database scope, perform the insert, run post-create behavior, and return the persisted result.

The application does not need to coordinate each of those steps manually.

## Typical execution flow

<CreateOperationFlow />

The model operation does not execute independently from the runtime.

It can inherit execution state established by an adapter or `AmbitenContext`, which `AmbitenModel` then binds into the Effective `ModelContext` used for the operation.

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Create Operation
```

## Returned result

A typical result may look like:

```json
{
  "_id": "64f...",
  "name": "Alice",
  "email": "alice@example.com"
}
```

The exact result shape depends on the model operation, schema behavior, and document type being used.

## Explicit operation context

Create operations can also receive an explicit `ModelContext` when a particular operation needs to override or supply persistence-facing state:

```ts
await UserModel.create(
  { name: "Alice" },
  { tenantId: "tenant-a" }
);
```

The effective context follows the normal precedence:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

Explicit operation context is useful for controlled execution paths such as background processing, scripted data creation, tenant-specific maintenance work, or operational tooling.

In adapter-managed application flows, explicit overrides usually do not need to be supplied when the required execution state has already been established through `AmbitenContext`.

## Transaction-aware creation

Create operations can participate in an active Ambiten transaction.

```ts
import {
  AmbitenContext
} from "@ambiten/core";

await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create({
      name: "Alice"
    });
  }
);
```

Inside the transaction boundary, the active session is carried through `AmbitenContext` and projected into the Effective `ModelContext` used by participating model operations.

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Create Operation
```

If a participating operation throws and the enclosing transaction boundary aborts, MongoDB writes participating in that transaction can be rolled back together.

The transaction boundary, not the individual model, owns commit and rollback behavior.

## Bulk insertion

When multiple documents belong to the same batch-oriented write path, bulk insertion can avoid repeatedly invoking single-document creation from application code.

```ts
await UserModel.bulkInsert([
  { name: "Alice" },
  { name: "Bob" }
]);
```

Bulk insertion can be useful for:

```text
data seeding
imports
migrations
worker batches
batch-oriented writes
```

As with single-document creation, batch operations should still be designed with schema behavior, middleware semantics, tenant scope, and transaction boundaries in mind.

Bulk operations should not be assumed to have identical middleware or validation semantics to repeated single-document `create()` calls unless that behavior is explicitly documented by the model API.

## Middleware around creation

Create operations are a natural place for middleware because writes often require normalization, timestamps, metadata enrichment, or persistence policy.

```ts
userSchema.pre(
  "create",
  async (ctx) => {
    if (ctx.doc) {
      ctx.doc.createdAt =
        new Date();
    }
  }
);
```

Post middleware can observe the created result:

```ts
userSchema.post(
  "create",
  async (ctx) => {
    console.log(
      "Created user:",
      ctx.result
    );
  }
);
```

This keeps persistence-oriented cross-cutting behavior close to the model boundary instead of duplicating it across application services and controllers.

## Validation behavior

Create operations should use schema validation for document-level rules that belong to the persistence contract.

Keeping those rules near the schema helps them behave consistently across different execution paths such as adapters, workers, scripts, and application services.

Where supported by the configured schema behavior, asynchronous validation can also be used for checks that cannot be completed synchronously.

Application authorization and broader business policy should remain outside schema validation unless they intentionally belong to the persistence boundary.

## Multi-tenant creation

When the active execution contains tenant identity and tenant infrastructure has been configured, create operations can participate in tenant-aware database resolution.

```ts
await UserModel.create({
  name: "Alice"
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
Create Operation
```

The model call does not need to manually carry tenant infrastructure details such as database clients or connection configuration.

This does **not** mean that `create()` itself authenticates the caller, authorizes tenant access, or independently guarantees tenant isolation.

Those concerns remain dependent on the application's authentication, authorization, tenant resolution, and infrastructure configuration.

## Common write patterns

Simple creation remains the default pattern:

```ts
await UserModel.create({
  name: "Alice",
  email: "alice@example.com"
});
```

Creation inside a transaction is appropriate when the write belongs to a larger consistency-sensitive MongoDB workflow:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create({
      name: "Alice"
    });

    await AuditLogModel.create({
      action: "USER_CREATED"
    });
  }
);
```

Both writes can participate in the same active MongoDB transaction when they execute through compatible transaction-aware infrastructure.

Batch creation is useful when multiple records belong to one batch-oriented write path:

```ts
await UserModel.bulkInsert([
  { name: "Alice" },
  { name: "Bob" }
]);
```

Non-adapter execution can establish its own execution context explicitly:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "seed-001"
  },
  async () => {
    await UserModel.create({
      name: "Alice"
    });
  }
);
```

This pattern is useful for workers, scripts, scheduled tasks, maintenance processes, and other execution paths that do not enter through a framework adapter.

## Best practices

Keep document validation close to the schema so persistence rules remain centralized and reusable.

Use middleware for behavior that belongs near the persistence boundary, such as timestamps, normalization, metadata enrichment, and cross-cutting write policy.

Use transactions when multiple participating MongoDB operations need to succeed or fail as one unit of work.

Prefer context-driven execution when execution state has already been established, and use explicit `ModelContext` values when an individual operation intentionally needs different persistence-facing state.

Use bulk insertion for batch-oriented workloads when its validation and middleware semantics match the requirements of the workflow.

Keep authentication, authorization, external side effects, and broader business policy outside the create operation unless they intentionally belong to the persistence layer.

## Summary

Create operations in Ambiten are runtime-aware model writes.

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
MongoDB
```

The create operation itself does not establish all of those guarantees.

Instead, it participates in the execution boundary, context, provider infrastructure, schema behavior, and transaction state that have been configured around it.

That allows the same `create()` API to work across straightforward application writes, tenant-aware execution, background work, and transaction-aware workflows without requiring infrastructure state to be manually propagated through application code.

## Related pages

- [Read](/crud/read)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Schema](/models/schema)
- [Context](/core/context)