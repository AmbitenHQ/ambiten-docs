# Schema

`AmbitenSchema` defines the structural and behavioral contract for a `AmbitenModel`.

It does more than describe document shape. A schema governs how data is validated, how persistence behavior is enforced, and how middleware and lifecycle rules participate in runtime execution consistently across the system.

In Ambiten, schema is not just about data structure. It is about structure, behavior, and runtime policy operating together.

## What AmbitenSchema represents

A `AmbitenSchema` defines the persistence contract for a collection boundary.

It establishes document structure, validation rules, middleware registration, lifecycle behavior, and runtime-oriented policies that execute around model operations automatically.

Unlike passive schema definitions found in many ODM systems, `AmbitenSchema` participates directly in runtime execution through middleware pipelines and context-aware behavior.

```ts
const userSchema = new AmbitenSchema({
  name: String,
  email: String,
  createdAt: Date
});
```

The schema defines what persistence should look like and how persistence behavior should be enforced.

## Structural typing and validation

Schemas support strongly typed model execution through TypeScript generics.

```ts
interface User {
  name: string;
  email: string;
}

const userSchema = new AmbitenSchema<User>({
  name: String,
  email: String
});
```

When paired with `AmbitenModel`, this improves compile-time validation, editor inference, update safety, and operational consistency across the application.

Schemas also act as validation boundaries before persistence occurs:

```ts
await UserModel.create({
  name: "John",
  email: "john@example.com"
});
```

Invalid structures can be rejected before they ever reach MongoDB.

This keeps persistence rules centralized and predictable rather than scattered across controllers, services, and transport layers.

## Runtime-aware middleware

Schemas are the primary registration surface for middleware execution.

```ts
userSchema.pre("create", async (ctx) => {
  if (ctx.doc) {
    ctx.doc.createdAt = new Date();
  }
});
```

This includes validation, normalization, auditing, soft delete enforcement, access shaping, lifecycle policies, and observability enrichment.

Because middleware executes inside `AmbitenContext`, schema behavior can also become runtime-aware:

```ts
userSchema.post("create", async (ctx) => {
  console.log(`Created in tenant ${ctx.tenantId}`);
});
```

The schema therefore participates in execution context rather than acting only as a static document definition.

## Runtime participation

<SignalFlow
  aria-label="Schema runtime participation flow"
  :items='["AmbitenSchema", "AmbitenModel", "AmbitenClient", "MongoDB"]'
/>

During execution, the schema validates input, middleware executes around the operation, the model coordinates execution behavior, and persistence resolves through the client layer into MongoDB.

The schema is therefore active both before and after persistence occurs.

## Lifecycle and policy behavior

Schemas can also define runtime-oriented lifecycle behavior.

```ts
schema.setGCConfig({
  ttlField: "createdAt",
  expiresIn: "30d",
  softDelete: true
});
```

This allows persistence boundaries to carry operational policies such as expiration behavior, soft deletion strategies, audit enrichment, and garbage-collection configuration directly alongside structural definitions.

The schema defines the policy. The runtime enforces it.

This separation keeps lifecycle behavior consistent without forcing application services to coordinate persistence rules manually.

## Static definition, dynamic execution

Schemas are defined once:

```ts
const userSchema = new AmbitenSchema({...});
```

but their behavior executes dynamically based on the active runtime boundary.

Tenant identity, transaction sessions, request metadata, middleware chains, and execution scope may all change between requests while the schema definition itself remains stable.

This mirrors one of the core architectural principles of Ambiten:

```Plain Text
Static definition.
Dynamic execution.
```

## Relationship with AmbitenModel

<SignalFlow
  aria-label="Schema and model relationship"
  :items='["AmbitenSchema", "AmbitenModel"]'
/>

The schema defines structure and behavioral rules. The model coordinates execution against the active runtime boundary.

The two layers are tightly connected but intentionally separate in responsibility.

The schema owns persistence behavior. The model owns runtime execution.

## Recommended design approach

Schemas should remain focused on persistence-oriented behavior rather than application orchestration logic.

Validation, normalization, middleware hooks, lifecycle rules, and runtime-aware persistence policies belong naturally at the schema layer because they remain close to the data boundary itself.

Large workflow orchestration, transport concerns, and application-specific business processes should remain outside schema definitions.

Middleware should also stay small, composable, and operationally focused. Cross-cutting concerns belong naturally in schema middleware because they can execute consistently around all model operations automatically.

## Mental model

```Plain Text
Schema defines structure and behavior.
Model coordinates execution.
Client resolves infrastructure.
Runtime supplies context.
```

## Design principles

<AmbitenSchemaPrinciples />

These principles allow schemas to remain structurally stable while still participating in runtime-aware execution across tenants, transactions, middleware chains, and infrastructure boundaries.

## Summary

AmbitenSchema is the behavioral contract for persistence in Ambiten.

It defines not only how documents are structured, but also how persistence behavior should execute, how middleware participates in runtime flows, and how lifecycle policies remain enforced consistently across the system.

By combining structural definition with runtime-aware behavior, Ambiten allows applications to keep persistence logic centralized, observable, and operationally coherent without leaking infrastructure concerns into business code.

## Related pages

- [AmbitenModel](/models/ambiten-model)
- [Defining Models](/models/defining-models)
- [Context Binding](/models/context-binding)
- [Middleware](/core/middleware)
- [Architecture](/architecture/whitepaper)
