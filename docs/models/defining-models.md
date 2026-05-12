# Defining Models

This page explains how models are declared, configured, and organized in Tenra applications.

If you are looking for the architectural role of models inside the runtime, see [TenraModel](/models/tenra-model)

In Tenra, a model defines the operational boundary for a collection. It combines a schema contract, a collection definition, and a provider strategy into a reusable execution surface that can participate in runtime-aware execution automatically.

The goal of model definition is long-term stability. Model structure should remain predictable even as execution context, tenant scope, transaction state, and infrastructure change dynamically at runtime.

## Minimal model definition

A model is typically defined with three core elements: a collection boundary, a schema, and a provider.

```ts
import { TenraModel } from "@tenra/core";
import { userSchema } from "./user.schema";
import { db } from "../infrastructure/database";

export const UserModel = new TenraModel({
  collectionName: "users",
  schema: userSchema,
  provider: db
});
```

This establishes how the model behaves operationally and how persistence infrastructure should be resolved during execution.

## Collection boundaries

collectionName defines the persistence boundary for the model:

```ts
collectionName: "users"
```

The collection itself is resolved inside the active database and tenant scope at runtime. The model definition remains static even though the infrastructure target may change dynamically between requests.

## Schema definition

The schema defines document structure, validation behavior, middleware hooks, and lifecycle rules.

Tenra supports plain schema definitions, but `TenraSchema` is the recommended production approach because it integrates more naturally with middleware execution, runtime validation, and type inference.

```ts
import { TenraSchema } from "@tenra/core";

export const userSchema = new TenraSchema({
  name: String,
  email: String
});
```

Schemas should focus on persistence behavior and structural integrity rather than application orchestration logic. Validation, normalization, and lifecycle hooks belong naturally at the schema layer because they remain close to persistence execution.

## Provider configuration

The provider determines how infrastructure is resolved during model execution.

```ts
provider: db
```

Unlike traditional ODMs that assume a global database connection, Tenra allows providers to remain dynamic and runtime-aware.

This design is fundamental to Tenra’s architecture. Infrastructure resolution can adapt per request, per tenant, or per execution boundary without requiring models to be redefined.

## Static vs dynamic providers

Smaller applications often begin with static providers:

```ts
provider: db
```

As systems evolve toward multi-tenancy, request-scoped execution, or distributed infrastructure, providers can become runtime-aware:

```ts
provider: () => TenraContext.getProvider()
```

In this model, infrastructure resolution occurs during execution rather than application boot time.

The model definition remains stable while the runtime determines the active database, tenant scope, transaction session, and infrastructure environment automatically.

This separation is one of the reasons Tenra adapts cleanly to multi-tenant and distributed systems.

## Type-safe execution

Tenra models support TypeScript generics for strongly typed operations.

```ts
interface User {
  name: string;
  email: string;
}

export const UserModel = new TenraModel<User>({
  collectionName: "users",
  schema: userSchema,
  provider: db
});
```

This improves editor inference, compile-time validation, refactoring safety, and operational consistency across the application.

```ts
await UserModel.create({
  name: "John Doe",
  email: "john@example.com"
});
```

Type safety becomes especially valuable as systems scale across teams, services, and runtime boundaries.

## Runtime-aware execution

A model definition is static, but execution is dynamic.

```ts
await UserModel.find({});
```

At runtime, the model automatically participates in the active execution boundary. Tenant identity, database scope, transaction sessions, middleware behavior, and request metadata are resolved from the runtime context rather than manually passed into every operation.

This is one of the core architectural shifts in Tenra:

```Plain Text
Static model definition.
Dynamic runtime execution.
```

## Recommended project structure

As applications grow, separating schemas from models helps preserve architectural clarity.

```Plain text
src/
  models/
    user.model.ts
    user.schema.ts
```

In this structure, schemas define persistence behavior while models define execution configuration and infrastructure relationships.

This separation keeps lifecycle logic close to persistence while keeping runtime orchestration concerns isolated from feature code.

## Recommended design approach

Model definitions should remain stable regardless of request conditions or infrastructure changes. Runtime state belongs to the execution boundary rather than the model itself.

Providers should remain adaptable enough to evolve with tenant routing, transaction propagation, serverless execution, or distributed infrastructure over time.

Schemas should focus on persistence-oriented behavior such as validation, normalization, and middleware hooks rather than embedding application workflows or transport-layer assumptions.

A model should also represent a single, well-defined collection boundary with predictable execution behavior. Clear operational boundaries improve middleware consistency, observability quality, and runtime traceability.

### Common anti-patterns

One of the most common architectural mistakes is manually propagating runtime state into ordinary model operations:

```ts
await UserModel.find({}, { tenantId, session });
```

In normal request-bound execution, runtime state should come from TenraContext automatically:

```ts
await UserModel.find({});
```

Another common mistake is embedding infrastructure creation directly into model definitions:

```ts
const client = new MongoClient(...);
```

Infrastructure resolution belongs to providers, not models.

Schemas should also avoid request-specific assumptions tied to Express, GraphQL, or other transport layers. Persistence definitions should remain portable across runtimes and adapters.

## Mental model

```Plain Text
Schema defines structure.
Provider resolves infrastructure.
Model executes operations.
Runtime supplies context.
```

## Design principles

The model layer follows a small set of runtime-oriented architectural principles.

<TenraModelPrinciples />

These principles keep model definitions stable while allowing execution behavior to adapt dynamically across tenants, runtimes, sessions, and infrastructure environments.

## Summary

Defining models in Tenra is intentionally explicit.

A model combines collection definition, schema behavior, provider strategy, and type-safe execution into a stable operational boundary that can participate in runtime-aware execution automatically.

This structure allows applications to keep persistence logic stable while the runtime dynamically resolves execution context, infrastructure, tenant scope, and transactional behavior behind the scenes.

### See also

- [TenraModel](/models/tenra-model)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [Middleware](/core/middleware)
- [Transactions](/core/transactions)
- [Architecture](/architecture/whitepaper)