# Migration

Migration to Ambiten is not a rewrite. It is a transition from manually coordinated infrastructure behavior to a runtime-driven execution model.

The goal is to preserve existing collections, business logic, and operational workflows while gradually moving transactions, tenant routing, middleware, and observability into the runtime.

Ambiten is designed for incremental adoption.

<DocOverviewCards 
eyebrow="Migration Path" title="Adopt Ambiten one execution boundary at a time." description="Migration keeps existing collections and workflows intact while moving sessions, tenant routing, transactions, middleware, and instrumentation into the runtime." accent="#d38a49"
:signals='["Existing collections", "AmbitenModel", "Context", "Transactions", "Runtime features"]' :cards='[ { "label": "Preserve", "title": "Keep existing MongoDB data", "text": "Collections, indexes, and document structure can remain unchanged while Ambiten is introduced gradually." }, { "label": "Replace", "title": "Move data access into runtime-aware models", "text": "Introduce AmbitenModel around existing collections and replace direct driver or ORM calls progressively." }, { "label": "Centralize", "title": "Remove infrastructure plumbing from services", "text": "Tenant resolution, sessions, transactions, and instrumentation become runtime responsibilities instead of repeated application logic." }
]'
:flow='[ { "label": "Step 1", "title": "Introduce models" }, { "label": "Step 2", "title": "Bind context" }, { "label": "Step 3", "title": "Move transactions" }, { "label": "Step 4", "title": "Adopt runtime features" }
]'
/>

## What changes during migration

Most MongoDB systems already have collections, schemas, query flows, and transaction handling patterns.

Migration changes how execution is organized around those systems.

Instead of manually coordinating tenant routing, session propagation, database resolution, middleware behavior, and instrumentation across services, Ambiten centralizes those concerns inside the runtime.

## Migration approach

Migration should remain incremental.

A common progression looks like:

```text
Existing queries
  ↓
Introduce AmbitenModel
  ↓
Introduce Context
  ↓
Move transaction handling
  ↓
Adopt runtime features
```

This allows teams to validate each execution boundary independently without disrupting production systems.

## Introducing models

Start by wrapping an existing collection with `AmbitenModel`.

```ts
const UserModel = new AmbitenModel({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

Once the model exists, direct MongoDB driver calls or ORM queries can be replaced progressively.

No collection migration is required.

## Introducing context

After models are in place, introduce runtime context boundaries.

```ts
await AmbitenContext.run(
  { tenantId: "tenant-a" },
  async () => {
    await UserModel.find({});
  }
);
```

This removes the need to manually pass tenant or database state through service layers.

## Moving transaction handling

One of the biggest architectural improvements usually comes from transaction orchestration.

Before

```ts
await User.create(data, { session });

await Audit.create(log, { session });
```

Infrastructure state must be threaded manually through every operation.

After

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(data);
  await AuditModel.create(log);
});
```

The runtime manages session reuse, transaction boundaries, and rollback consistency automatically.

## Migrating from Mongoose

Migration from Mongoose usually focuses less on schema structure and more on execution behavior.

Before

```ts
 { _id: id, tenantId },
  data,
  { session }
);
```

After

```ts
await UserModel.findOneAndUpdate(
  { _id: id },
  data
);
```

Tenant and session scope resolve from the runtime rather than from manually propagated arguments.

### Migrating from Prisma

Prisma structures data access around a generated query client.

Ambiten structures execution around a runtime.

Before

```ts
await prisma.user.create({ data });
```

After

```ts
await UserModel.create(data);
```

The visible syntax difference is small, but the execution model changes significantly because runtime scope, transactions, middleware, and instrumentation now participate automatically.

## Preserving existing data

Ambiten operates on top of existing MongoDB infrastructure.

Collections, indexes, and document structure can remain intact while migration happens progressively around execution boundaries instead of database reconstruction.

## Gradual replacement strategy

Migration does not need to happen all at once.

Most teams start with a few high-value models, then progressively move service boundaries and runtime behavior into Ambiten. Legacy queries and Ambiten models can coexist during the transition, which reduces operational risk and makes adoption easier to validate incrementally.

## Common migration mistakes

The most common mistake is trying to migrate everything simultaneously.

Another common issue is mixing manual session handling with runtime-managed transactions inside the same execution flow, which usually recreates the complexity migration was meant to remove.

Tenant-aware systems should also avoid bypassing context boundaries, otherwise infrastructure concerns leak back into application code.

## Mental model

```PlainText
Before → infrastructure state travels through the application
After  → infrastructure state lives in the runtime
```

That is the real architectural shift.

## Summary

Migration to Ambiten is a transition from manually coordinated infrastructure behavior to a structured runtime system.

It can happen incrementally, without rewriting collections or disrupting production workloads.

The result is a cleaner execution model where transactions, tenant routing, middleware, and instrumentation become centralized runtime behavior instead of repeated application plumbing.

### Related pages

- [AmbitenModel](/models/ambiten-model)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Execution Guarantees](/architecture/execution-guarantees)
