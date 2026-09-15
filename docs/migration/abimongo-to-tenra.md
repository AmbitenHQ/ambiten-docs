# Migrating from Abimongo to Ambiten

Ambiten is the evolution of Abimongo.

Abimongo began as a MongoDB ODM and data-access abstraction. Ambiten continues that foundation while expanding the execution model around context, multi-tenancy, transactions, middleware, providers, adapters, and runtime infrastructure.

Migration is therefore mostly about package identity, runtime structure, and execution behavior rather than rebuilding MongoDB data.

<DocOverviewCards
  eyebrow="Platform Evolution"
  title="Move from ODM-oriented infrastructure to a runtime-driven execution model."
  description="Migration can preserve existing MongoDB data while moving execution state, tenant resolution, transactions, providers, adapters, and instrumentation into clearer runtime boundaries."
  accent="#d38a49"
  :signals='[
    "Package migration",
    "Runtime context",
    "Transactions",
    "Adapters",
    "Instrumentation"
  ]'
  :cards='[
    {
      "label": "Preserve",
      "title": "Keep existing MongoDB data",
      "text": "Collections, indexes, and documents can usually remain unchanged while the application runtime is migrated."
    },
    {
      "label": "Evolve",
      "title": "Move from ODM behavior to runtime execution",
      "text": "Context, transaction sessions, tenant infrastructure, middleware, and provider resolution become explicit runtime concerns."
    },
    {
      "label": "Adopt",
      "title": "Migrate incrementally",
      "text": "Applications can move package imports, runtime setup, models, and execution boundaries progressively instead of rewriting the entire system at once."
    }
  ]'
  :flow='[
    {
      "label": "Step 1",
      "title": "Replace packages"
    },
    {
      "label": "Step 2",
      "title": "Update runtime setup"
    },
    {
      "label": "Step 3",
      "title": "Establish execution context"
    },
    {
      "label": "Step 4",
      "title": "Adopt runtime features"
    }
  ]'
/>

## What changed

The most visible change is the platform identity.

```text
Abimongo
   ↓
Ambiten
```

The architectural model also expanded.

Abimongo focused primarily on ODM-style modeling and MongoDB access.

Ambiten extends that foundation into a runtime architecture built around:

- execution-scoped context
- model-level context binding
- multi-tenant infrastructure resolution
- transaction session propagation
- middleware lifecycle behavior
- providers
- instrumentation
- framework adapters
- reusable runtime infrastructure

The current model can be summarized as:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

The original `@abimongo/*` packages remain part of the project's history.

Current development continues under the `@ambiten/*` namespace.

## What usually does not change

Migration does not normally require rebuilding MongoDB data.

Existing:

```text
collections
documents
indexes
document identifiers
stored application data
```

can usually remain intact.

The migration mainly affects:

```text
package imports
runtime initialization
client/provider setup
context propagation
tenant infrastructure
transaction orchestration
adapter integration
instrumentation
naming
```

Connection strategy may remain similar for simple applications, but applications adopting multi-tenant infrastructure or scoped providers may intentionally change how MongoDB clients and databases are resolved.

## Package migration

Remove legacy Abimongo packages and install their Ambiten equivalents.

Core:

```bash
pnpm remove @abimongo/core
pnpm add @ambiten/core
```

Logger:

```bash
pnpm remove @abimongo/logger
pnpm add @ambiten/logger
```

Framework adapters now use dedicated adapter packages:

```bash
pnpm add @ambiten/adapter-express
pnpm add @ambiten/adapter-fastify
pnpm add @ambiten/adapter-graphql
pnpm add @ambiten/adapter-nestjs
pnpm add @ambiten/adapter-lambda
```

Internal adapter infrastructure is available through:

```text
@ambiten/adapter-runtime
@ambiten/adapter-types
```

These packages normally support framework adapter implementations rather than ordinary application imports.

## Import migration

Update imports from the Abimongo namespace to Ambiten.

```diff
- import {
-   AbimongoModel,
-   AbimongoSchema
- } from "@abimongo/core";

+ import {
+   AmbitenModel,
+   AmbitenSchema
+ } from "@ambiten/core";
```

If the application had already adopted Ambiten-style class names before moving package namespaces, the change may be smaller:

```diff
- import {
-   AmbitenModel,
-   AmbitenSchema
- } from "@abimongo/core";

+ import {
+   AmbitenModel,
+   AmbitenSchema
+ } from "@ambiten/core";
```

Logger imports should move as well:

```diff
- import {
-   logger
- } from "@abimongo/logger";

+ import {
+   logger
+ } from "@ambiten/logger";
```

Adapter imports must use their current package names.

```diff
- import {
-   createExpressAdapter
- } from "@ambiten/express";

+ import {
+   createExpressAdapter
+ } from "@ambiten/adapter-express";
```

The same pattern applies to Fastify, GraphQL, NestJS, and Lambda adapters.

## Naming migration

Replace remaining Abimongo class names with their Ambiten equivalents where those legacy names still exist.

```diff
- AbimongoClient
+ AmbitenClient
```

```diff
- AbimongoContext
+ AmbitenContext
```

```diff
- AbimongoModel
+ AmbitenModel
```

```diff
- AbimongoSchema
+ AmbitenSchema
```

Projects that were already using Ambiten-style names internally may only need package and configuration migration.

## Configuration migration

Where the application uses a file-based Ambiten configuration, use the Ambiten naming consistently.

```diff
- abimongo.config.json
+ ambiten.config.json
```

Do not assume that every legacy Abimongo configuration field maps one-to-one to Ambiten.

Review runtime configuration around:

```text
MongoDB
models
schema
multi-tenancy
Redis
logging
GraphQL
runtime services
providers
```

because Ambiten separates process-level infrastructure from execution-level state more explicitly.

Conceptually:

```text
PROCESS LIFETIME

AmbitenRuntime
AmbitenClient
MongoClient
MultiTenantManager
providers
runtime configuration
```

while:

```text
EXECUTION LIFETIME

AmbitenContext
tenantId
requestId
dbName
collectionName
session
logger metadata
runtime metadata
```

## Runtime setup migration

Older Abimongo applications often centered on direct client or model access.

That remains valid in Ambiten.

A small application can start directly with:

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

For example:

```ts
import {
  AmbitenClient,
  AmbitenModel,
  AmbitenSchema
} from "@ambiten/core";

interface User {
  name: string;
  email: string;
}

const userSchema =
  new AmbitenSchema<User>({
    name: String,
    email: String
  });

const client =
  new AmbitenClient({
    uri:
      process.env.MONGODB_URI,

    options: {
      dbName: "my-app"
    }
  });

await client.connect();

const UserModel =
  new AmbitenModel<User>({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

This direct usage remains a first-class Ambiten execution model.

Applications can then add more runtime structure as requirements grow.

```text
AmbitenClient
      ↓
AmbitenContext
      ↓
AmbitenSchema + AmbitenModel
      ↓
Framework Adapters
      ↓
Multi-Tenant Runtime
      ↓
Transactions / Instrumentation
```

## Bootstrap migration

For applications using Ambiten-managed runtime infrastructure, initialize the process-level runtime through `AmbitenBootstrapFactory`.

```ts
import {
  AmbitenBootstrapFactory
} from "@ambiten/core";

const runtime =
  await AmbitenBootstrapFactory.create({
    config:
      "./ambiten.config.json"
  });
```

Bootstrap prepares process-level infrastructure.

It should not be confused with the execution boundary created by a framework adapter.

The responsibilities are different:

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

Adapter
→ establishes framework execution ingress

AmbitenContext
→ carries execution-scoped state
```

## Express adapter migration

For Express applications, use the current adapter package:

```ts
import express from "express";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

const app = express();

const adapter =
  createExpressAdapter();
```

Install the adapter around downstream application execution according to the application's tenancy and runtime requirements.

For example:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

The adapter establishes the execution boundary.

Conceptually:

```text
HTTP Request
      ↓
Express Adapter
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Application Handler
```

The adapter does not replace authentication or authorization.

## Migrating tenant handling

Older applications may pass tenant identity explicitly through multiple service layers.

Before:

```ts
await UserService.create(
  data,
  tenantId
);
```

Ambiten allows tenant identity to become part of the execution state instead:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a"
  },
  async () => {
    await UserModel.create(
      data
    );
  }
);
```

The model then derives the persistence-facing operation context through:

```text
explicit ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

Tenant identity can therefore move from application method signatures into the runtime boundary.

## Migrating tenant infrastructure

Tenant identity and tenant infrastructure should remain separate.

```text
Who is this execution for?
→ TenantResolver

Carry tenant identity
→ AmbitenContext

Where does the tenant live?
→ TenantConfigResolver /
  MultiTenantManager

Give me the MongoClient
→ TenantClientResolver /
  MultiTenantManager
```

If an Abimongo application previously selected tenant databases manually:

```ts
const db =
  client.db(
    tenant.databaseName
  );
```

that responsibility can move into Ambiten's tenant infrastructure instead.

The application can then operate through the model:

```ts
await UserModel.create(
  data
);
```

while the provider path resolves the MongoDB resources associated with the active tenant.

Tenant-aware execution should not be confused with authorization.

```text
Authentication
→ who the caller is

Tenant Resolution
→ which tenant the execution is for

Authorization
→ whether the caller may act for that tenant
```

## Migrating model context

One important architectural difference is the distinction between `AmbitenContext` and `ModelContext`.

`AmbitenContext` carries the full execution state.

```text
tenantId
requestId
dbName
collectionName
session
loggerMeta
logger
debug
meta
observer
budget
```

`ModelContext` carries the persistence-facing state needed by a model operation.

```text
tenantId
requestId
dbName
db
collectionName
config
session
withDeleted
onlyDeleted
hardDelete
```

During model execution:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Provider
```

`ModelContext` is not a second competing runtime context.

It is the operation-facing context used by the model and persistence path.

## Migrating explicit operation state

Some legacy workflows may already pass database or session state directly into model methods.

Ambiten still supports explicit operation context when required.

```ts
await UserModel.create(
  data,
  {
    tenantId: "tenant-a"
  }
);
```

The normal precedence is:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

Use explicit context for controlled overrides.

Use `AmbitenContext` when the state belongs to the wider execution.

## Migrating transactions

Legacy applications may manually pass a MongoDB session through each model call.

Before:

```ts
await UserModel.create(
  user,
  {
    session
  }
);

await AuditModel.create(
  log,
  {
    session
  }
);
```

Ambiten can carry the active session through the execution context:

```ts
import {
  AmbitenContext
} from "@ambiten/core";

await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(
      user
    );

    await AuditModel.create(
      log
    );
  }
);
```

The transaction path becomes:

```text
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Participating Operations
```

The enclosing transaction boundary owns:

```text
start
commit
rollback
completion
```

Individual models participate in the transaction but do not own transaction completion.

This propagation applies to participating Ambiten operations using compatible transaction-aware infrastructure.

It does not automatically make unrelated external side effects transactional.

## Adapter-managed transactions

Framework adapters can also establish execution-wide transaction boundaries where supported.

```ts
enableTransactions: true
```

This is an alternative to an explicit:

```ts
AmbitenContext.withTransaction(...)
```

boundary.

The two patterns are:

```text
Adapter-managed transaction
```

or:

```text
Explicit workflow transaction
```

They are not two transaction layers that every application must combine.

## Migrating middleware

Middleware remains close to the schema and model persistence boundary.

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

Middleware receives the operation state associated with the model execution.

The model binds runtime state before schema and middleware behavior participates.

Conceptually:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema / Middleware
```

This is more precise than treating the schema as an independent ambient context reader.

## Migrating instrumentation

Legacy applications may scatter logging around model calls.

Before:

```ts
console.log(
  "Creating user"
);

await UserModel.create(
  data
);
```

Ambiten can instead expose structured execution information to instrumentation.

For example:

```ts
await measureQuery(
  {
    operation:
      "create",

    collectionName:
      "users",

    extra: {
      feature:
        "user.create"
    }
  },

  async () => {
    return UserModel.create(
      data
    );
  }
);
```

Runtime metadata can include values such as:

```text
tenantId
requestId
dbName
loggerMeta
debug
meta
observer
budget
```

Ambiten provides the execution metadata boundary.

The logging, tracing, metrics, or telemetry backend remains responsible for transporting and storing those signals.

Instrumentation should not be interpreted as automatic distributed tracing or guaranteed telemetry delivery.

## Migrating soft-delete behavior

If an Abimongo application already implements soft deletion manually, Ambiten model operations can centralize lifecycle controls through `ModelContext`.

Relevant operation controls include:

```text
withDeleted
onlyDeleted
hardDelete
```

For example:

```ts
await UserModel.find(
  {},
  {
    withDeleted: true
  }
);
```

or:

```ts
await UserModel.deleteOne(
  {
    _id: userId
  },
  {
    hardDelete: true
  }
);
```

The exact lifecycle behavior still depends on the model and schema configuration.

Soft delete should not be treated as automatic unless it has been configured.

## Recommended migration order

Migration should remain incremental.

```text
1. Replace @abimongo/* package dependencies

2. Update imports and class names

3. Update adapter package names

4. Rename configuration files

5. Establish AmbitenClient / provider infrastructure

6. Migrate schemas and models

7. Introduce AmbitenContext at execution boundaries

8. Move tenant identity into runtime context

9. Configure tenant infrastructure where required

10. Replace manual session propagation with transaction boundaries

11. Migrate middleware and lifecycle behavior

12. Introduce instrumentation

13. Remove remaining Abimongo naming

14. Validate package boundaries and runtime behavior
```

This order allows the application to remain usable throughout the migration.

## Validate each migration stage

Do not treat a successful TypeScript build as proof that the migration is complete.

After each stage, verify behavior such as:

```text
model creation
database resolution
tenant resolution
context propagation
middleware execution
transaction participation
soft-delete behavior
ESM / CommonJS consumption
framework adapter execution
shutdown behavior
```

For multi-tenant applications, also verify:

```text
tenant A cannot accidentally use tenant B infrastructure
tenant discovery works
lazy tenant activation works
tenant-specific database resolution is correct
```

Security isolation still depends on the application's topology and authorization model.

## Common migration mistakes

A common mistake is keeping `@abimongo/*` and `@ambiten/*` runtime packages active together for too long.

That can create:

```text
duplicate runtime instances
different context stores
type incompatibilities
different provider behavior
inconsistent transaction state
```

Another mistake is changing imports without changing execution structure.

For example:

```text
package rename
≠
runtime migration
```

A successful migration should also verify:

```text
where execution begins
where context is established
how ModelContext is derived
how tenant infrastructure is resolved
who owns transaction completion
how middleware participates
how MongoDB resources are reused
```

Another mistake is recreating MongoDB clients or models for every request.

Prefer reusable process-level infrastructure:

```text
AmbitenClient
MongoClient
models
schemas
providers
MultiTenantManager
```

and execution-specific state through:

```text
AmbitenContext
```

## Before and after

A simplified Abimongo-style architecture may look like:

```text
Application
      ↓
ODM / Model
      ↓
MongoDB
```

An Ambiten application can progressively become:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

Not every application needs every layer.

Direct `AmbitenClient` usage remains supported.

The architecture can be adopted progressively as requirements increase.

## Mental model

```text
Abimongo

ODM-oriented data access
      ↓
MongoDB
```

becomes:

```text
Ambiten

Execution Boundary
      ↓
Context
      ↓
Model Operation
      ↓
Infrastructure Resolution
      ↓
MongoDB
```

The important architectural shift is not simply a package rename.

It is the separation between:

```text
execution state
operation state
application behavior
persistence behavior
tenant infrastructure
MongoDB capability
```

## Summary

Migrating from Abimongo to Ambiten is a transition from an ODM-focused architecture toward an execution-aware runtime model.

Existing MongoDB data can usually remain unchanged while package identity, context propagation, model execution, tenant infrastructure, transaction handling, middleware, and instrumentation move into clearer runtime boundaries.

The central migration model is:

```text
Abimongo
      ↓
Replace packages
      ↓
Establish Ambiten runtime infrastructure
      ↓
Introduce AmbitenContext
      ↓
Bind execution through AmbitenModel
      ↓
Resolve Effective ModelContext
      ↓
Resolve infrastructure
      ↓
MongoDB
```

Abimongo remains the historical foundation.

Ambiten is the runtime platform that evolved from it.