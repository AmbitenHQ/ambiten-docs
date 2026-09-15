---
title: Provider Contract
description: Understand how AmbitenModel resolves databases, MongoDB clients, and transaction sessions through the DbProvider contract.
---

# Provider Contract

The provider contract defines how `AmbitenModel` obtains the database infrastructure required to execute an operation.

A provider is any initialized object that implements the `DbProvider` interface.

In most Ambiten applications, the provider is an `AmbitenClient` or a scoped provider derived from it through helpers such as:

```text
withTenant(...)
withDatabase(...)
withScope(...)
```

The contract deliberately separates:

```text
what operation should execute
```

from:

```text
which database infrastructure should execute it
```

This allows models to remain structurally stable while database, tenant, and transaction state can vary at runtime.

The provider does **not** own collection definition.

Collection ownership remains with `AmbitenModel`, using its configured `collectionName` or a supported `ModelContext.collectionName` override.

<DocOverviewCards
  eyebrow="Infrastructure Boundary"
  title="Providers resolve infrastructure; models coordinate operations."
  description="The provider contract gives AmbitenModel a stable way to obtain databases, MongoDB clients, and sessions while allowing AmbitenClient to remain useful both directly and inside the higher-level model runtime."
  accent="#6d5dfc"
  :signals='[
    "Database resolution",
    "Client access",
    "Session support",
    "Runtime context",
    "Scoped infrastructure"
  ]'
  :cards='[
    {
      "label": "Separation",
      "title": "Infrastructure stays outside model behavior",
      "text": "Models retain ownership of operations, collection behavior, schema participation, and middleware while providers supply database, client, and session infrastructure."
    },
    {
      "label": "Context-Aware",
      "title": "Resolution can adapt to execution state",
      "text": "ModelContext and Ambiten runtime context allow tenant identity, database overrides, and transaction state to influence infrastructure without redefining the model."
    },
    {
      "label": "Progressive",
      "title": "The same client supports simple and advanced usage",
      "text": "AmbitenClient can be used directly through context-aware APIs or supplied as a DbProvider beneath AmbitenModel for schema-bound runtime execution."
    }
  ]'
  :flow='[
    {
      "label": "Model",
      "title": "Requests infrastructure"
    },
    {
      "label": "Provider",
      "title": "Resolves Db / client / session"
    },
    {
      "label": "Client",
      "title": "Provides MongoDB capability"
    },
    {
      "label": "MongoDB",
      "title": "Executes persistence"
    }
  ]'
/>

## Core Responsibility

The provider exists to resolve infrastructure.

It does not own model behavior.

During model execution, a provider can supply:

```text
database access
MongoDB client access
transaction session creation
runtime-specific database selection
scoped infrastructure
```

The model remains responsible for concerns such as:

```text
collection selection
schema behavior
middleware
operation coordination
query execution
result processing
```

Conceptually:

```text
AmbitenModel
      ↓
DbProvider
      ↓
database / client / session
      ↓
MongoDB
```

This separation is one of the central boundaries in Ambiten's model runtime.

## Contract Shape

The provider contract is intentionally small:

```ts
export interface DbProvider {
  db(
    ctx?: ModelContext
  ): Promise<Db>;

  client?(
    ctx?: ModelContext
  ): Promise<MongoClient>;

  startSession?(
    ctx?: ModelContext
  ): Promise<ClientSession>;
}
```

The three capabilities answer different questions.

```text
db(ctx?)
→ Which MongoDB database should this operation use?

client(ctx?)
→ Which MongoDB client owns that infrastructure?

startSession(ctx?)
→ How can a session be created for transactional execution?
```

A provider does not need to expose application-specific business behavior.

Its responsibility is infrastructure resolution.

## Why the Contract Is Small

A narrow contract makes provider implementations easy to reason about.

`AmbitenModel` does not need to know whether the underlying provider represents:

```text
one fixed database
a context-aware AmbitenClient
a tenant-scoped client
a database-scoped provider
a custom runtime provider
```

It only needs the infrastructure capabilities defined by `DbProvider`.

This keeps the model API independent from infrastructure topology.

## ModelContext

`ModelContext` gives provider resolution operation-specific information.

Conceptually, it may carry runtime state such as:

```text
tenantId
dbName
collectionName
session
request metadata
runtime metadata
```

For example:

```ts
const db =
  await provider.db({
    tenantId: "tenant-a",
    dbName: "tenant_a_db"
  });
```

This does not mean application code should normally build `ModelContext` manually for every model operation.

In ordinary runtime-aware execution, `AmbitenModel` resolves its effective context and passes the relevant state into the provider layer.

## Context Resolution Before the Provider

The provider is not responsible for discovering the original request identity.

The execution path is conceptually:

```text
TenantResolver / Explicit Context
        ↓
AmbitenContext
        ↓
AmbitenModel
        ↓
Effective ModelContext
        ↓
DbProvider
```

This distinction matters.

```text
TenantResolver
→ Who is the execution for?

AmbitenContext
→ What runtime state belongs to it?

AmbitenModel
→ What effective state applies to this operation?

DbProvider
→ What database infrastructure satisfies that state?
```

The provider consumes resolved execution information.

It does not inspect Express, Fastify, NestJS, GraphQL, or Lambda requests to identify the caller's tenant.

## How Models Use Providers

A model receives an initialized provider during definition.

For example:

```ts
const client =
  new AmbitenClient({
    uri: process.env.MONGODB_URI,

    options: {
      dbName: "pdf-saas"
    }
  });

await client.connect();

const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

The model definition establishes a stable provider relationship.

When an operation later executes:

```ts
await UserModel.find({});
```

the model can request infrastructure using its effective context.

Conceptually:

```ts
const db =
  await provider.db(ctx);

const collection =
  db.collection(
    ctx.collectionName ??
      modelCollectionName
  );
```

The division remains:

```text
Provider
→ database / client / session

Model
→ collection / operation / middleware
```

## Collection Ownership

The provider does not resolve the model's collection boundary.

That remains the model's responsibility.

For example:

```ts
const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

During execution:

```text
Provider
→ database

AmbitenModel
→ users collection
```

If a supported runtime override supplies:

```ts
ctx.collectionName
```

the model can incorporate that override during effective collection resolution.

Keeping collection ownership in the model prevents the provider contract from becoming coupled to individual model definitions.

## Separation of Responsibilities

The architectural boundary can be summarized as:

```text
Model
→ operation + collection behavior

Provider
→ database + client + session resolution

AmbitenClient
→ context-aware MongoDB capability

MongoDB
→ persistence
```

For tenant-aware model execution, another runtime layer may participate:

```text
AmbitenContext
      ↓
AmbitenModel
      ↓
DbProvider / MultiTenantManager
      ↓
AmbitenClient
      ↓
MongoDB
```

The exact path depends on the configured execution and provider strategy.

## AmbitenClient as the Default Provider

`AmbitenClient` is the primary `DbProvider` implementation used by Ambiten.

It can satisfy the provider contract through capabilities corresponding to:

```text
db(...)
client(...)
startSession(...)
```

while also providing its own static and instance-level context-aware execution APIs.

This gives `AmbitenClient` two important roles.

### Provider Role

Used beneath `AmbitenModel`:

```text
AmbitenModel
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

### Direct Runtime Role

Used directly:

```text
AmbitenContext
      ↓
AmbitenClient
      ↓
MongoDB
```

The direct path is particularly useful for:

```text
tutorials
educational examples
YouTube demonstrations
scripts
small applications
manual workflows
gradual Ambiten adoption
```

Using `AmbitenClient` directly is not a lesser or invalid form of Ambiten usage.

It is one of the runtime's intended execution surfaces.

## Progressive Usage

Ambiten can therefore be introduced progressively.

A beginner may start with:

```text
AmbitenClient
      ↓
MongoDB
```

then introduce execution context:

```text
AmbitenContext
      ↓
AmbitenClient
      ↓
MongoDB
```

and later move toward structured model execution:

```text
AmbitenContext
      ↓
AmbitenModel
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

More advanced applications can add:

```text
framework adapters
MultiTenantManager
dynamic tenants
transactions
middleware
instrumentation
```

without changing the basic infrastructure contract.

## Context-Aware AmbitenClient

When used directly, `AmbitenClient` can leverage the active `AmbitenContext` through its context-aware static and instance methods.

Conceptually:

```ts
await AmbitenContext.run(
  {
    dbName: "app_db"
  },

  async () => {
    // context-aware AmbitenClient usage
  }
);
```

The important principle is:

```text
explicit execution context
      ↓
AmbitenClient
      ↓
context-aware database access
```

This gives users access to Ambiten's execution model without requiring them to define an `AmbitenModel` first.

## Provider Use Inside the Model Runtime

When `AmbitenClient` is supplied as a provider to `AmbitenModel`, the model becomes responsible for the operation lifecycle.

```text
AmbitenContext
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
AmbitenClient as DbProvider
      ↓
MongoDB
```

In this mode, the model adds capabilities such as:

```text
schema behavior
middleware
collection ownership
effective context resolution
operation coordination
result processing
```

while the provider remains focused on infrastructure.

## Static Infrastructure

A simple application can use a provider connected to one stable database boundary.

```ts
const client =
  await createAppClient();

const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

Conceptually:

```text
UserModel
      ↓
AmbitenClient
      ↓
app database
```

This pattern is completely valid.

An application does not need multi-tenancy or dynamic infrastructure to benefit from `AmbitenModel`.

## Database-Scoped Providers

A provider can intentionally represent a known database boundary.

Conceptually:

```ts
const provider =
  client.withDatabase(
    "analytics"
  );
```

The resulting provider can then be used by a model whose operations should resolve through that database scope.

```text
AmbitenModel
      ↓
database-scoped provider
      ↓
analytics
```

This can be useful for applications with intentionally separated databases even when multi-tenancy is not involved.

## Tenant-Scoped Providers

A provider can also intentionally represent a tenant scope.

For example:

```ts
const tenantProvider =
  client.withTenant(
    "tenant-a"
  );

const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: tenantProvider
  });
```

Conceptually:

```text
UserModel
      ↓
tenant-scoped provider
      ↓
tenant-a infrastructure
```

This can be useful for:

```text
background jobs
maintenance operations
controlled tenant workflows
scripts
dedicated tenant processes
```

It represents an explicitly chosen infrastructure scope.

It should not be confused with resolving a tenant from an incoming request.

## Scoped Providers

More complex execution can use a broader scoped provider where supported:

```ts
const provider =
  client.withScope(...);
```

The purpose of scoped providers is to intentionally bind part of the infrastructure resolution strategy before an operation executes.

Conceptually:

```text
Base AmbitenClient
      ↓
Scope Helper
      ↓
Scoped DbProvider
      ↓
AmbitenModel
```

Scoped providers are useful when explicit infrastructure selection is clearer than ambient request-driven resolution.

## Runtime-Aware Providers

A model provider can also participate in runtime-aware execution.

For example:

```text
Request
   ↓
AmbitenContext
   ↓
UserModel
   ↓
effective ModelContext
   ↓
provider
```

The provider can resolve infrastructure based on the current execution state without requiring the model definition itself to change.

This allows one model definition to participate across:

```text
different requests
different databases
different tenants
different transactions
workers
serverless execution
```

## Tenant-Aware Infrastructure

When tenant identity is part of the effective execution context, provider resolution may participate in Ambiten's multi-tenant runtime.

Conceptually:

```text
AmbitenContext
tenantId = tenant5
      ↓
AmbitenModel
      ↓
DbProvider
      ↓
tenant-aware infrastructure
```

Where `MultiTenantManager` participates, the broader path becomes:

```text
tenantId
   ↓
MultiTenantManager
   ↓
TenantConfig
   ↓
tenant client
   ↓
database
```

The provider contract does not itself define the tenant registry or dynamic tenant discovery policy.

Those belong to the multi-tenant runtime.

## Dynamic Tenants

If a tenant has not yet been registered, tenant infrastructure may first be discovered through `MultiTenantManager` and `TenantConfigResolver`.

Conceptually:

```text
tenant5
   ↓
resolveTenant()
   ↓
not registered
   ↓
TenantConfigResolver
   ↓
register tenant
   ↓
getClient()
   ↓
database
```

The model still sees the same provider contract.

That is one of the advantages of separating the contract from the implementation behind it.

## Transaction Sessions

The optional `startSession(...)` capability allows transaction-aware infrastructure to remain behind the provider abstraction.

```ts
const session =
  await provider.startSession?.(
    ctx
  );
```

When Ambiten establishes a transaction boundary, the active session can then become part of the execution context used by participating operations.

Conceptually:

```text
DbProvider
      ↓
startSession()
      ↓
ClientSession
      ↓
AmbitenContext
      ↓
Model A
      ↓
Model B
```

The session belongs to the transaction boundary.

Models participate in that session without needing to construct it themselves.

## Active Session Resolution

Once a transaction session is part of the effective context, ordinary model operations should use that runtime state instead of creating independent sessions for every operation.

```text
Transaction Boundary
      ↓
session S1
      ↓
UserModel
      ↓
AuditModel
```

The provider contract makes session capability available.

The transaction runtime determines when that session should be created and used.

## Provider Contract and Effective Context

The model's effective context is resolved before provider access.

The general precedence remains:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

The provider then receives the resulting operation context.

```text
AmbitenModel
      ↓
Effective ModelContext
      ↓
DbProvider
```

This prevents providers from having to reconstruct model-specific precedence rules independently.

## Direct Client Usage vs Provider Usage

These two paths should be understood separately.

### Direct Usage

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

or:

```text
AmbitenContext
      ↓
AmbitenClient
      ↓
MongoDB
```

This is ideal when direct database access is sufficient.

### Model Usage

```text
Application
      ↓
AmbitenModel
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

This adds the model runtime around the same underlying infrastructure capabilities.

The provider contract is what allows these approaches to coexist cleanly.

## Custom Provider Implementations

Because the model depends on `DbProvider` rather than one hard-coded client implementation, applications can provide another implementation when necessary.

A custom provider must satisfy the relevant contract:

```ts
export interface DbProvider {
  db(
    ctx?: ModelContext
  ): Promise<Db>;

  client?(
    ctx?: ModelContext
  ): Promise<MongoClient>;

  startSession?(
    ctx?: ModelContext
  ): Promise<ClientSession>;
}
```

The mandatory capability is:

```text
db(...)
```

while:

```text
client(...)
startSession(...)
```

are optional capabilities.

A custom provider should preserve the responsibility boundary:

```text
resolve infrastructure
```

rather than absorbing schema, query, or application orchestration behavior.

## Why the Provider Contract Exists

Without a provider boundary, models would need to know too much about infrastructure.

They could become responsible for:

```text
MongoClient construction
database switching
tenant routing
session creation
connection lifecycle
runtime infrastructure policy
```

That would make model definitions harder to reuse and more tightly coupled to one deployment topology.

The provider contract instead allows:

```text
stable model
+
dynamic infrastructure
```

without collapsing both responsibilities into the same object.

## What the Provider Does Not Own

A provider does not own:

```text
collection schema
model middleware
query semantics
business workflows
HTTP request handling
tenant authentication
tenant authorization
application routing
```

It also does not define the original execution boundary.

Those concerns belong elsewhere in the runtime.

## Common Anti-Patterns

### Creating a New Client Per Model Operation

Avoid treating `DbProvider` as a signal to create new infrastructure for every call.

Runtime clients are usually long-lived resources.

Execution state is short-lived.

```text
MongoDB client
→ reusable infrastructure

ModelContext
→ execution-specific state
```

### Putting Collection Logic in the Provider

Avoid requiring a provider to understand every model's collection.

The provider returns the database boundary.

The model resolves its collection.

### Resolving Request Identity Inside the Provider

Avoid passing framework request objects into the provider solely to determine the tenant.

Prefer:

```text
request
   ↓
TenantResolver
   ↓
AmbitenContext
   ↓
ModelContext
   ↓
Provider
```

### Treating Direct AmbitenClient Usage as an Anti-Pattern

Direct client usage is supported.

The model layer should be introduced when its additional structure is useful, not because direct context-aware database access is considered incorrect.

## Runtime Relationship

<SignalFlow
  aria-label="Provider contract runtime relationship"
  :items='[
    "AmbitenModel",
    "DbProvider",
    "AmbitenClient",
    "MongoDB"
  ]'
/>

For the model path:

```text
AmbitenContext
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

For direct context-aware usage:

```text
AmbitenContext
      ↓
AmbitenClient
      ↓
MongoDB
```

Both use the same underlying principle:

```text
execution state
+
database capability
```

without requiring infrastructure state to leak through application APIs.

## Mental Model

```text
Model
= operation + collection boundary

Provider
= database + client + session contract

AmbitenClient
= context-aware MongoDB execution surface
  and default provider implementation

MultiTenantManager
= tenant infrastructure ownership

MongoDB
= persistence
```

Or more compactly:

```text
Model asks where.

Provider answers with infrastructure.

AmbitenClient can answer directly
or serve beneath the model runtime.
```

## Summary

The `DbProvider` contract gives `AmbitenModel` a stable interface for obtaining database infrastructure during execution.

It separates:

```text
model behavior
```

from:

```text
database / client / session resolution
```

while allowing the same infrastructure implementation to adapt to:

- fixed databases,
- database-scoped providers,
- tenant-scoped providers,
- runtime-aware execution,
- transaction sessions,
- multi-tenant infrastructure.

`AmbitenClient` is the primary implementation of that contract, but it is more than an internal provider.

Its context-aware static and instance APIs also allow applications to use Ambiten directly without introducing a model layer first.

The two paths therefore coexist:

```text
DIRECT

AmbitenContext
      ↓
AmbitenClient
      ↓
MongoDB
```

and:

```text
MODEL RUNTIME

AmbitenContext
      ↓
AmbitenModel
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

That makes the provider contract useful both for approachable Ambiten usage and for larger runtime architectures.

## Related Pages

- [AmbitenModel](/models/ambiten-model)
- [Defining Models](/models/defining-models)
- [Context Binding](/models/context-binding)
- [AmbitenClient](/reference/api/ambiten-client)
- [Transactions](/core/transactions)
- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)