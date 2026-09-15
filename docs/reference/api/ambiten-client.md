---
title: AmbitenClient
description: Use AmbitenClient for direct MongoDB access, context-aware runtime execution, scoped infrastructure, or as the DbProvider beneath AmbitenModel.
---

# AmbitenClient

`AmbitenClient` is Ambiten's MongoDB client abstraction and primary database infrastructure surface.

It can be used directly:

```text
Application
    ↓
AmbitenClient
    ↓
MongoDB
```

as part of explicit runtime execution:

```text
AmbitenContext
      ↓
context-aware client capability
      ↓
MongoDB
```

or as the provider beneath `AmbitenModel`:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

These are complementary usage styles.

A developer can begin with direct database access and introduce context, models, adapters, transactions, and multi-tenant infrastructure only when those capabilities become useful.

> **Direct when simplicity is enough. Context-aware when execution needs scope. Provider-capable when models need infrastructure.**

## What AmbitenClient Is

`AmbitenClient` stays close to the MongoDB driver while adding Ambiten's infrastructure and runtime capabilities around it.

Its public responsibilities include areas such as:

```text
MongoDB connection lifecycle
database resolution
collection access
MongoClient access
session creation
tenant-aware provider resolution
database and tenant scoping
explicit runtime context
cluster inspection
database administration
collection administration
connection diagnostics
```

It is intentionally usable without `AmbitenModel`.

Ambiten does not require an application to adopt the complete runtime architecture before useful MongoDB work can begin.

## Progressive Usage

A simple application, script, or tutorial may begin with:

```text
AmbitenClient
      ↓
MongoDB
```

Then introduce explicit execution state:

```text
AmbitenContext
      ↓
AmbitenClient runtime helpers
      ↓
MongoDB
```

Later, schema-bound execution can be added:

```text
AmbitenContext
      ↓
AmbitenModel
      ↓
ModelContext
      ↓
AmbitenClient
      ↓
MongoDB
```

Larger applications can add:

```text
Framework Adapters
MultiTenantManager
TenantConfigResolver
Transactions
Middleware
Instrumentation
Runtime orchestration
```

without replacing the same underlying client architecture.

This makes `AmbitenClient` appropriate for:

```text
educational examples
live coding
YouTube tutorials
scripts
small applications
internal tools
production services
multi-tenant platforms
```

## Creating a Client

Create a client directly:

```ts
import {
  AmbitenClient
} from "@ambiten/core";

const client =
  new AmbitenClient({
    uri: "mongodb://127.0.0.1:27017",

    options: {
      dbName: "my-app"
    }
  });
```

A shared client can also be obtained through the static initializer:

```ts
const client =
  AmbitenClient.init({
    uri: "mongodb://127.0.0.1:27017",

    options: {
      dbName: "my-app"
    }
  });
```

`init()` returns Ambiten's shared initialized client instance for that runtime.

For normal base-client database operations, establish the MongoDB connection before use:

```ts
await client.connect();
```

## Connection Lifecycle

A typical direct client lifecycle is:

```ts
const client =
  new AmbitenClient({
    uri: process.env.MONGODB_URI,

    options: {
      dbName: "app"
    }
  });

await client.connect();

const db =
  await client.db();

const users =
  await client.collection(
    "users"
  );
```

The MongoDB client is reusable infrastructure.

Execution context is separate:

```text
PROCESS / INFRASTRUCTURE

AmbitenClient
MongoClient
connection pool
configured database


EXECUTION

AmbitenContext
tenantId
requestId
dbName
collectionName
session
metadata
```

Long-lived infrastructure can therefore be reused without storing request-specific execution state on the shared client.

## Direct Client Usage

`AmbitenClient` does not require an `AmbitenModel`.

For example:

```ts
await client.connect();

const users =
  await client.collection(
    "users"
  );
```

This is useful when an application wants direct MongoDB access without introducing:

```text
schema binding
model middleware
model lifecycle
model-level validation
collection-bound model definitions
```

Direct usage is a supported Ambiten execution style rather than an escape hatch around the runtime.

## ModelContext

The client-facing provider methods use `ModelContext`.

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

`ModelContext` is the model-operation-facing context contract shared across the model runtime.

It should not be confused with the full `AmbitenContextState`.

The two overlap intentionally.

```text
AmbitenContextState
───────────────────
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


ModelContext
────────────
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

The shared fields allow runtime execution state to participate in model and provider operations.

The additional fields serve their respective execution layers.

## AmbitenContext and ModelContext

`AmbitenContext` carries full execution-scoped runtime state.

`ModelContext` is the operation-facing view consumed by model, schema, and provider behavior.

For normal model execution, the relationship is:

```text
AmbitenContextState
        ↓
AmbitenContext.get()
        ↓
AmbitenModel.mergeCtx(...)
        +
explicit operation ModelContext
        +
model defaults
        ↓
Effective ModelContext
```

That effective context is then used throughout the model operation.

```text
Effective ModelContext
        ├── Schema
        ├── Middleware
        ├── DbProvider
        └── Model operation
```

This distinction is important when understanding how `AmbitenClient` participates in context-aware model execution.

## AmbitenClient as a DbProvider

`AmbitenClient` satisfies the database-provider capabilities used by `AmbitenModel`.

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

The model path is therefore:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
AmbitenClient.db(ctx)
AmbitenClient.client(ctx)
AmbitenClient.startSession(ctx)
      ↓
MongoDB
```

The client does not need to reconstruct model-context precedence itself.

`AmbitenModel` performs that binding before requesting provider infrastructure.

## Effective Model Context

The model runtime uses the precedence:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

Conceptually:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },

  async () => {
    await UserModel.find({});
  }
);
```

`UserModel.find()` can merge the ambient execution state into an effective `ModelContext`.

The provider then receives that resolved operation context:

```text
tenantId = tenant-a
requestId = req-123
...
        ↓
AmbitenClient.db(ctx)
```

This is the primary way ambient runtime state reaches `AmbitenClient` during model execution.

## `db(ctx?)`

`db()` resolves a MongoDB database from the supplied `ModelContext` and client configuration.

```ts
const db =
  await client.db();
```

or:

```ts
const db =
  await client.db({
    dbName: "analytics"
  });
```

The database-resolution order is:

```text
1. ctx.db

2. ctx.tenantId
   → tenant resolver
   → tenant client
   → ctx.dbName
      or tenant database name
      or default database

3. ctx.dbName

4. mutable useDatabase() override

5. configured/default database
```

This ordering makes explicit operation state authoritative while still supporting configured fallback behavior.

## Explicit Database Instance

A `ModelContext` can provide an already resolved `Db`:

```ts
await client.db({
  db: existingDb
});
```

When `ctx.db` is present, it becomes the database for that operation.

This is the most explicit database resolution path.

## Tenant-Aware `db()`

A tenant can also be supplied through `ModelContext`:

```ts
const db =
  await client.db({
    tenantId: "tenant-a"
  });
```

In this path, the client delegates tenant client resolution through its configured tenant resolver.

Conceptually:

```text
ModelContext.tenantId
        ↓
tenantResolver.getClient(...)
        ↓
Tenant MongoClient
        ↓
resolved tenant database
```

If multi-tenancy has not been configured for the client, supplying a `tenantId` is considered an invalid resolution request.

## Tenant Database Name Resolution

For tenant-aware database access, the effective database name can come from:

```text
ctx.dbName
      ↓
registered tenant database name
      ↓
client default
```

This allows a tenant operation to retain explicit database override capability while still supporting registered tenant configuration.

## `client(ctx?)`

`client()` returns the MongoDB client associated with the requested infrastructure scope.

```ts
const mongoClient =
  await client.client();
```

For tenant-aware execution:

```ts
const tenantMongoClient =
  await client.client({
    tenantId: "tenant-a"
  });
```

The tenant-aware path delegates client resolution through the configured tenant resolver.

This makes the provider contract capable of returning the correct MongoDB client for transaction/session infrastructure as well as ordinary database access.

## `collection(name, ctx?)`

Collections can be accessed directly:

```ts
const users =
  await client.collection(
    "users"
  );
```

An explicit `ModelContext` can also be supplied:

```ts
const users =
  await client.collection(
    "users",
    {
      dbName: "analytics"
    }
  );
```

`collection()` delegates database resolution to:

```text
db(ctx)
```

and then selects the requested collection from that resolved database.

Conceptually:

```text
collection("users", ctx)
        ↓
db(ctx)
        ↓
resolved Db
        ↓
db.collection("users")
```

## `getCollection()`

`getCollection()` provides an alternative collection accessor:

```ts
const users =
  await client.getCollection<User>(
    "users",
    ctx
  );
```

Where a normal MongoDB client is available, it delegates to `collection()`.

It also contains defensive behavior used by environments where a real client may not yet be available, such as particular testing or structural initialization scenarios.

For ordinary application persistence, `collection()` remains the straightforward direct accessor.

## Direct Context Awareness

There are two different ideas that should not be combined:

```text
1. ModelContext-aware provider methods

2. Methods/helpers that read AmbitenContext directly
```

For example:

```ts
client.db(ctx);
client.collection(name, ctx);
client.client(ctx);
client.startSession(ctx);
```

consume `ModelContext` supplied to them.

They should not be described as if every one of those methods independently reconstructs the current `AmbitenContext`.

During model execution, `AmbitenModel.mergeCtx()` performs that binding first.

## Ambient Runtime Context

Some client facilities do read `AmbitenContext` directly.

These include runtime helpers such as:

```text
resolveRuntime()
resolveClientScope()
withContext()
context-enriched internal logging
```

The distinction is:

```text
PROVIDER PATH

AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext
      ↓
AmbitenClient


DIRECT AMBIENT PATH

AmbitenContext
      ↓
context-reading client helper
      ↓
MongoDB capability
```

Both are context-aware, but they arrive at context through different mechanisms.

## `withContext()`

`withContext()` establishes an explicit `AmbitenContext` boundary:

```ts
await client.withContext(
  {
    tenantId: "tenant-a",
    requestId: "req-123",
    dbName: "tenant_a_db"
  },

  async () => {
    // execution occurs inside AmbitenContext
  }
);
```

Conceptually:

```text
client.withContext(...)
        ↓
AmbitenContext.run(...)
        ↓
callback
```

The context can contain:

```text
tenantId
requestId
dbName
collectionName
session
```

`withContext()` establishes the execution scope.

It does **not** mean that every `AmbitenClient` method automatically reads every ambient value.

Whether a direct client operation consumes ambient context depends on that method's implementation.

This keeps the execution-boundary API explicit and avoids implying behavior that belongs to `AmbitenModel.mergeCtx()` or other context-reading helpers.

## `resolveRuntime()`

`AmbitenClient.resolveRuntime()` is an explicit ambient runtime helper.

It reads the active `AmbitenContext`:

```text
AmbitenContext.get()
```

and requires a resolved tenant identity.

Conceptually:

```text
AmbitenContext
tenantId = tenant-a
session = S1
      ↓
AmbitenClient.resolveRuntime()
      ↓
MultiTenantManager.resolveTenant(...)
      ↓
TenantConfig
      ↓
Db + active session
```

The result contains:

```text
db
session
```

This helper is useful when runtime infrastructure needs to be resolved directly from the active Ambiten execution rather than through an `AmbitenModel`.

## Direct Runtime Resolution

A context-driven direct path can therefore look conceptually like:

```ts
await client.withContext(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },

  async () => {
    const {
      db,
      session
    } =
      await AmbitenClient.resolveRuntime();

    const users =
      db.collection("users");

    // direct MongoDB work
  }
);
```

This path intentionally uses ambient `AmbitenContext`.

It is different from passing a `ModelContext` directly to `client.db(ctx)`.

## Client Scope Resolution

Internally, `AmbitenClient` also resolves certain client-level scopes from a combination of:

```text
explicit method input
        ↓
active AmbitenContext
        ↓
client configuration
        ↓
client defaults
```

This scope can include:

```text
tenantId
requestId
dbName
collectionName
session
```

The scope resolver does not mutate `AmbitenContext` or the client configuration.

It provides a deterministic view of the active client-level execution scope for methods that use it.

## `useCollection()`

`useCollection()` resolves a collection using the client-level scope and stores the resulting collection reference on the client.

```ts
const users =
  await client.useCollection(
    "users"
  );
```

Because this method maintains `collectionRef`, it is stateful compared with the ordinary:

```ts
client.collection(...)
```

accessor.

For normal concurrent application work, explicit `collection(...)` access or scoped provider APIs are generally easier to reason about.

`useCollection()` remains useful for controlled direct-client workflows and compatibility scenarios.

## Scoped Clients

Ambiten supports scoped `BootstrapClient` views that pre-bind infrastructure values without mutating the base client's ordinary scope.

The available helpers include:

```text
withTenant(...)
withDatabase(...)
withScope(...)
```

Each scoped view merges its predefined scope with an optional operation `ModelContext`.

The general rule is:

```text
explicit ModelContext value
        ↓
scoped value
```

So explicit operation state can override the bound scope where supported.

## `withDatabase()`

Create a database-scoped provider:

```ts
const reporting =
  client.withDatabase(
    "reporting"
  );
```

It can then be used directly:

```ts
const reports =
  await reporting.collection(
    "reports"
  );
```

Conceptually:

```text
Base AmbitenClient
      ↓
withDatabase("reporting")
      ↓
BootstrapClient view
      ↓
dbName = explicit ctx.dbName
         or "reporting"
```

This is useful when a database boundary should be explicit without mutating the base client.

## `withTenant()`

Create a tenant-scoped provider:

```ts
const tenantClient =
  client.withTenant(
    "tenant-a"
  );
```

Then:

```ts
const users =
  await tenantClient.collection(
    "users"
  );
```

Conceptually:

```text
Base AmbitenClient
      ↓
withTenant("tenant-a")
      ↓
BootstrapClient view
      ↓
tenantId = explicit ctx.tenantId
           or "tenant-a"
```

The resulting provider delegates tenant-aware database and client resolution back to the base `AmbitenClient`.

This is especially useful for controlled execution such as:

```text
background jobs
maintenance operations
tenant-specific scripts
migrations
administrative workflows
tests
```

## `withScope()`

A combined tenant/database scope can be created through:

```ts
const scoped =
  client.withScope({
    tenantId: "tenant-a",
    dbName: "reporting"
  });
```

Conceptually:

```text
withScope({
  tenantId,
  dbName
})
      ↓
BootstrapClient view
      ↓
explicit ModelContext
overrides scoped values
where supplied
```

This provides an explicit infrastructure view without redefining the base client.

## Scoped Clients Are Views, Not Independent MongoClients

The scope helpers should be understood as lightweight provider views over the base client.

They delegate capabilities such as:

```text
db()
client()
collection()
startSession()
connect()
close()
```

back to the original `AmbitenClient` while merging their predefined scope.

Conceptually:

```text
Base AmbitenClient
      │
      ├── withTenant(...)
      ├── withDatabase(...)
      └── withScope(...)
             ↓
        scoped provider view
```

They are not unrelated MongoDB connection pools created for every scope.

## Mutable Database Switching

`useDatabase()` provides a mutable database override:

```ts
await client.useDatabase(
  "reporting"
);
```

This sets the client's mutable database override.

The resolution order then allows that value to participate after explicit `ctx.dbName` and before the default database.

Because the override mutates shared client state, it should be used carefully in concurrent or request-driven environments.

Prefer:

```ts
const reporting =
  client.withDatabase(
    "reporting"
  );
```

for request-safe scoped execution.

`useDatabase()` remains useful in controlled scenarios such as:

```text
scripts
CLI utilities
migrations
interactive examples
single-purpose workflows
```

## Resetting the Mutable Database Override

A mutable database override can be cleared with:

```ts
client.resetDatabase();
```

After reset, database resolution falls back to the remaining resolution rules such as explicit context or configured defaults.

## Sessions

`AmbitenClient` provides direct session creation:

```ts
const session =
  await client.startSession();
```

A `ModelContext` can also be supplied:

```ts
const session =
  await client.startSession({
    tenantId: "tenant-a"
  });
```

Internally:

```text
startSession(ctx)
      ↓
client(ctx)
      ↓
resolved MongoClient
      ↓
MongoClient.startSession()
```

This means tenant-aware session creation uses the same client-resolution contract as tenant-aware database access.

## Transactions

Direct session access is useful when explicit MongoDB session control is desired.

For runtime-managed transactions, Ambiten can instead establish a transaction boundary and propagate the active session through execution context.

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

For the model path:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
participating model operations
```

The model/provider operation participates in the active transaction.

The enclosing transaction boundary owns commit and rollback.

## Tenant Identity vs Tenant Infrastructure

`AmbitenClient` participates in tenant-aware infrastructure, but it should not be described as the owner of the entire tenant runtime.

The architectural responsibilities remain:

```text
TenantResolver
→ identifies tenant identity

AmbitenContext
→ carries tenant identity

AmbitenModel
→ derives effective ModelContext

MultiTenantManager
→ owns registered tenant infrastructure

AmbitenClient
→ provides database/client/session capability
```

The exact path differs between model execution, scoped client execution, and direct runtime helpers.

## Instance Tenant Resolution

For provider methods such as:

```text
db(ctx)
client(ctx)
```

tenant-aware resolution uses the `tenantResolver` configured on the `AmbitenClient`.

Conceptually:

```text
ModelContext.tenantId
      ↓
configured tenantResolver
      ↓
getClient(tenantId)
      ↓
tenant MongoClient
```

Database resolution can additionally use the tenant database registered with `MultiTenantManager`.

This keeps client resolution extensible while allowing Ambiten's multi-tenant runtime to supply the underlying tenant infrastructure.

## MultiTenantManager Relationship

For the broader Ambiten runtime:

```text
AmbitenContext
tenantId
      ↓
AmbitenModel
      ↓
effective ModelContext
      ↓
AmbitenClient / tenant resolver
      ↓
MultiTenantManager-managed resources
      ↓
MongoDB
```

`MultiTenantManager` owns concerns such as:

```text
tenant registration
tenant configuration
dynamic tenant discovery
lazy tenant activation
tenant client lifecycle
runtime tenant registry
```

`AmbitenClient` remains the MongoDB-facing capability within that architecture.

## Dynamic Tenants

Dynamic tenant discovery is not performed by every ordinary direct client method.

It belongs to the multi-tenant runtime.

Conceptually:

```text
tenantId
   ↓
MultiTenantManager.resolveTenant()
   ↓
registered?
   │
   ├── yes → use tenant
   │
   └── no
         ↓
      TenantConfigResolver
         ↓
      register tenant
         ↓
      getClient()
```

Once the tenant infrastructure exists, `AmbitenClient` capabilities can participate against the resulting MongoDB client and database.

## Static API

`AmbitenClient` also provides static runtime facilities.

### `init()`

```ts
const client =
  AmbitenClient.init({
    uri,
    options: {
      dbName
    }
  });
```

Returns the shared Ambiten client instance for the runtime.

### `db(ctx?)`

A static database accessor is also available:

```ts
const db =
  await AmbitenClient.db(ctx);
```

It delegates to the initialized client:

```text
AmbitenClient.init()
      ↓
client.db(ctx)
```

The same connection and context requirements of the underlying client still apply.

### `resolveRuntime()`

```ts
const runtime =
  await AmbitenClient.resolveRuntime();
```

This is the explicit ambient tenant-runtime resolver described earlier.

It reads `AmbitenContext`, resolves the tenant through `MultiTenantManager`, and returns the resolved database and active session.

### Topology Helpers

The client also exposes static topology helpers:

```text
handleTopologyEvent(...)
handleLogBatch(...)
```

These support MongoDB topology event handling and runtime-aware operational logging.

They are infrastructure/observability utilities rather than ordinary persistence APIs.

## Operational Capabilities

`AmbitenClient` includes several lower-level operational methods.

These include:

```text
getClusterInfo()
dropCollection()
dropDatabase()
close()
disconnect()
isConnected()
```

### Cluster Inspection

```ts
const info =
  await client.getClusterInfo();
```

The client can distinguish:

```text
standalone
replica set
sharded cluster
```

based on MongoDB topology information.

### Drop a Collection

```ts
await client.dropCollection(
  "temporary-data"
);
```

An optional `ModelContext` can participate in database selection.

### Drop a Database

```ts
await client.dropDatabase();
```

or with an explicit context:

```ts
await client.dropDatabase({
  dbName: "temporary"
});
```

These are administrative operations and should be treated accordingly.

## Closing the Client

Close the underlying MongoDB client with:

```ts
await client.close();
```

or:

```ts
await client.disconnect();
```

The client resets its internal connection state when closed.

Connection status can be inspected with:

```ts
client.isConnected();
```

## Close to MongoDB by Design

Ambiten intentionally preserves MongoDB concepts.

Developers can still reason directly about:

```text
MongoClient
Db
Collection
ClientSession
database names
collection names
MongoDB topology
MongoDB operations
```

Ambiten adds:

```text
runtime context
provider contracts
scoped infrastructure
tenant-aware resolution
transaction propagation
execution boundaries
```

around those concepts.

It does not attempt to replace MongoDB with an unrelated persistence vocabulary.

## AmbitenClient vs AmbitenModel

The two APIs serve different abstraction levels.

### Direct Client

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

Useful for:

```text
tutorials
scripts
direct database work
small services
migrations
diagnostics
administrative tools
```

### Model Runtime

```text
Application
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

The model adds:

```text
schema behavior
validation
middleware
collection ownership
effective-context resolution
operation lifecycle
model policies
```

Neither usage style invalidates the other.

## AmbitenClient and AmbitenContext

The relationship depends on the execution path.

### Model Path

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext
      ↓
AmbitenClient
```

Here the **model performs the context binding**.

### Explicit ModelContext Path

```text
Application
      ↓
ModelContext
      ↓
AmbitenClient
```

Here the caller supplies the required operation scope directly.

### Ambient Helper Path

```text
AmbitenContext
      ↓
resolveRuntime()
or another context-reading helper
      ↓
AmbitenClient runtime capability
```

Here the **client helper reads ambient context directly**.

These distinctions prevent the term "context-aware" from becoming ambiguous.

## Framework Independence

`AmbitenClient` has no requirement to run behind one particular framework.

It can participate in:

```text
Script ─────────┐
Worker ─────────┤
Express ────────┤
Fastify ────────┤
NestJS ─────────┤
GraphQL ────────┤
Lambda ─────────┘
                ↓
          AmbitenClient
```

Framework adapters can establish execution boundaries where appropriate.

Manual workflows can use:

```text
explicit ModelContext
scoped clients
AmbitenContext.run(...)
client.withContext(...)
```

depending on the desired execution style.

## Bootstrap Relationship

`AmbitenBootstrapFactory` can prepare process-level runtime infrastructure that includes an `AmbitenClient`.

Conceptually:

```text
AmbitenBootstrapFactory
      ↓
AmbitenRuntime
      ↓
AmbitenClient
```

Bootstrap prepares infrastructure.

It does not establish each request or job execution context.

Execution begins later through:

```text
framework adapter
```

or:

```ts
AmbitenContext.run(...)
```

or another explicit execution boundary.

## Process Lifetime vs Execution Lifetime

The client architecture follows the same lifetime separation used throughout Ambiten.

```text
PROCESS LIFETIME
────────────────
AmbitenClient
MongoClient
connection pool
MultiTenantManager
provider configuration
runtime configuration
```

```text
EXECUTION LIFETIME
──────────────────
AmbitenContextState
tenantId
requestId
dbName
collectionName
session
runtime metadata
```

And within model execution:

```text
OPERATION LIFETIME
──────────────────
Effective ModelContext
operation overrides
soft-delete controls
model-specific configuration
```

Keeping those lifetimes separate prevents execution state from leaking into reusable process infrastructure.

## Common Usage Patterns

### Simple Direct Client

```ts
const client =
  new AmbitenClient({
    uri,
    options: {
      dbName: "app"
    }
  });

await client.connect();

const users =
  await client.collection(
    "users"
  );
```

### Explicit Database Context

```ts
const events =
  await client.collection(
    "events",
    {
      dbName: "analytics"
    }
  );
```

### Tenant Context

```ts
const users =
  await client.collection(
    "users",
    {
      tenantId: "tenant-a"
    }
  );
```

This requires tenant resolution to be configured for the client.

### Database Scope

```ts
const reporting =
  client.withDatabase(
    "reporting"
  );

const reports =
  await reporting.collection(
    "reports"
  );
```

### Tenant Scope

```ts
const tenant =
  client.withTenant(
    "tenant-a"
  );

const users =
  await tenant.collection(
    "users"
  );
```

### Combined Scope

```ts
const scoped =
  client.withScope({
    tenantId: "tenant-a",
    dbName: "reporting"
  });
```

### Model Provider

```ts
const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

### Direct Session

```ts
const session =
  await client.startSession();
```

### Tenant Session

```ts
const session =
  await client.startSession({
    tenantId: "tenant-a"
  });
```

## When to Use AmbitenClient Directly

Direct client usage is a good fit when:

```text
you are learning Ambiten
you are teaching Ambiten
you are creating a live coding example
the application is small
the workflow is database-oriented
you need direct collection access
you are writing a script
you are building a migration
you are performing diagnostics
a model abstraction would add no value yet
```

There is no requirement to introduce `AmbitenModel` merely to make an application "properly Ambiten."

## When to Introduce AmbitenModel

`AmbitenModel` becomes useful when the application benefits from:

```text
schema-bound execution
typed model operations
validation
middleware
collection ownership
effective ModelContext resolution
soft-delete behavior
consistent model policies
operation lifecycle
```

A natural progression is:

```text
AmbitenClient
      ↓
AmbitenContext
      ↓
AmbitenSchema
      ↓
AmbitenModel
      ↓
Adapters
      ↓
Multi-Tenancy / Transactions
```

Applications can adopt whichever level matches their requirements.

## What AmbitenClient Does Not Own

`AmbitenClient` does not own:

```text
HTTP routing
framework request lifecycle
application authentication
tenant authorization
schema definition
model middleware orchestration
application workflows
global dynamic-tenant policy
```

It also does not replace `AmbitenModel.mergeCtx()` in the model runtime.

The model remains responsible for deriving the effective operation context before provider execution.

## Design Philosophy

`AmbitenClient` is intentionally accessible.

Ambiten's architecture supports sophisticated multi-tenant and transaction-aware systems, but a developer should not need to understand that entire architecture before performing useful MongoDB work.

The client therefore supports both:

```text
APPROACHABLE USAGE

direct database access
direct collection access
explicit scopes
small runtime helpers
```

and:

```text
ADVANCED USAGE

DbProvider integration
ModelContext
tenant-aware clients
transaction sessions
MultiTenantManager integration
runtime execution
```

The same underlying client can grow with the application.

## Runtime Relationship

<SignalFlow
  aria-label="AmbitenClient runtime relationship"
  :items='[
    "Execution Context",
    "ModelContext / Scope",
    "AmbitenClient",
    "MongoDB"
  ]'
/>

The exact path depends on how the client is used.

### Direct

```text
Application
    ↓
AmbitenClient
    ↓
MongoDB
```

### Explicit Context

```text
Application
    ↓
ModelContext
    ↓
AmbitenClient
    ↓
MongoDB
```

### Model Runtime

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
AmbitenClient
      ↓
MongoDB
```

### Ambient Tenant Runtime

```text
AmbitenContext
tenantId
      ↓
AmbitenClient.resolveRuntime()
      ↓
MultiTenantManager
      ↓
Tenant Database
```

### Scoped Provider

```text
AmbitenClient
      ↓
withTenant()
withDatabase()
withScope()
      ↓
BootstrapClient view
      ↓
AmbitenClient
      ↓
MongoDB
```

## Mental Model

The simplest mental model is:

```text
AmbitenClient
= MongoDB capability with Ambiten runtime support.
```

For direct execution:

```text
Explicit scope
→ AmbitenClient
→ MongoDB
```

For model execution:

```text
AmbitenContext
→ AmbitenModel.mergeCtx()
→ ModelContext
→ AmbitenClient
→ MongoDB
```

For tenant infrastructure:

```text
tenantId
→ tenant resolver / MultiTenantManager
→ tenant MongoClient
→ AmbitenClient capability
→ MongoDB
```

And the key contract distinction is:

```text
AmbitenContextState
= full execution state

ModelContext
= model-operation-facing state

AmbitenClient
= database/client/session capability

AmbitenModel
= binds execution state to model operations
```

## Summary

`AmbitenClient` is Ambiten's MongoDB client abstraction and primary database infrastructure surface.

It supports:

- direct database access,
- direct collection access,
- explicit `ModelContext`,
- database and tenant scopes,
- MongoDB client access,
- session creation,
- ambient runtime helpers,
- provider integration,
- tenant-aware resolution,
- operational tooling,
- connection lifecycle management.

It can be used directly:

```text
Application
    ↓
AmbitenClient
    ↓
MongoDB
```

with explicit operation context:

```text
Application
    ↓
ModelContext
    ↓
AmbitenClient
    ↓
MongoDB
```

or beneath `AmbitenModel`:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

The distinction matters:

> **`AmbitenModel` binds runtime state into model execution. `ModelContext` carries the persistence-facing operation state. `AmbitenClient` provides the MongoDB infrastructure required to execute it.**

For developers who do not yet need models, adapters, or multi-tenancy, the client remains useful on its own.

For larger systems, the same client becomes part of Ambiten's wider context-aware runtime.

> **Start directly. Add structure when the application needs it.**

## Related Pages

- [Context](/core/context)
- [Transactions](/core/transactions)
- [AmbitenModel](/models/ambiten-model)
- [Defining Models](/models/defining-models)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/architecture/multi-tenancy/dynamic-tenants)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)