# Middleware

Middleware is Ambiten’s runtime policy layer.

It governs model execution as operations move through the runtime pipeline, allowing validation, access control, auditing, observability, and transformation logic to be defined once and enforced consistently across the system.

Rather than scattering infrastructure behavior across services and controllers, Ambiten centralizes these concerns into the execution layer itself.

## Why middleware exists

As systems evolve, execution behavior must remain consistent across every operation.

Writes may require auditing and normalization. Reads may need tenant-aware filtering, soft-delete enforcement, or policy shaping. Observability metadata must remain attached to runtime execution regardless of where the operation originates.

Without middleware, these behaviors become fragmented across handlers, services, and transport layers. Over time, duplication increases, enforcement becomes inconsistent, and operational correctness depends on developer discipline rather than runtime guarantees.

Ambiten solves this by treating middleware as part of the execution architecture.

## Runtime execution model

Middleware executes around model operations, not inside business logic.

This allows the runtime to intercept operations before persistence, enrich execution metadata, reshape queries, enforce policies, observe results, and coordinate runtime-aware side effects while preserving clean application code.

<MiddlewareLifecycleOverview />

At a high level, middleware participates in the execution flow before and after persistence behavior occurs.

## Hook model

Middleware is registered at operation boundaries.

Conceptually, the lifecycle follows this structure:

```ts
beforeFind
afterFind
beforeCreate
afterCreate
beforeUpdate
afterUpdate
beforeDelete
afterDelete
beforeAggregate
afterAggregate
```

In practice, Ambiten exposes schema-level hooks:

```ts
schema.pre("create", handler);
schema.post("find", handler);
```

These hooks execute automatically whenever the corresponding model operation runs.

## Basic example

```ts
userSchema.pre("create", async (ctx) => {
  if (ctx.doc) {
    ctx.doc.createdAt = new Date();
  }
});
```

The middleware executes before every create operation for that model.

## Middleware context

Every middleware handler receives a runtime-aware execution context.

```ts
ctx.doc
ctx.filter
ctx.pipeline
ctx.result
ctx.session
ctx.tenantId
ctx.collectionName
ctx.meta
```

This context combines operation state, execution metadata, and runtime information resolved from `AmbitenContext`.

Because middleware executes inside the active runtime boundary, it automatically participates in tenant-aware and transaction-aware execution.

## Context-aware execution

Middleware can resolve runtime state without manual propagation.

Tenant identity, request metadata, active transaction sessions, logging metadata, and infrastructure scope are all available through the active execution context.

This is what transforms middleware from a simple hook mechanism into a runtime policy system.

## Common patterns

### Auditing

```ts
userSchema.post("create", async (ctx) => {
  console.log(
    `Created document in ${ctx.collectionName} for tenant ${ctx.tenantId}`
  );
});
```

### Soft-delete enforcement

```ts
userSchema.pre("find", async (ctx) => {
  ctx.filter = {
    ...(ctx.filter || {}),
    isDeleted: { $ne: true }
  };
});
```

### Access shaping

```ts
userSchema.pre("find", async (ctx) => {
  if (ctx.tenantId !== "admin") {
    ctx.filter = {
      ...(ctx.filter || {}),
      restricted: false
    };
  }
});
```

### Data normalization

```ts
userSchema.pre("create", async (ctx) => {
  if (ctx.doc?.email) {
    ctx.doc.email = ctx.doc.email.toLowerCase();
  }
});
```

These behaviors remain attached to the model lifecycle rather than being duplicated across transport handlers or service layers.

## Execution order

Middleware executes deterministically in registration order.

```ts
schema.pre("create", fn1);
schema.pre("create", fn2);
```

**Execution flow:**

<SignalFlow
  aria-label="Middleware execution order"
  :items='["fn1", "fn2", "database", "post hooks"]'
/>

This predictable ordering allows middleware to remain composable without hidden execution behavior.

## Async execution

Middleware can execute asynchronously:

```ts
schema.pre("create", async (ctx) => {
  await validate(ctx.doc);
});
```

If a middleware throws, the operation fails immediately and the error propagates through the active execution boundary.

When transactions are active, rollback behavior remains consistent because middleware participates inside the same runtime scope.

Transaction integration

Middleware operates inside transaction boundaries automatically.

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(data);
});
```

This allows validation, auditing, and policy enforcement to participate in the same atomic execution boundary as the database operations themselves.

## Observability integration

Middleware is also a natural observability boundary.

Because middleware executes inside runtime context, instrumentation can correlate execution metadata such as tenant identity, request identifiers, operation type, execution duration, and policy overhead without modifying business logic signatures.

This makes middleware an important part of operational visibility, not just lifecycle customization.

## Design principles

Effective middleware should remain focused, composable, and infrastructure-oriented.

Middleware works best when it governs cross-cutting execution concerns such as validation, access shaping, auditing, observability, normalization, or lifecycle enforcement rather than embedding full domain workflows inside hooks.

Runtime state should be resolved through `AmbitenContext`, not through global state or manual parameter propagation.

## Relationship with runtime

<SignalFlow
  aria-label="Middleware runtime relationship"
  :items='["Adapter", "AmbitenContext", "Middleware", "AmbitenModel", "MongoDB"]'
/>

The adapter establishes the execution boundary, `AmbitenContext` stores runtime state, middleware governs execution behavior, models coordinate persistence, and MongoDB executes the finalized operation.

Each layer owns a distinct responsibility inside the runtime architecture.

## What differentiates Ambiten middleware

Traditional ODM middleware systems are typically lifecycle-oriented but only partially runtime-aware.

Ambiten extends middleware into the execution layer itself.

| Capability                | Traditional ODM         | Ambiten                |
| ------------------------- | ----------------------- | -------------------- |
| Context awareness         | Limited                 | Full runtime context |
| Tenant awareness          | Manual                  | Runtime-native       |
| Transaction participation | Manual session handling | Automatic            |
| Policy enforcement        | Distributed             | Centralized          |
| Observability             | Ad hoc                  | Runtime-integrated   |

## Summary

Middleware in Ambiten is not just a hook system attached to persistence operations.

It is a runtime-level execution layer that allows policies, observability, validation, and infrastructure-aware behavior to remain centralized, composable, and consistent across the system.

### Related pages

- [Context](/core/context)
- [Transactions](/core/transactions)
- [Instrumentation](/core/instrumentation)
- [Schema](/models/schema)
- [Architecture](/architecture/whitepaper)
