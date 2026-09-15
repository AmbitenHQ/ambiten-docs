---
title: Schema
description: Define typed document structure, validation, middleware, and persistence policies with AmbitenSchema while participating in AmbitenModel runtime execution through ModelContext.
---

# Schema

`AmbitenSchema` defines the structural and behavioral contract used by `AmbitenModel`.

A schema describes more than document shape.

It can define:

```text
document structure
validation behavior
middleware
normalization
lifecycle policy
persistence-oriented rules
```

while remaining independent from request routing, tenant discovery, database connections, and application workflow orchestration.

In the Ambiten model runtime, the schema participates in an operation after `AmbitenModel` has resolved the effective `ModelContext`.

Conceptually:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
AmbitenSchema / Middleware
      ↓
Model Operation
      ↓
Infrastructure Resolution
      ↓
MongoDB
```

> **Schema defines persistence behavior. Model binds that behavior to execution.**

## What AmbitenSchema Represents

An `AmbitenSchema` is the persistence contract associated with a model's document structure and operation behavior.

For example:

```ts
import {
  AmbitenSchema
} from "@ambiten/core";

const userSchema =
  new AmbitenSchema({
    name: "string",
    email: "string",
    createdAt: "date"
  });
```

The schema definition is static.

It does not change simply because:

```text
the request changes
the tenant changes
a transaction begins
a worker executes the model
the application runs behind another framework
```

Those are execution concerns.

The schema remains a reusable definition.

## Structural and Behavioral Responsibilities

A schema can participate in two broad categories of model behavior.

### Structural Behavior

```text
document shape
field definitions
validation
type relationships
data integrity
```

### Runtime Persistence Behavior

```text
middleware
normalization
soft-delete policy
lifecycle behavior
audit enrichment
operation-oriented policy
```

These concerns stay close to the persistence boundary rather than being distributed across controllers and services.

## Schema Does Not Own Execution Context

`AmbitenSchema` does not establish the current request or operation context.

The execution boundary is established before the schema participates.

For normal model execution:

```text
Framework Adapter
or
AmbitenContext.run(...)
        ↓
AmbitenContext
        ↓
AmbitenModel
        ↓
mergeCtx(...)
        ↓
Effective ModelContext
        ↓
Schema / Middleware
```

The schema consumes operation state supplied through the model runtime.

It does not independently determine:

```text
which request is active
which tenant entered the system
which MongoClient should be used
which database connection should be created
```

Those responsibilities belong to other runtime layers.

## ModelContext and Schema Execution

`ModelContext` is the operation-facing context contract shared across the model runtime.

```ts
export type ModelContext = {
  tenantId?: string;
  requestId?: string;
  dbName?: string;
  db?: Db;
  collectionName?: string;
  config?: AmbitenConfig;
  session?: ClientSession;
  withDeleted?: boolean;
  onlyDeleted?: boolean;
  hardDelete?: boolean;
};
```

It contains execution values relevant to model, schema, and persistence behavior.

The full runtime state lives in `AmbitenContextState`.

The model derives the operation-facing context from that execution state.

Conceptually:

```text
AmbitenContextState
        ↓
AmbitenContext.get()
        +
explicit ModelContext
        +
model defaults
        ↓
AmbitenModel.mergeCtx()
        ↓
Effective ModelContext
```

That effective context can then participate throughout the operation.

```text
Effective ModelContext
        ├── Schema
        ├── Middleware
        ├── Model Operation
        └── DbProvider
```

This gives the model runtime one consistent operation context rather than forcing every layer to reconstruct runtime state independently.

## Structural Typing

`AmbitenSchema` supports TypeScript generics.

Use the `Document` contract exported by `@ambiten/core`.

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

The document contract can then be used with the schema:

```ts
const userSchema =
  new AmbitenSchema<User>({
    name: "string",
    email: "string"
  });
```

and with its corresponding model:

```ts
const UserModel =
  new AmbitenModel<User>({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

Using the same document type across both layers keeps the schema and model generic contracts compatible.

> [!NOTE]
> Use the `Document` type exported by `@ambiten/core` for document types passed to `AmbitenSchema<T>` and `AmbitenModel<T>`.
>
> ```ts
> import type {
>   Document
> } from "@ambiten/core";
> ```
>
> The same document type should be used by the corresponding schema and model.
>
> Do not substitute an unrelated MongoDB `Document` type when the Ambiten APIs expect Ambiten's exported document contract.

## Validation

Schemas form a validation boundary around model persistence behavior.

For example:

```ts
await UserModel.create({
  name: "John",
  email: "john@example.com"
});
```

The schema can validate the document before persistence reaches MongoDB.

This allows persistence-oriented validation rules to remain centralized.

Instead of duplicating structural validation across:

```text
controller
service
repository
background worker
GraphQL resolver
```

the schema can keep those rules close to the model's persistence boundary.

## Schema and Model Typing

A useful relationship is:

```text
Document Type
      ↓
AmbitenSchema<T>
      ↓
AmbitenModel<T>
```

For example:

```ts
interface User
  extends Document {
  name: string;
  email: string;
}

const userSchema =
  new AmbitenSchema<User>({
    name: "string",
    email: "string"
  });

const UserModel =
  new AmbitenModel<User>({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

This gives the model a consistent structural contract from schema definition through persistence operations.

## Middleware Registration

Schemas are a primary registration surface for model middleware.

For example:

```ts
userSchema.pre(
  "create",
  async (ctx) => {
    if (ctx.doc) {
      ctx.doc.createdAt =
        new Date();
    }
  }
);
```

Middleware can participate in concerns such as:

```text
validation
normalization
auditing
soft-delete behavior
policy checks
logging
instrumentation
operation shaping
result processing
```

The middleware is associated with schema/model execution rather than the host framework.

## Runtime-Aware Middleware

Middleware executes as part of the current model operation.

Conceptually:

```text
Effective ModelContext
      ↓
before middleware
      ↓
model operation
      ↓
after middleware
```

This means middleware can participate in runtime-aware behavior using the operation context made available by the model execution pipeline.

For example:

```ts
userSchema.post(
  "create",
  async (ctx) => {
    console.log(
      `Created in tenant ${ctx.tenantId}`
    );
  }
);
```

Here, `tenantId` belongs to the effective model operation context.

The schema did not resolve the tenant itself.

The path is:

```text
TenantResolver / Explicit Context
        ↓
AmbitenContext
        ↓
AmbitenModel.mergeCtx()
        ↓
ModelContext.tenantId
        ↓
Schema Middleware
```

That distinction keeps tenant identification outside schema behavior.

## Middleware and Transactions

The same principle applies to transactions.

When a transaction session is active:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Schema / Middleware / Operation
```

Schema middleware can therefore execute as part of the same model operation that participates in the transaction.

The schema does not create or commit the transaction.

The surrounding transaction boundary owns:

```text
session lifecycle
commit
rollback
```

The schema participates inside that boundary.

## Runtime Participation

<SignalFlow
  aria-label="Schema runtime participation flow"
  :items='[
    "AmbitenContext",
    "AmbitenModel",
    "AmbitenSchema",
    "Infrastructure Resolution",
    "MongoDB"
  ]'
/>

The detailed flow is:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema Validation
      ↓
Middleware
      ↓
Model Operation
      ↓
DbProvider / AmbitenClient
      ↓
MongoDB
```

The schema participates in model execution before, around, and where configured after persistence behavior.

It does not replace the model or infrastructure layers.

## Schema vs Model Responsibilities

`AmbitenSchema` and `AmbitenModel` are closely related but intentionally separate.

```text
AmbitenSchema
→ document structure
→ validation
→ middleware
→ persistence policy
→ lifecycle configuration

AmbitenModel
→ collection boundary
→ operation execution
→ effective context resolution
→ middleware orchestration
→ infrastructure coordination
```

The model binds schema behavior to the current operation.

The schema defines what behavior should apply.

## Collection Ownership

The schema does not own the MongoDB collection.

Collection ownership remains with `AmbitenModel`.

For example:

```ts
const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

Conceptually:

```text
AmbitenSchema
→ document and behavior contract

AmbitenModel
→ collection boundary
```

A supported `ModelContext.collectionName` override may influence the effective collection during execution, but that resolution remains part of the model operation rather than schema definition.

## Provider Independence

A schema does not resolve database infrastructure.

It does not need to know whether the model uses:

```text
a fixed AmbitenClient
a database-scoped provider
a tenant-scoped provider
MultiTenantManager
dynamic tenant infrastructure
```

The broader model path is:

```text
AmbitenSchema
      ↓
AmbitenModel Operation
      ↓
Effective ModelContext
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

This allows the same schema definition to remain usable across different infrastructure topologies.

## Tenant Independence

A schema should not be defined per request tenant merely because runtime infrastructure changes.

For example:

```text
tenant-a
      ↓
UserModel
      ↓
userSchema


tenant-b
      ↓
UserModel
      ↓
userSchema
```

The same schema can participate in both executions.

The difference belongs to:

```text
AmbitenContext
ModelContext
provider resolution
tenant infrastructure
```

not to the structural schema definition.

## Soft-Delete Operation Context

`ModelContext` also carries operation-oriented persistence controls such as:

```text
withDeleted
onlyDeleted
hardDelete
```

These values belong to the effective operation context rather than global schema mutation.

Conceptually:

```text
Model Operation
      ↓
Effective ModelContext
      ├── withDeleted
      ├── onlyDeleted
      └── hardDelete
      ↓
Schema / Model Policy
```

This allows operation-specific behavior to vary without redefining the schema.

## Lifecycle Policies

Schemas can define persistence-oriented lifecycle configuration.

For example:

```ts
schema.setGCConfig({
  ttlField: "createdAt",
  expiresIn: "30d",
  softDelete: true
});
```

This places lifecycle policy close to the data contract.

The important distinction is:

```text
Schema
→ declares lifecycle policy

Managed runtime / lifecycle services
→ execute or orchestrate that policy
```

The schema does not itself become the process-level garbage-collection runner.

This keeps definition and execution responsibilities separate.

## Garbage Collection Relationship

Conceptually:

```text
AmbitenSchema
      ↓
GC / TTL configuration
      ↓
Runtime lifecycle infrastructure
      ↓
cleanup behavior
```

This is consistent with Ambiten's wider architecture:

```text
definition
→ stable

runtime execution
→ dynamic
```

The schema declares what the persistence lifecycle should mean.

The runtime manages when and how lifecycle services execute.

## Static Definition, Dynamic Execution

A schema is defined once:

```ts
const userSchema =
  new AmbitenSchema({
    name: "string",
    email: "string"
  });
```

But it can participate in many independent executions.

```text
Schema Definition
      │
      ├── Request A
      │     tenant-a
      │
      ├── Request B
      │     tenant-b
      │
      ├── Worker C
      │     transaction
      │
      └── Job D
            explicit database
```

The schema does not need to be recreated for each execution.

> **Static definition. Dynamic execution.**

## Concurrent Execution

One schema and model definition may be used concurrently by multiple operations.

```text
Execution A
tenantId = tenant-a
      ↓
Effective ModelContext A
      ↓
userSchema


Execution B
tenantId = tenant-b
      ↓
Effective ModelContext B
      ↓
userSchema
```

The shared schema definition remains static.

Execution-specific state remains in the operation context.

This is why request or tenant state should not be stored as mutable state directly on shared schema objects.

## Framework Independence

A schema should not depend on framework-specific request types.

Avoid coupling schema behavior directly to:

```text
Express Request
Fastify Request
NestJS ExecutionContext
GraphQL resolver context
Lambda event
```

Instead:

```text
Framework
      ↓
Execution Boundary
      ↓
AmbitenContext
      ↓
ModelContext
      ↓
Schema / Middleware
```

This allows the same schema to participate behind different adapters and execution environments.

## Recommended Design Approach

Schemas should remain focused on persistence-oriented structure and behavior.

Good schema concerns include:

```text
field definitions
validation
normalization
middleware
soft-delete policy
lifecycle configuration
audit enrichment
persistence-oriented policy
```

Concerns that should generally remain outside schemas include:

```text
HTTP routing
controller behavior
application workflow orchestration
authentication flow
tenant discovery
MongoClient creation
database connection lifecycle
external service orchestration
```

Keeping those boundaries explicit prevents the schema layer from becoming an application service layer.

## Middleware Design

Schema middleware should generally remain:

```text
small
focused
composable
deterministic
operation-oriented
```

Middleware is especially useful for behavior that should consistently surround persistence operations regardless of where the operation originated.

For example:

```text
Express
Fastify
GraphQL
NestJS
Lambda
Worker
      ↓
same model
      ↓
same schema middleware
```

The host environment changes.

The persistence policy does not.

## Relationship with AmbitenModel

<SignalFlow
  aria-label="Schema and model relationship"
  :items='[
    "AmbitenSchema",
    "AmbitenModel"
  ]'
/>

The relationship can be summarized as:

```text
AmbitenSchema
→ defines structure and persistence behavior

AmbitenModel
→ executes operations using that definition
```

At runtime:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
AmbitenSchema behavior
      ↓
Model operation
```

The schema defines policy.

The model binds that policy to an execution.

## Relationship with AmbitenClient

The schema does not talk directly to MongoDB infrastructure as its primary responsibility.

The normal model path remains:

```text
AmbitenSchema
      ↓
AmbitenModel
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

`AmbitenClient` provides database, client, and session capability.

`AmbitenSchema` defines structural and behavioral persistence rules.

The model connects those layers during an operation.

## What AmbitenSchema Does Not Own

`AmbitenSchema` does not own:

```text
request ingress
execution-boundary creation
AmbitenContext lifecycle
tenant identification
tenant authorization
dynamic tenant discovery
MongoClient lifecycle
database routing
collection ownership
transaction commit / rollback
application workflows
```

Those responsibilities belong to other runtime layers.

## Mental Model

The complete mental model is:

```text
AmbitenContext
= execution state

AmbitenModel
= operation coordinator and context binder

ModelContext
= effective model-operation state

AmbitenSchema
= document + persistence behavior contract

DbProvider
= database/client/session contract

AmbitenClient
= MongoDB infrastructure capability

MongoDB
= persistence
```

Or more compactly:

```text
Schema defines structure and persistence policy.

Model binds that policy to execution.

ModelContext carries operation state.

Client provides infrastructure.

MongoDB performs persistence.
```

## Design Principles

<AmbitenSchemaPrinciples />

These principles allow schema definitions to remain stable while their behavior participates in request-aware, tenant-aware, transaction-aware, and middleware-driven model execution.

## Summary

`AmbitenSchema` defines the structural and behavioral persistence contract used by `AmbitenModel`.

It can define:

- document structure,
- TypeScript relationships,
- validation,
- middleware,
- normalization,
- soft-delete policy,
- lifecycle configuration,
- persistence-oriented runtime behavior.

It participates in execution through the effective `ModelContext` resolved by `AmbitenModel`.

The runtime path is:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
AmbitenSchema / Middleware
      ↓
Model Operation
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

The architectural distinction is:

> **`AmbitenContext` carries execution state. `AmbitenModel` binds that state to an operation. `AmbitenSchema` defines the persistence behavior that participates in that operation.**

The schema remains static.

The execution around it changes dynamically.

> **Static definition. Dynamic execution.**

## Related Pages

- [AmbitenModel](/models/ambiten-model)
- [Defining Models](/models/defining-models)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [Middleware](/core/middleware)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [AmbitenClient](/reference/api/ambiten-client)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Architecture](/architecture/whitepaper)