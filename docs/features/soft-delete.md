# # Soft Delete

Soft delete in Tenra is not simply a boolean field attached to a document.

It is a runtime-level lifecycle policy that changes how deletion behaves across reads, writes, aggregates, middleware, and recovery workflows.

Instead of physically removing records immediately, Tenra allows documents to transition into a deleted state while remaining excluded from normal application behavior by default.

<SoftDeleteOverview />

## Why soft delete exists

Hard deletion is irreversible once committed.

```ts
await UserModel.deleteOne({ _id: id });
```

In production systems, this creates operational risk. Recovery depends entirely on backups, audit history becomes fragmented, and accidental deletion becomes much harder to correct safely.

Soft delete introduces a safer lifecycle model. Documents can disappear from normal queries without being permanently destroyed immediately. That allows recovery workflows, delayed retention policies, operational audits, and reversible user actions to remain possible without complicating application logic.

In most SaaS and enterprise systems, this becomes the safer default behavior.

## The Tenra approach

Tenra does not implement soft delete through repeated query conditions scattered across services or controllers.

Instead, deletion behavior is enforced through the runtime itself using schema behavior, middleware execution, and context-aware model operations.

That means the lifecycle policy remains consistent everywhere:

- reads exclude deleted documents automatically
- delete operations become state transitions
- aggregates remain protected from deleted records
- restoration remains possible
- hard deletion stays explicit

The application API remains simple while the runtime enforces the lifecycle contract underneath.

## Core model

A soft-deleted document is marked rather than removed.

```ts
{
  isDeleted: true,
  deletedAt: new Date()
}
```

Once the document enters this state, normal queries no longer return it unless execution explicitly opts into deleted visibility.

This turns deletion into a controlled lifecycle transition rather than an immediate destructive operation.

## Basic setup

A schema typically defines deletion lifecycle fields directly:

```ts
const userSchema = new TenraSchema({
  name: String,
  email: String,
  isDeleted: Boolean,
  deletedAt: Date
});
```

Middleware then enforces visibility rules automatically:

```ts
userSchema.pre("find", async (ctx) => {
  if (ctx.options?.withDeleted) return;

  ctx.filter = {
    ...(ctx.filter || {}),
    isDeleted: { $ne: true }
  };
});
```

With this in place:

```ts
await UserModel.find({});
```

automatically excludes deleted documents without requiring additional filtering logic in application code.

## Converting delete into a lifecycle transition

Soft delete becomes most useful when delete operations stop behaving destructively.

```ts
userSchema.pre("deleteOne", async (ctx) => {
  if (ctx.options?.hardDelete) return;

  ctx.operation = "updateOne";

  ctx.update = {
    $set: {
      isDeleted: true,
      deletedAt: new Date()
    }
  };
});
```

From the application perspective:

```ts
await UserModel.deleteOne({ _id: userId });
```

still looks like a normal delete operation.

Internally, the runtime transforms it into a state transition instead of physical removal.

This keeps business logic clean while lifecycle behavior remains centralized.

## Accessing deleted records

Some workflows still require visibility into deleted data.

Administrative tooling, recovery systems, audit workflows, and compliance tooling often need controlled access to deleted records.

Tenra allows this explicitly:

```ts
await UserModel.find(
  { isDeleted: true },
  { withDeleted: true }
);
```

Deleted visibility is opt-in rather than default behavior.

That distinction is important because it prevents accidental exposure of logically deleted records throughout the application.

## Restoring documents

Because documents are not physically removed, restoration becomes straightforward.

```ts
await UserModel.updateOne(
  { _id: userId },
  {
    $set: {
      isDeleted: false,
      deletedAt: null
    }
  }
);
```

This enables reversible workflows such as undo operations, delayed deletion confirmation, temporary account suspension, or operational recovery tooling.

## Explicit hard deletion

Permanent deletion should always remain deliberate.

```ts
await UserModel.deleteOne(
  { _id: userId },
  { hardDelete: true }
);
```

Middleware can bypass the lifecycle transformation when explicit hard deletion is requested:

```ts
if (ctx.options?.hardDelete) return;
```

The default behavior stays safe, while irreversible removal requires intentional override.

## Aggregate safety

Soft delete policies must also apply to aggregation pipelines.

Without aggregate protection, deleted documents can silently reappear in analytics, reporting, or operational dashboards.

```ts
userSchema.pre("aggregate", async (ctx) => {
  if (ctx.options?.withDeleted) return;

  ctx.pipeline = [
    {
      $match: {
        isDeleted: { $ne: true }
      }
    },
    ...(ctx.pipeline || [])
  ];
});
```

This keeps lifecycle behavior consistent across reads, writes, and analytical workloads.

## Lifecycle retention and cleanup

Soft delete is often the first stage of a broader data retention strategy.

Indexes should support the lifecycle policy:

```ts
userSchema.index({ isDeleted: 1 });
```

Retention behavior can then integrate with garbage collection or TTL orchestration:

```ts
userSchema.setGCConfig({
  enabled: true,
  retentionDays: 30
});
```

This allows systems to retain deleted records temporarily before permanent cleanup occurs automatically.

## Runtime implications

Soft delete changes more than deletion behavior.

It changes how the runtime treats visibility, retention, analytics, recovery, and operational safety.

Because the policy lives inside middleware and runtime execution rather than scattered service logic, the system behaves consistently across adapters, workers, APIs, transactions, and background jobs.

That consistency is the real advantage.

## Best practices

Treat soft delete as a lifecycle policy rather than a convenience flag.

Keep lifecycle middleware small and predictable, apply visibility filtering consistently across reads and aggregates, and reserve hard deletion for deliberate operational workflows.

Most importantly, keep lifecycle enforcement inside the runtime instead of duplicating filtering logic throughout application code.

## Summary

Soft delete in Tenra transforms deletion from an irreversible action into a controlled lifecycle transition.

By combining schema behavior, middleware execution, and runtime-aware model operations, Tenra allows systems to remain safer, more recoverable, and operationally consistent without leaking lifecycle concerns into business logic.

## Related pages

- [Delete](/crud/delete)
- [Read](/crud/read)
- [Aggregate](/crud/aggregate)
- [Middleware](/core/middleware)
- [Schema](/models/schema)
