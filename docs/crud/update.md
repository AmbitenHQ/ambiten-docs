# Update

Update operations modify existing documents through the Tenra model layer.

In Tenra, an update is not treated as an isolated mutation call. It still participates in middleware, runtime context, tenant-aware infrastructure resolution, and transaction boundaries, which keeps write behavior consistent across applications, workers, and distributed systems.

Tenra supports `updateOne`, `findOneAndUpdate`, upsert-style execution, middleware-aware mutations, and transaction-aware writes.

## The role of updates in the runtime

An update operation usually combines two things:

- a filter that identifies the target document
- a mutation definition that describes the change

At runtime, the operation can still pass through validation, middleware, context resolution, session binding, and result normalization before MongoDB executes the final mutation.

That keeps update behavior aligned with the rest of the Tenra runtime rather than reducing writes to disconnected database calls.

## Updating a document

Use `updateOne()` for targeted partial mutations:

```ts
await UserModel.updateOne(
  { email: "alice@example.com" },
  { $set: { name: "Updated" } }
);
```

This is the standard path when the caller only needs the mutation to succeed and does not require the updated document immediately afterward.

When the updated document should also be returned, use `findOneAndUpdate()`:

```ts
const updated = await UserModel.findOneAndUpdate(
  { email: "alice@example.com" },
  { $set: { name: "Updated" } }
);
```

This is useful when the operation also acts as a retrieval boundary or when downstream logic depends on the new persisted state.

## Upsert behavior

Upsert execution allows the runtime to create the document if no existing match is found:

```ts
await UserModel.findOneAndUpsert(
  { email: "alice@example.com" },
  { $set: { name: "Alice" } }
);
```

This pattern is especially useful in idempotent workflows, synchronization routines, and provisioning flows where creation and update behavior should share the same execution path.

## Typical execution flow

<UpdateOperationFlow />

Middleware, runtime context, and policy enforcement can all influence the mutation before persistence occurs.

## Runtime behavior

In a standard update flow:

- middleware can inspect or reshape the mutation
- tenant and database scope resolve from context
- MongoDB executes against the resolved collection
- post hooks can observe the outcome
- the write result or updated document returns in normalized form

This keeps mutation semantics consistent across HTTP requests, workers, background jobs, and transaction-aware execution.

## Context-aware updates

Updates can execute inside an explicit runtime scope when needed:

```ts
await UserModel.updateOne(
  { email: "alice@example.com" },
  { $set: { name: "Updated" } },
  { tenantId: "tenant-a" }
);
```

In most application flows, runtime state should still come from adapters or `TenraContext` rather than being threaded manually through every call.

Explicit overrides are generally more appropriate for scripts, maintenance workflows, and controlled background execution.

## Middleware around updates

Update middleware is commonly used for timestamps, mutation policy, and operational safeguards.

```ts
userSchema.pre("updateOne", async (ctx) => {
  ctx.update.$set = {
    ...(ctx.update.$set || {}),
    updatedAt: new Date()
  };
});
```

Because middleware executes inside the runtime boundary, mutation rules remain centralized and predictable instead of being duplicated across services or controllers.

## Transaction-aware updates

Update operations automatically participate in the active transaction scope:

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.updateOne(
    { email: "alice@example.com" },
    { $set: { name: "Updated" } }
  );
});
```

Within that boundary, the update reuses the active session from `TenraContext`, ensuring rollback behavior remains consistent if the wider workflow fails.

This is especially important when multiple writes must succeed or fail together.

## Tenant-aware mutation safety

Updates remain tenant-aware when execution occurs inside an active runtime scope.

That means a call such as:

```ts
await UserModel.updateOne(
  { email: "alice@example.com" },
  { $set: { name: "Updated" } }
);
```

can still resolve the correct tenant, database, session, and infrastructure boundary automatically.

This helps prevent infrastructure routing logic from leaking into application code and keeps write behavior consistent in multi-tenant systems.

## Mutation design considerations

Good update design usually means using targeted filters, preferring operator-based mutations such as `$set`, and avoiding broad or implicit write behavior.

Full-document replacement should remain intentional, especially in systems where partial updates are operationally safer and easier to reason about.

As update complexity grows, middleware and instrumentation become increasingly important for maintaining visibility into how mutations behave in production.

## Common patterns

Basic partial update

```ts
await UserModel.updateOne(
  { email: "alice@example.com" },
  { $set: { name: "Updated" } }
);
```

Return the updated document

```ts
const updated = await UserModel.findOneAndUpdate(
  { email: "alice@example.com" },
  { $set: { name: "Updated" } }
);
```

Upsert if missing

```ts
await UserModel.findOneAndUpsert(
  { email: "alice@example.com" },
  { $set: { name: "Alice" } }
);
```

Update inside a transaction

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.updateOne(
    { email: "alice@example.com" },
    { $set: { name: "Updated" } }
  );
});
```

## Best practices

Prefer operator-based mutations over full-document replacement unless replacement is explicitly intended. Keep update filters selective and measurable, and use middleware for timestamps, auditing, and cross-cutting mutation policy.

When updates participate in a broader workflow, use transactions so rollback behavior remains predictable and observable.

## Summary

Update operations in Tenra are runtime-aware mutation boundaries that participate in middleware, context propagation, tenant-safe infrastructure resolution, and transaction-aware execution.

That makes updates more than simple write calls. They become controlled mutation paths that remain predictable, observable, and operationally safe as systems scale in complexity.

## Related pages

- [Create](/crud/create)
- [Read](/crud/read)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Schema](/models/schema)
