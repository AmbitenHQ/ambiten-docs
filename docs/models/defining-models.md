---
title: Defining Models
description: Define typed, schema-bound AmbitenModel instances that remain structurally stable while runtime context and infrastructure are resolved dynamically during execution.
---

# Defining Models

This page explains how models are declared, configured, typed, and organized in Ambiten applications.

If you are looking for the architectural role of models during execution, see [AmbitenModel](/models/ambiten-model).

In Ambiten, a model defines a stable execution surface around a collection.

It combines:

```text
collection configuration
schema behavior
provider relationship
typing
middleware
model defaults
```

into a reusable definition that can participate in context-aware execution.

The important distinction is:

> **A model is defined statically. Its execution context is resolved dynamically.**

A model does not need to be recreated every time the tenant, request, transaction session, database, or execution environment changes.

## Models Are an Optional Higher-Level Surface

Ambiten does not require every application to begin with the full model architecture.

For direct MongoDB-oriented execution, teaching examples, scripts, small applications, or gradual adoption, `AmbitenClient` provides context-aware static and instance APIs that can be used directly.

Conceptually:

```text
Simple / Direct Usage

AmbitenContext
      ↓
AmbitenClient
      ↓
MongoDB
```

As an application needs more structure, `AmbitenModel` adds:

```text
schema binding
middleware
validation
collection definition
effective context resolution
reusable operation behavior
```

Conceptually:

```text
Structured Model Usage

AmbitenContext
      ↓
AmbitenModel
      ↓
Infrastructure Resolution
      ↓
AmbitenClient / MongoDB
```

Neither approach is intended to be treated as an invalid use of Ambiten.

The model layer exists when a reusable schema-bound execution surface is useful.

## Minimal Model Definition

A model is commonly defined with three structural elements:

```text
collection name
schema
provider
```

For example:

```ts
import {
  AmbitenModel
} from "@ambiten/core";

import {
  userSchema
} from "./user.schema";

import {
  db
} from "../infrastructure/database";

export const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: db
  });
```

This defines the model's structural relationship with the collection, schema, and persistence provider.

It does **not** permanently bind the model to one request, tenant, transaction session, or execution context.

Those concerns are resolved when operations execute.

## Structural Definition vs Runtime Execution

A useful way to understand model definition is to separate two lifetimes.

### Definition Time

At definition or initialization time, the model establishes structural behavior such as:

```text
schema association
collection configuration
provider relationship
middleware
model defaults
typing
```

### Execution Time

When an operation runs, the runtime may resolve:

```text
tenant identity
requestId
database
collection override
transaction session
runtime metadata
tenant infrastructure
```

Conceptually:

```text
MODEL DEFINITION
───────────────
collection
schema
provider
middleware
defaults
typing


MODEL EXECUTION
───────────────
effective context
tenant
database
collection
session
runtime infrastructure
```

This separation allows one model definition to serve many independent executions.

## Collection Boundaries

`collectionName` defines the model's default persistence collection.

```ts
collectionName: "users"
```

The model remains structurally associated with that collection boundary while the database or other supported execution-specific values may vary according to runtime context.

For example:

```text
Request A
tenantId = tenantA
      ↓
UserModel
      ↓
db_tenantA
      ↓
users


Request B
tenantId = tenantB
      ↓
UserModel
      ↓
db_tenantB
      ↓
users
```

The model definition stays the same.

The infrastructure surrounding the operation changes.

Where supported collection overrides are present in the effective operation context, those can participate according to Ambiten's context-resolution rules.

## Schema Definition

The schema defines the document contract associated with the model.

`AmbitenSchema` provides a schema-aware surface for behavior such as:

```text
document structure
validation
middleware
normalization
lifecycle behavior
type relationships
```

For example:

```ts
import {
  AmbitenSchema
} from "@ambiten/core";

export const userSchema =
  new AmbitenSchema({
    name: {
      type: "string",
      required: true
    },

    email: {
      type: "string",
      required: true
    }
  });
```

Schemas should remain focused on persistence-oriented behavior.

Good schema concerns include:

```text
validation
normalization
data integrity
middleware
persistence lifecycle
```

Application orchestration such as HTTP responses, framework routing, or controller workflows belongs elsewhere.

## Schema and Model Stability

A schema should not be recreated merely because:

```text
the request tenant changed
a transaction started
the application moved from Express to Fastify
a worker executes the same operation
a Lambda invocation begins
```

Those are execution concerns.

The model and schema remain structural definitions.

```text
Stable Model + Schema
        │
        ├── Execution A
        ├── Execution B
        ├── Execution C
        └── Execution D
```

This is a central Ambiten design principle.

> **Static structure. Dynamic execution.**

## Provider Configuration

The provider participates in resolving the persistence resources required by model execution.

```ts
provider: db
```

A provider can participate in resolving resources such as:

```text
database
collection
client
transaction session
runtime overrides
```

The provider consumes execution information.

It should not be confused with request tenant identification.

The architectural distinction is:

```text
TenantResolver
→ identifies the tenant

AmbitenContext
→ carries execution state

AmbitenModel
→ resolves effective operation context

Provider
→ resolves persistence bindings
```

For tenant-aware execution, provider resolution may also cooperate with `MultiTenantManager`.

## Static Provider Pattern

A simple application may use a stable provider:

```ts
export const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: db
  });
```

This is useful when infrastructure is straightforward and a single provider can serve the model consistently.

There is nothing inherently temporary or incorrect about this pattern.

Ambiten does not require an application to become multi-tenant or infrastructure-heavy before the model API becomes useful.

## Runtime-Aware Provider Resolution

More advanced applications may use providers that participate in execution-time resolution.

The important architectural idea is not a particular provider syntax.

It is that the model does not need to be recreated merely because the runtime state changes.

Conceptually:

```text
UserModel
   ↓
active effective context
   ↓
provider
   ↓
database / client / session
```

This makes it possible for the same model definition to participate in:

```text
request-scoped execution
tenant-aware execution
transactions
workers
serverless functions
custom runtime environments
```

without coupling the model itself to those environments.

## Tenant-Aware Models

A model does not discover tenant identity from the incoming framework request.

Instead:

```text
Request
   ↓
TenantResolver
   ↓
tenantId
   ↓
AmbitenContext
   ↓
AmbitenModel
```

When the model operation needs persistence, the effective tenant identity can participate in infrastructure resolution.

```text
AmbitenModel
      ↓
Effective Context
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
TenantConfig
      ↓
Tenant Client
      ↓
Tenant Database
```

The model definition itself remains unchanged.

## Static and Dynamic Tenants

Model code does not need separate APIs for static and dynamically discovered tenants.

The same call:

```ts
await UserModel.find({});
```

may execute against a tenant registered during startup:

```text
tenant5
   ↓
already registered
   ↓
getClient()
```

or one discovered dynamically:

```text
tenant5
   ↓
not registered
   ↓
TenantConfigResolver
   ↓
register tenant
   ↓
getClient()
```

The model API remains stable because tenant discovery belongs to runtime infrastructure.

## Lazy Tenant Infrastructure

A tenant may also be registered but not connected yet.

For example:

```text
registered = true
connected = false
lazy = true
```

The first model operation that requires persistence can cause the runtime infrastructure to obtain a usable client.

```text
UserModel.find(...)
      ↓
tenant-aware infrastructure resolution
      ↓
MultiTenantManager.getClient()
      ↓
connection established
      ↓
MongoDB
```

The application does not need a special "lazy tenant" model definition.

## Type-Safe Execution

Ambiten models support TypeScript generics for strongly typed operations.

```ts
import type {
  Document
} from "@ambiten/core";

interface User
  extends Document {
  name: string;
  email: string;
}
```

The same document type should be used consistently with the schema and model:

```ts
const userSchema =
  new AmbitenSchema<User>({
    name: {
      type: "string",
      required: true
    },

    email: {
      type: "string",
      required: true
    }
  });

export const UserModel =
  new AmbitenModel<User>({
    collectionName: "users",
    schema: userSchema,
    provider: db
  });
```

Model operations can then benefit from stronger editor and compiler feedback:

```ts
await UserModel.create({
  name: "John Doe",
  email: "john@example.com"
});
```

Benefits include:

```text
editor inference
compile-time validation
safer refactoring
consistent schema/model typing
clearer application contracts
```

> [!NOTE]
> Use the `Document` type exported by `@ambiten/core` when defining document interfaces intended for `AmbitenSchema<T>` and `AmbitenModel<T>`.
>
> ```ts
> import type {
>   Document
> } from "@ambiten/core";
> ```
>
> The document type used by the schema should also be used by the corresponding model so their generic contracts remain compatible.
>
> Do not substitute an unrelated MongoDB `Document` type when the Ambiten APIs expect Ambiten's exported document contract.

## Runtime-Aware Execution

Once defined, model operations participate in the active runtime boundary.

```ts
await UserModel.find({});
```

The operation may consume runtime information such as:

```text
tenantId
requestId
dbName
collectionName
transaction session
runtime metadata
```

without requiring those values to appear in the ordinary application call.

The model does not necessarily take those values directly from one source.

It resolves an effective operation context.

## Effective Context Resolution

The general model is:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

Where a supported operation-level override is supplied, it can take precedence over lower-level runtime or model defaults.

For normal request-aware execution, however, application code can usually remain:

```ts
await UserModel.find({});
```

rather than manually recreating the runtime context for every operation.

## Transaction-Aware Models

A model definition does not change when execution enters a transaction.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(
      user
    );

    await AuditModel.create(
      audit
    );
  }
);
```

Participating model operations can resolve the active transaction session from execution context.

```text
Transaction Boundary
      ↓
session S1
      ↓
UserModel
      ↓
AuditModel
```

The transaction boundary owns commit and rollback behavior.

The model participates in the active transaction; it does not own the surrounding transaction lifecycle.

## Middleware

Model definitions can participate in Ambiten's middleware architecture.

Conceptually:

```text
before middleware
      ↓
model operation
      ↓
after middleware
```

Middleware may support concerns such as:

```text
validation
normalization
policy enforcement
auditing
logging
soft-delete behavior
instrumentation
result shaping
```

Because middleware runs around the model operation, it can participate in the same effective execution context.

This allows model policies to remain independent from the ingress framework.

## Models and AmbitenClient

`AmbitenModel` and `AmbitenClient` serve different levels of abstraction.

### Direct Client Usage

`AmbitenClient` provides context-aware static and instance methods that can be useful for:

```text
learning Ambiten
live coding
YouTube tutorials
educational examples
scripts
small services
direct database workflows
gradual adoption
```

Conceptually:

```text
AmbitenContext
      ↓
AmbitenClient
      ↓
MongoDB
```

### Model Usage

`AmbitenModel` adds a reusable schema-bound operation surface:

```text
AmbitenContext
      ↓
AmbitenModel
      ↓
schema
middleware
effective context
infrastructure resolution
      ↓
MongoDB
```

An application can choose the level of structure appropriate for its needs.

Ambiten's runtime architecture is designed to support growth rather than require maximum complexity from the beginning.

## Progressive Adoption

A small application or tutorial may begin with:

```text
AmbitenClient
```

then introduce:

```text
AmbitenContext
```

to demonstrate execution-scoped state.

Later it may add:

```text
AmbitenSchema
      ↓
AmbitenModel
```

for reusable model behavior.

And when application requirements grow further:

```text
Adapters
MultiTenantManager
TenantConfigResolver
Transactions
Middleware
Runtime instrumentation
```

can be introduced without changing the fundamental execution model.

Conceptually:

```text
Direct Client
      ↓
Context-Aware Client
      ↓
Schema + Model
      ↓
Framework Adapters
      ↓
Multi-Tenant Runtime
      ↓
Advanced Infrastructure
```

The architecture scales upward without requiring every user to start at the final stage.

## Recommended Project Structure

For applications with several models, separating schema and model definitions helps keep persistence behavior organized.

```text
src/
  models/
    user.model.ts
    user.schema.ts
```

For larger applications, feature-oriented layouts are equally possible:

```text
src/
  users/
    user.schema.ts
    user.model.ts
    user.service.ts
```

The important distinction is conceptual rather than directory-specific:

```text
schema
→ document structure and persistence behavior

model
→ collection-bound execution surface

service
→ application workflow
```

Ambiten does not require one particular project layout.

## Model Initialization Is Structural

Model creation or bootstrap registration should prepare structural behavior.

Conceptually:

```text
Application Startup
      ↓
register schema
      ↓
register model definition
```

It should not require the application to resolve a request-specific tenant database merely to define the model.

That work belongs to operation execution.

```text
Request / Job
      ↓
AmbitenContext
      ↓
Model Operation
      ↓
Effective Context
      ↓
Infrastructure Resolution
```

This keeps model startup independent from request-specific runtime state.

## Recommended Design Approach

Model definitions should remain stable as execution conditions change.

A model should generally not be recreated because:

```text
the request changed
the tenant changed
a transaction started
the framework changed
a worker called the same service
a Lambda invocation began
```

Instead:

```text
model definition
→ stable

execution context
→ dynamic
```

Providers should remain responsible for infrastructure relationships.

Schemas should remain focused on persistence-oriented structure and behavior.

Services should remain focused on application workflows.

## One Model, One Clear Collection Boundary

A model should normally represent one clear collection boundary.

For example:

```ts
const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: db
  });
```

This makes behavior easier to reason about across:

```text
middleware
validation
instrumentation
runtime context
database routing
collection resolution
```

A predictable model boundary helps preserve architectural clarity as the application grows.

## Common Anti-Patterns

### Repeating Runtime Context on Every Operation

Avoid routinely writing:

```ts
await UserModel.find(
  {},
  {
    tenantId,
    session,
    dbName
  }
);
```

when those values already belong to the active runtime execution.

Prefer:

```ts
await UserModel.find({});
```

inside a valid context boundary.

Explicit operation context should be used when the operation intentionally needs a supported override.

### Resolving Tenant Identity Inside the Model

Avoid making the model inspect framework requests:

```text
req.headers
GraphQL context
NestJS ExecutionContext
Lambda event
```

to determine the tenant.

Tenant identity should already have been established by the execution boundary.

### Creating Infrastructure Inside the Model Definition

Avoid patterns such as:

```ts
const client =
  new MongoClient(...);
```

solely inside a model declaration.

Client and infrastructure lifecycle should remain separate from model structure.

### Storing Request State on the Model

Avoid:

```ts
UserModel.currentTenant =
  tenantId;
```

A model may be shared by concurrent executions.

Request-specific state belongs in the execution context.

### Coupling Schemas to Frameworks

Schemas should not depend on:

```text
Express Request
Fastify Request
NestJS controller state
GraphQL resolver context
Lambda event objects
```

Persistence definitions should remain portable.

## Framework Independence

A single model can be used behind multiple execution environments.

```text
Express ─────┐
Fastify ─────┤
NestJS ──────┤
GraphQL ─────┤
Lambda ──────┤
Worker ──────┘
             ↓
        UserModel
```

The host environment determines how execution enters Ambiten.

The model remains concerned with the operation itself.

## Mental Model

```text
Schema defines structure.

Model defines the reusable operation surface.

Context defines the current execution.

Provider resolves persistence bindings.

MultiTenantManager owns tenant infrastructure.

AmbitenClient offers direct context-aware database access
and participates in MongoDB execution.

MongoDB performs persistence.
```

The compact version is:

```text
Static model definition.

Dynamic runtime execution.
```

## Design Principles

The model layer follows a small set of runtime-oriented architectural principles.

<AmbitenModelPrinciples />

These principles keep model definitions stable while allowing execution behavior to adapt across requests, tenants, transactions, frameworks, workers, and infrastructure environments.

## Summary

Defining an `AmbitenModel` creates a stable, typed, schema-bound execution surface around a MongoDB collection.

A model can combine:

- collection configuration,
- `AmbitenSchema`,
- provider relationships,
- TypeScript typing,
- middleware,
- model defaults,

while leaving runtime-specific state to execution time.

The core relationship is:

```text
Model Definition
      ↓
Schema + Collection + Provider
      ↓
Operation Begins
      ↓
Effective Context
      ↓
Infrastructure Resolution
      ↓
MongoDB
```

For simple or educational use cases, applications can also work directly with the context-aware `AmbitenClient` APIs and introduce models as additional structure becomes valuable.

Ambiten therefore supports both:

```text
approachable direct usage
```

and:

```text
structured runtime architecture
```

without changing the underlying principle:

> **Define structure once. Resolve execution dynamically.**

## See Also

- [AmbitenModel](/models/ambiten-model)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [Middleware](/core/middleware)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [AmbitenClient](/reference/api/ambiten-client)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Architecture](/architecture/whitepaper)