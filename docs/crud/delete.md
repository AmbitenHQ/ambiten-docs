# Delete

Delete operations remove documents or transition them into a deleted state through the Ambiten model layer.

Depending on the configured persistence behavior, a delete operation can permanently remove a document or mark it as deleted for later recovery while still participating in model middleware, tenant-aware infrastructure resolution, and transaction session propagation.

Ambiten supports `deleteOne`, `deleteMany`, `findOneAndDelete`, soft-delete workflows, explicit hard-delete execution, and restore flows where soft-delete behavior is configured.

## The role of deletion in the runtime

A delete operation participates in the same model execution path as other Ambiten operations.

```text
Application
      ↓
AmbitenModel Delete Operation
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Delete Behavior
      ↓
Collection Resolution
      ↓
DbProvider / AmbitenClient
      ↓
MongoDB
```

Deletion often carries stronger operational consequences than ordinary reads or updates.

Recoverability, retention policy, auditing, authorization, and lifecycle rules therefore need to be designed deliberately around the operation.

The delete method participates in those surrounding policies; it does not establish all of them by itself.

## Deleting a document

Use `deleteOne()` to act on a single matching document:

```ts
await UserModel.deleteOne({
  email: "alice@example.com"
});
```

The resulting behavior depends on the model and schema configuration.

Where soft-delete behavior is enabled, the operation can transition the document into a deleted state.

Where hard deletion is explicitly requested or configured, MongoDB removes the matching document from persistence.

When the matching document should also be returned, use `findOneAndDelete()`:

```ts
const deleted =
  await UserModel.findOneAndDelete({
    email: "alice@example.com"
  });
```

This can be useful when application logic needs the affected document as part of the delete workflow.

## Typical execution flow

<DeleteOperationFlow />

Deletion is not isolated from the runtime.

It can inherit execution state from `AmbitenContext`, which `AmbitenModel` then binds into the Effective `ModelContext` used by middleware, delete behavior, and persistence infrastructure.

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Delete Operation
```

## Soft-delete behavior

When soft-delete behavior is configured, deletion can mark a document instead of physically removing it.

A deleted document may be represented with fields such as:

```ts
{
  isDeleted: true,
  deletedAt: new Date()
}
```

The exact field names and behavior depend on the schema and model configuration.

Soft deletion can support workflows such as:

```text
recoverable deletion
filtered reads
delayed cleanup
support tooling
retention workflows
```

Where the model's soft-delete behavior is active, ordinary reads can be configured to exclude deleted documents while specialized operations can include or target them explicitly.

The operation context can also carry controls such as:

```text
withDeleted
onlyDeleted
hardDelete
```

These allow model operations to distinguish between ordinary active records, deleted records, and explicit permanent deletion paths.

Soft deletion preserves the document itself.

It should not be described as preserving a complete audit history unless an audit mechanism separately records those lifecycle events.

## Hard-delete behavior

Hard delete permanently removes a matching document from MongoDB.

```ts
await UserModel.deleteOne(
  {
    email: "alice@example.com"
  },
  {
    hardDelete: true
  }
);
```

`hardDelete` is an operation-level persistence control carried through the Effective `ModelContext`.

Conceptually:

```text
explicit ModelContext
      ↓
hardDelete: true
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Delete Operation
```

Because permanent deletion is destructive, hard-delete paths should normally remain deliberate and narrowly scoped.

Typical uses include:

```text
retention enforcement
purge workflows
administrative cleanup
compliance-driven removal
```

Whether permanent deletion is legally or operationally appropriate remains an application and policy decision.

## Restore flows

Where soft-delete behavior is configured, deleted documents can be restored:

```ts
await UserModel.restoreOne({
  _id: "..."
});
```

A restore operation transitions the record back into the model's active state according to the configured soft-delete behavior.

This can be useful for:

```text
support tooling
administrative recovery
delayed cleanup strategies
user-facing recovery
```

Restore is a model lifecycle operation.

It should not be treated as a substitute for backups, disaster recovery, or external archival systems.

## Runtime behavior

A configured delete flow can look like:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Delete Middleware
      ↓
Soft / Hard Delete Behavior
      ↓
Collection Resolution
      ↓
Provider Resolution
      ↓
MongoDB
      ↓
Post-Operation Behavior
```

The model owns collection resolution.

The provider path resolves the MongoDB database, client, and active session required by the operation.

Tenant identity and transaction state can be inherited through the Effective `ModelContext`.

## Middleware around delete operations

Delete middleware can be useful for persistence-level lifecycle policy and operational checks.

```ts
userSchema.pre(
  "deleteOne",
  async (ctx) => {
    console.log(
      "Deleting:",
      ctx.filter
    );
  }
);
```

Possible uses include:

```text
metadata enrichment
lifecycle validation
delete instrumentation
soft-delete policy
persistence-level safeguards
```

Middleware is most appropriate for concerns that belong close to the persistence boundary.

Authentication, authorization, legal policy, and broader business approval workflows should remain explicit application concerns unless they are intentionally modeled as persistence policy.

## Transaction-aware deletion

Delete operations can participate in an active Ambiten transaction when they execute through compatible transaction-aware infrastructure.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.deleteOne({
      email: "alice@example.com"
    });
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
Delete Operation
```

The transaction boundary owns:

```text
start
commit
rollback
completion
```

If a participating MongoDB operation fails and the enclosing transaction aborts, participating MongoDB writes can be rolled back together.

This does not make unrelated external side effects transactional.

For example:

```text
email delivery
object storage
external APIs
message queues
filesystem operations
```

are not automatically rolled back by the MongoDB transaction.

## Tenant-aware delete execution

When execution state contains tenant identity and tenant infrastructure has been configured, delete operations can participate in tenant-aware persistence resolution.

```ts
await UserModel.deleteOne({
  email: "alice@example.com"
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
Delete Operation
```

The caller does not need to manually discover or forward the tenant MongoDB client for each model operation.

The delete operation itself does **not** authenticate the caller, authorize access to the tenant, or independently guarantee tenant isolation.

Those properties depend on the surrounding authentication, authorization, tenant-resolution strategy, storage topology, and infrastructure configuration.

## Delete many

When multiple matching documents should be affected in one operation, use `deleteMany()`:

```ts
await UserModel.deleteMany({
  status: "expired"
});
```

Broad delete operations deserve additional care because an overly permissive filter can affect many records at once.

Before using `deleteMany()` in production workflows, make sure the filter is intentional and that any tenant, lifecycle, or retention constraints are represented by the surrounding runtime and persistence policy.

## Explicit operation context

Delete operations can also receive an explicit `ModelContext` when a controlled operation needs to override or supply persistence-facing state.

```ts
await UserModel.deleteOne(
  {
    email: "alice@example.com"
  },
  {
    tenantId: "tenant-a",
    hardDelete: true
  }
);
```

The normal precedence remains:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

Explicit operation state is useful for maintenance tools, workers, migrations, administrative jobs, and other controlled execution paths.

In adapter-managed application flows, context established by the runtime should usually be preferred unless an operation intentionally needs different persistence-facing state.

## Deletion strategy

Deletion strategy is an architectural decision, not only an API choice.

Production systems should consider:

```text
recoverability requirements
retention policy
hard-delete authorization
audit requirements
backup strategy
tenant boundaries
transaction requirements
broad-filter safeguards
external side effects
```

Soft delete is useful when recovery or delayed cleanup is required.

Hard delete is appropriate when permanent removal is intentional and permitted.

Neither strategy should be treated as universally correct for every application.

## Common patterns

Delete a single document:

```ts
await UserModel.deleteOne({
  email: "alice@example.com"
});
```

Delete and return the affected document:

```ts
const deleted =
  await UserModel.findOneAndDelete({
    email: "alice@example.com"
  });
```

Explicit hard delete:

```ts
await UserModel.deleteOne(
  {
    email: "alice@example.com"
  },
  {
    hardDelete: true
  }
);
```

Restore a soft-deleted document:

```ts
await UserModel.restoreOne({
  _id: "..."
});
```

Delete inside a transaction:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.deleteOne({
      email: "alice@example.com"
    });

    await AuditLogModel.create({
      action: "USER_DELETED"
    });
  }
);
```

Both MongoDB operations can participate in the same active transaction when they execute through compatible transaction-aware infrastructure.

## Best practices

Prefer soft deletion when application requirements call for recoverability or delayed cleanup, rather than treating it as a universal default.

Keep permanent deletion explicit where destructive behavior needs stronger control.

Use narrowly targeted filters for destructive operations, especially with `deleteMany()`.

Keep lifecycle behavior that belongs to persistence close to the schema and model layer.

Keep authentication, authorization, retention approval, and compliance policy explicit at the application or system boundary.

Use transactions when multiple participating MongoDB operations must succeed or fail as one unit of work.

Use instrumentation or dedicated audit records when deletion events need to be traceable over time.

Do not assume that preserving a soft-deleted document is equivalent to maintaining a complete audit trail.

## Summary

Delete operations in Ambiten are runtime-aware model lifecycle operations.

They can participate in:

```text
AmbitenContext
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Soft / Hard Delete Behavior
      ↓
Tenant-Aware Infrastructure
      ↓
Transaction Session
      ↓
MongoDB
```

Soft deletion, hard deletion, restoration, middleware, tenant-aware execution, and transaction participation are coordinated through the surrounding model and runtime configuration.

The delete operation itself does not establish authentication, authorization, retention policy, audit history, or tenant isolation.

Instead, it participates in those system boundaries while keeping persistence behavior centralized within the Ambiten model layer.

## Related pages

- [Read](/crud/read)
- [Update](/crud/update)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Schema](/models/schema)