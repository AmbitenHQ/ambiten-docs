# Delete

Delete operations remove documents or transition them into a deleted state through the Ambiten model layer.

In Ambiten, deletion is treated as a runtime lifecycle concern rather than a simple destructive action. Depending on system policy, a delete operation may permanently remove a record or convert it into a recoverable soft-deleted state while still participating in middleware, tenant-aware execution, and transaction boundaries.

Ambiten supports `deleteOne`, `deleteMany`, `findOneAndDelete`, soft delete workflows, explicit hard delete execution, and restore flows for recoverable records.

## The role of deletion in the runtime

A delete operation usually moves through the same runtime path as other model operations:

```PlainText
Request → Context → Middleware → Delete Policy → Persistence → Result
```

That matters because deletion often carries stronger operational consequences than reads or updates. Recoverability, auditing, and retention policy frequently become part of the execution boundary itself.

## Deleting a document

Use `deleteOne()` to remove a matching document:

```ts
await UserModel.deleteOne({
  email: "alice@example.com"
});
```

Depending on runtime policy, this may execute as either a soft delete or a permanent delete.

When the deleted record should also be returned, use `findOneAndDelete()`:

```ts
const deleted = await UserModel.findOneAndDelete({
  email: "alice@example.com"
});
```

This is useful when downstream logic depends on the removed record or when deletion doubles as a retrieval boundary.

## Typical execution flow

<DeleteOperationFlow />

Deletion is not isolated from the runtime. Middleware, context resolution, delete policy, and transaction participation can all shape the final operation before persistence occurs.

## Soft delete behavior

Soft delete is usually the safer default for production systems.

Instead of physically removing the document, the runtime transitions it into a deleted state:

```ts
{
  isDeleted: true,
  deletedAt: new Date()
}
```

Once marked:

- reads can exclude the document automatically
- restore operations remain possible
- audit history is preserved
- cleanup can happen later through retention workflows

This approach is generally better suited for SaaS systems, operational dashboards, and user-facing applications where accidental deletion should remain recoverable.

## Hard delete behavior

Hard delete permanently removes the record from persistence.

```ts
await UserModel.deleteOne(
  { email: "alice@example.com" },
  { hardDelete: true }
);
```

Because the operation is irreversible, hard delete should usually remain explicit and intentionally scoped.

Typical use cases include retention enforcement, purge workflows, or compliance-driven removal requirements.

## Restore flows

Soft delete enables restoration workflows:

```ts
await UserModel.restoreOne({
  _id: "..."
});
```

This allows deleted records to move back into an active state without requiring external recovery systems.

Restore flows are especially useful for operational rollback, support tooling, and delayed cleanup strategies.

## Runtime behavior

In a standard delete flow:

- middleware can validate or reshape the operation
- tenant and database scope resolve from context
- delete policy determines soft or hard deletion
- post hooks can observe the outcome
- the result returns in a normalized form

This keeps deletion behavior aligned with the same runtime model used throughout Ambiten.

## Middleware around delete operations

Delete middleware is often where lifecycle policy and operational safeguards are enforced.

Example:

```ts
userSchema.pre("deleteOne", async (ctx) => {
  console.log("Deleting:", ctx.filter);
});
```

Common uses include audit logging, delete validation, soft-delete transformation, and tenant-aware guardrails.

Because middleware executes inside the runtime boundary, delete behavior stays centralized instead of being duplicated across services and handlers.

## Transaction-aware deletion

Delete operations automatically participate in the active transaction scope:

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.deleteOne({
    email: "alice@example.com"
  });
});
```

Within that boundary, the operation reuses the active session from `AmbitenContext`, ensuring rollback remains consistent if the wider workflow fails.

This is especially important when deletion is part of a larger coordinated write process.

## Tenant-aware delete execution

Delete operations remain tenant-aware when executed inside an active runtime scope.

That means a call such as:

```ts
await UserModel.deleteOne({
  email: "alice@example.com"
});
```

can still resolve the correct tenant, database, session, and connection scope automatically.

This keeps destructive operations aligned with infrastructure boundaries without requiring manual routing logic inside application code.

## Deletion strategy

Deletion strategy is an architectural decision, not only an API choice.

Production systems usually benefit from:

- recoverable deletion by default
- explicit hard-delete paths
- observable delete behavior
- centralized lifecycle enforcement
- targeted and intentional filters

The more sensitive the data, the more important those decisions become.

## Common patterns

Delete a single document

```ts
await UserModel.deleteOne({
  email: "alice@example.com"
});
```

Delete and return the document

```ts
const deleted = await UserModel.findOneAndDelete({
  email: "alice@example.com"
});
```

Explicit hard delete

```ts
await UserModel.deleteOne(
  { email: "alice@example.com" },
  { hardDelete: true }
);
```

Restore a soft-deleted document

```ts
await UserModel.restoreOne({
  _id: "..."
});
```

Delete inside a transaction

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.deleteOne({
    email: "alice@example.com"
  });
});
```

## Best practices

Prefer soft delete when recoverability or auditability matters. Keep hard delete explicit and operationally visible. Audit destructive actions through middleware or instrumentation, and avoid broad delete filters in production workflows.

When deletion participates in a larger write sequence, use transactions so rollback behavior remains predictable.

## Summary

Delete operations in Ambiten are runtime-aware lifecycle boundaries rather than isolated removal calls.

By supporting both soft delete and hard delete execution, Ambiten allows systems to balance recoverability, operational safety, retention policy, and tenant-aware consistency without pushing those concerns into application logic.

## Related pages

- [Read](/crud/read)
- [Update](/crud/update)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Schema](/models/schema)
