# Create

Create operations insert new documents through the Tenra model layer.

At the surface, creation looks like a simple model call. Inside the runtime, it can still participate in schema validation, middleware execution, tenant-aware infrastructure resolution, transaction session propagation, instrumentation, and result normalization.

That makes create operations more than raw insert calls. They are runtime-aware write boundaries.

## What create means in Tenra

A create operation enters the same execution model as every other Tenra operation.

The model receives the document, the schema can validate and shape it, middleware can apply write policies, the provider resolves the active database scope, and MongoDB performs the insert using the correct runtime context.

If a transaction is active, the create operation automatically participates in the same session as the rest of the workflow.

This means creation remains simple in application code while still respecting the operational rules of the system.

## Basic creation

The simplest form inserts a single document through the model:

```ts
await UserModel.create({
  name: "Alice",
  email: "alice@example.com"
});
```

In a normal runtime flow, Tenra can validate the document, run create middleware, resolve tenant and database scope, insert the document, run post-create behavior, and return the persisted result.

The important point is that the application code does not need to coordinate each of those steps manually.

## Typical execution flow

<CreateOperationFlow />

The model operation is not isolated from the runtime. It participates in the same context-aware execution boundary used by adapters, transactions, middleware, and instrumentation.

## Returned result

A typical result may look like this:

```json
{
  "_id": "64f...",
  "name": "Alice",
  "email": "alice@example.com"
}
```

This kind of override is useful for controlled execution paths such as background processing, scripted data creation, tenant-specific maintenance jobs, or operational tooling.

In request-driven application code, explicit runtime options should not be the default. Most application flows should rely on context established by adapters or `TenraContext`.

## Context-aware creation

Create operations can run against an explicit runtime scope when needed:

```ts
await UserModel.create(
  { name: "Alice" },
  { tenantId: "tenant-a" }
);
```

This kind of override is useful for controlled execution paths such as background processing, scripted data creation, tenant-specific maintenance jobs, or operational tooling.

In request-driven application code, explicit runtime options should not be the default. Most application flows should rely on context established by adapters or `TenraContext`.

## Transaction-aware creation

Create operations automatically participate in the active transaction when one exists.

```ts
import { TenraContext } from "@tenra/core";

await TenraContext.withTransaction(async () => {
  await UserModel.create({ name: "Alice" });
});
```

Inside that transaction boundary, the active session is resolved from `TenraContext` and reused by the create operation. If another operation in the same workflow fails, rollback behavior remains consistent across the entire unit of work.

This matters because creation is often part of a larger workflow, not an isolated write.

## Bulk insertion

When multiple documents should be inserted under one controlled execution boundary, bulk insertion provides a more efficient write path.

```ts
await UserModel.bulkInsert([
  { name: "Alice" },
  { name: "Bob" }
]);
```

Bulk insertion is appropriate for seeding data, imports, migrations, worker batches, and high-volume write paths where batch semantics are clearer than repeatedly calling single-document creation.

As with single-document creation, batch writes should still be designed with validation, middleware behavior, tenant scope, and transaction boundaries in mind.

## Middleware around creation

Create operations are a natural place for middleware because writes often require normalization, timestamps, audit enrichment, or policy enforcement.

```ts
userSchema.pre("create", async (ctx) => {
  if (ctx.doc) {
    ctx.doc.createdAt = new Date();
  }
});
```

Post middleware can observe the created result:

```ts
userSchema.post("create", async (ctx) => {
  console.log("Created user:", ctx.result);
});
```

This keeps cross-cutting write behavior close to the persistence boundary instead of duplicating it across services and controllers.

## Validation behavior

Create operations should rely on schema validation wherever possible.

Validation belongs close to the data contract because it needs to behave consistently across adapters, services, workers, and scripts.

When validation rules become more realistic, asynchronous validation can also be used to support external checks or runtime-dependent constraints without moving validation logic into every application service.

## Multi-tenant creation

When the active runtime scope includes tenant identity, create operations become tenant-aware automatically.

```ts
await UserModel.create({ name: "Alice" });
```

A single model call can resolve the active tenant, the correct database, the correct provider scope, and the active transaction session without exposing those details to the caller.

This is one of the core ways Tenra reduces infrastructure plumbing in multi-tenant systems.

## Common write patterns

Simple creation remains the default pattern:

```ts
await UserModel.create({
  name: "Alice",
  email: "alice@example.com"
});
```

Creation inside a transaction is used when the write belongs to a larger all-or-nothing workflow:

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.create({ name: "Alice" });
  await AuditLogModel.create({ action: "USER_CREATED" });
});
```

Batch creation should be used when multiple records belong to the same controlled write path:

```ts
await UserModel.bulkInsert([
  { name: "Alice" },
  { name: "Bob" }
]);
```

Explicit runtime scope is useful outside request-managed execution:

```ts
await TenraContext.run(
  {
    tenantId: "tenant-a",
    requestId: "seed-001"
  },
  async () => {
    await UserModel.create({ name: "Alice" });
  }
);
```

## Best practices

Keep validation in the schema layer so document rules remain centralized and reusable.

Use middleware for timestamps, auditing, normalization, and cross-cutting write policies.

Use transactions when creation belongs to a larger consistency-sensitive workflow.

Prefer context-driven execution over manually passing tenant or session state, unless the operation is intentionally overriding the runtime boundary.

Use bulk insertion for controlled high-volume write paths instead of looping over single-document creates when batch semantics are more appropriate.

## Summary

Create operations in Tenra are runtime-aware writes.

They participate in the same context, middleware, validation, tenant resolution, and transaction model as the rest of the system.

That makes inserts consistent execution boundaries that can scale from simple application writes to tenant-aware, transaction-safe production workflows.

## Related pages

- [Read](/crud/read)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Schema](/models/schema)
- [Context](/core/context)
