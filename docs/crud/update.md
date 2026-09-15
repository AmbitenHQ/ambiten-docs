# Update

Update operations modify existing documents through the Ambiten model layer.

In Ambiten, an update remains part of the model runtime. It can participate in schema middleware, execution context, tenant-aware infrastructure resolution, transaction session propagation, and instrumentation where those capabilities are configured.

This keeps mutation logic simple at the API surface while allowing writes to remain aligned with the surrounding runtime.

## The role of updates in the runtime

An update operation usually combines two things:

- a filter that identifies the target document
- a mutation definition that describes the requested change

The operation then participates in the normal Ambiten model execution path.

```text
Application
      ↓
AmbitenModel Update Operation
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

The model can inherit execution state from `AmbitenContext`, combine it with explicit operation context and model defaults, and use the resulting Effective `ModelContext` throughout the mutation.

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

This keeps update behavior aligned with the same runtime model used by other Ambiten model operations.

## Updating a document

Use `updateOne()` for a targeted mutation:

```ts
await UserModel.updateOne(
  {
    email: "alice@example.com"
  },
  {
    $set: {
      name: "Updated"
    }
  }
);
```

This is appropriate when the application needs to modify a matching document but does not need the updated document returned as part of the same operation.

When the updated document should also be returned, use `findOneAndUpdate()`:

```ts
const updated =
  await UserModel.findOneAndUpdate(
    {
      email: "alice@example.com"
    },
    {
      $set: {
        name: "Updated"
      }
    }
  );
```

This can be useful when downstream application logic needs the resulting persisted state immediately after the mutation.

## Upsert behavior

Upsert-style execution combines matching and creation behavior.

```ts
await UserModel.findOneAndUpsert(
  {
    email: "alice@example.com"
  },
  {
    $set: {
      name: "Alice"
    }
  }
);
```

If no matching document exists, the operation can create one according to the semantics of the model method and MongoDB update.

This pattern can be useful for:

```text
synchronization
provisioning
state reconciliation
repeatable setup workflows
```

Upsert should not be treated as automatically idempotent.

Reliable idempotency still depends on the filter, uniqueness constraints, mutation semantics, and the surrounding application design.

For example, a stable identifier or unique index may be required to prevent multiple logically equivalent records from being created under concurrent execution.

## Typical execution flow

<UpdateOperationFlow />

An update can inherit runtime state before the mutation reaches MongoDB.

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Update Middleware
      ↓
Collection Resolution
      ↓
Provider Resolution
      ↓
MongoDB Mutation
      ↓
Post-Operation Behavior
```

The model owns collection resolution.

The provider path resolves the database, MongoDB client, and active session required by the operation.

## Runtime behavior

In a configured update flow:

- middleware can inspect or modify the mutation
- execution state can contribute tenant, database, request, and session information
- the model resolves the target collection
- the provider resolves the MongoDB infrastructure needed by the operation
- MongoDB performs the mutation
- post-operation behavior can observe or transform the result where configured

This allows update behavior to remain consistent across adapters, workers, scripts, background processes, and explicit execution scopes.

## Context-aware updates

Update operations can receive explicit persistence-facing context when a controlled operation needs it:

```ts
await UserModel.updateOne(
  {
    email: "alice@example.com"
  },
  {
    $set: {
      name: "Updated"
    }
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

In adapter-managed application flows, explicit overrides usually do not need to be supplied when the necessary execution state has already been established through `AmbitenContext`.

## Middleware around updates

Update middleware can centralize persistence-oriented mutation behavior.

```ts
userSchema.pre(
  "updateOne",
  async (ctx) => {
    ctx.update.$set = {
      ...(ctx.update.$set || {}),
      updatedAt: new Date()
    };
  }
);
```

Middleware can be useful for concerns such as:

```text
timestamps
mutation normalization
metadata enrichment
persistence-level policy
instrumentation hooks
```

This keeps reusable mutation behavior close to the persistence boundary instead of duplicating it throughout application services and controllers.

Authentication, authorization, approval workflows, and broader business policy should remain explicit application concerns unless they intentionally belong to the persistence layer.

## Validation behavior

Update validation should be understood separately from create-time document validation.

An update often contains mutation operators rather than a complete document:

```ts
{
  $set: {
    name: "Updated"
  }
}
```

Where the model or schema provides update validation, it can be used to protect persistence-level invariants.

However, update operations should not be assumed to validate an entire resulting document unless that behavior is explicitly provided by the configured model or schema path.

Application-level business rules should remain outside schema validation when they do not belong to the persistence contract.

## Transaction-aware updates

Update operations can participate in an active Ambiten transaction when they execute through compatible transaction-aware infrastructure.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.updateOne(
      {
        email: "alice@example.com"
      },
      {
        $set: {
          name: "Updated"
        }
      }
    );
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
Update Operation
```

The enclosing transaction boundary owns:

```text
start
commit
rollback
completion
```

If a participating MongoDB operation fails and the transaction boundary aborts, participating MongoDB writes can be rolled back together.

The update operation itself does not own transaction completion.

External side effects such as API calls, email delivery, object storage, filesystem writes, or queue publication are not automatically rolled back by the MongoDB transaction.

## Tenant-aware update execution

When execution state contains tenant identity and tenant infrastructure has been configured, update operations can participate in tenant-aware persistence resolution.

```ts
await UserModel.updateOne(
  {
    email: "alice@example.com"
  },
  {
    $set: {
      name: "Updated"
    }
  }
);
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
Update Operation
```

The application does not need to manually discover or pass the tenant MongoDB client into every update call.

The model still owns collection resolution.

Tenant infrastructure determines which client and database resources are used.

The update operation itself does **not** authenticate the caller, authorize tenant access, or independently guarantee tenant isolation.

Those properties depend on the surrounding authentication, authorization, tenant-resolution strategy, storage topology, and infrastructure configuration.

## Shared-collection mutation filtering

Some multi-tenant systems separate tenants by database.

Others store multiple tenants in a shared collection.

In a shared-collection topology, tenant identity may also need to be represented in the mutation filter or applied through persistence middleware.

For example:

```text
Shared Collection
      ↓
Tenant-Constrained Filter
      ↓
Target Document
      ↓
Update
```

This differs from database-level tenant separation:

```text
Tenant Identity
      ↓
Tenant Database
      ↓
Model Collection
      ↓
Update
```

Ambiten can carry tenant identity through either execution model, but the application's storage topology determines where data separation is actually enforced.

## Mutation design considerations

Good update design usually starts with targeted filters and explicit mutation operators.

Prefer focused operations such as:

```ts
{
  $set: {
    name: "Updated"
  }
}
```

over replacing more state than necessary.

Other operators such as:

```text
$set
$unset
$inc
$push
$pull
```

should be chosen according to the required mutation semantics.

Full-document replacement should remain intentional because it can overwrite state that the caller did not intend to change.

Broad filters also deserve particular care because they can make destructive or unintended mutation behavior harder to detect.

## Concurrent updates

Runtime context does not remove normal concurrency concerns.

Two operations may still attempt to modify the same document concurrently.

Where correctness depends on previous document state, applications may need techniques such as:

```text
conditional filters
version fields
unique constraints
transactions
atomic MongoDB operators
application-level conflict handling
```

The appropriate strategy depends on the consistency requirements of the workflow.

Ambiten coordinates execution context and persistence infrastructure; it does not make every concurrent mutation conflict-free.

## Common patterns

Basic partial update:

```ts
await UserModel.updateOne(
  {
    email: "alice@example.com"
  },
  {
    $set: {
      name: "Updated"
    }
  }
);
```

Return the updated document:

```ts
const updated =
  await UserModel.findOneAndUpdate(
    {
      email: "alice@example.com"
    },
    {
      $set: {
        name: "Updated"
      }
    }
  );
```

Upsert if missing:

```ts
await UserModel.findOneAndUpsert(
  {
    email: "alice@example.com"
  },
  {
    $set: {
      name: "Alice"
    }
  }
);
```

Update inside a transaction:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.updateOne(
      {
        email: "alice@example.com"
      },
      {
        $set: {
          name: "Updated"
        }
      }
    );

    await AuditLogModel.create({
      action: "USER_UPDATED"
    });
  }
);
```

Both MongoDB operations can participate in the same transaction when they execute through compatible transaction-aware infrastructure.

Explicit execution boundary:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "update-001"
  },
  async () => {
    return UserModel.updateOne(
      {
        email: "alice@example.com"
      },
      {
        $set: {
          name: "Updated"
        }
      }
    );
  }
);
```

## Best practices

Keep update filters selective and intentional.

Prefer operator-based mutations when only part of a document needs to change.

Use middleware for persistence-oriented behavior such as timestamps, normalization, metadata enrichment, and reusable mutation policy.

Do not assume that upsert alone guarantees idempotency.

Use transactions when multiple participating MongoDB operations must succeed or fail as one unit of work.

Keep authentication, authorization, approval logic, and broader business policy outside update middleware unless they deliberately belong to the persistence boundary.

Account for concurrency when correctness depends on existing document state.

Prefer context-driven execution when tenant, request, or transaction state has already been established.

Use explicit `ModelContext` values when a controlled operation intentionally needs different persistence-facing state.

## Mental model

```text
Context carries execution.

Model binds execution
to the update operation.

ModelContext carries
persistence state.

Middleware can shape
the mutation.

Infrastructure resolves
database resources.

MongoDB performs
the update.
```

## Summary

Update operations in Ambiten are runtime-aware model mutations.

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

The update operation itself does not establish every surrounding guarantee.

Instead, it participates in the execution context, model behavior, persistence policy, tenant infrastructure, transaction state, and concurrency model established around it.

That keeps ordinary mutations straightforward while allowing them to remain aligned with the broader Ambiten runtime.

## Related pages

- [Create](/crud/create)
- [Read](/crud/read)
- [Transactions](/core/transactions)
- [Middleware](/core/middleware)
- [Schema](/models/schema)