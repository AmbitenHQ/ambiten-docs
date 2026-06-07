# Provider Contract

The provider contract defines how a `AmbitenModel` resolves database infrastructure during runtime execution.

A provider is any initialized object that implements the `DbProvider` interface. In most applications, this is a configured `AmbitenClient` or a scoped provider returned by helpers such as `withTenant(...)`, `withDatabase(...)`, or `withScope(...)`.

The provider does not resolve collections. Collection ownership remains the responsibility of `AmbitenModel`, using either its configured `collectionName` `or a runtime` `ModelContext.collectionName` override.

<DocOverviewCards eyebrow="Infrastructure Boundary" title="Providers resolve where operations execute; models define what executes." description="The provider contract keeps database, client, and session resolution outside model behavior while still allowing execution to adapt dynamically to tenant, database, and transaction context." accent="#6d5dfc" :signals='["Db resolution", "Client access", "Session support", "Tenant scope", "Database override"]' :cards='[ { "label": "Separation", "title": "Providers resolve infrastructure boundaries", "text": "Models retain ownership of operations and collection behavior while providers supply the active database and session scope." }, { "label": "Runtime Context", "title": "ModelContext shapes resolution behavior", "text": "Tenant, database, and transaction state can influence infrastructure resolution without requiring model redefinition." }, { "label": "Adaptability", "title": "One contract supports multiple execution styles", "text": "Applications can use static databases, scoped providers, or fully runtime-aware infrastructure resolution through the same interface." } 
]' 
:flow='[ 
{ "label": "Model", "title": "Requests infrastructure" }, { "label": "Provider", "title": "Resolves Db and session" }, { "label": "Client", "title": "Supplies MongoDB access" }, { "label": "Database", "title": "Executes persistence" }
 ]' 
/>

## Core responsibility

The provider exists to resolve infrastructure, not persistence behavior.

At execution time, it determines which database should be used, which MongoDB client should be active when required, and how sessions should be created when transaction support is available.

The provider does not execute queries, define schema behavior, or determine collection structure. Those concerns belong to the model and schema layers.

This separation is one of the key architectural boundaries inside Ambiten.

## Contract shape

```ts
export interface DbProvider {
  db(ctx?: ModelContext): Promise<Db>;
  client?(ctx?: ModelContext): Promise<MongoClient>;
  startSession?(ctx?: ModelContext): Promise<ClientSession>;
}
```

ModelContext allows infrastructure resolution to adapt dynamically to runtime state such as tenant identity, database overrides, and active transaction boundaries.

## How models use providers

A model receives an initialized provider during definition:

```ts
const client = new AmbitenClient({
  uri: process.env.MONGODB_URI,
  options: {
    dbName: "pdf-saas"
  }
});

await client.connect();

const UserModel = new AmbitenModel({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

During execution, the model requests infrastructure from the provider:

```ts
const db = await provider.db(ctx);

const collection = db.collection(
  ctx.collectionName ?? modelCollectionName
);
```

The provider resolves infrastructure boundaries. The model resolves the collection boundary and coordinates execution behavior.

## Separation of responsibilities

```Plain Text
Provider resolves infrastructure.
Model resolves collection and execution behavior.
```

This distinction keeps infrastructure concerns isolated from persistence orchestration.

The provider resolves databases, clients, and sessions. The model owns query execution, middleware participation, and collection behavior. MongoDB ultimately performs persistence.

This layered responsibility is what allows Ambiten to remain adaptable across tenants, runtimes, and infrastructure environments without forcing model definitions to change.

## Context-aware infrastructure resolution

Because providers receive ModelContext, infrastructure resolution can adapt dynamically during execution.

```ts
const db = await provider.db({
  tenantId: "tenant-a",
  dbName: "tenant_a_db"
});
```

This makes tenant-aware routing, request-scoped infrastructure, and transaction-aware execution possible without pushing infrastructure logic into application services.

The model remains stable while the runtime boundary determines how infrastructure should be resolved for the current execution scope.

## Static and runtime-aware providers

Smaller applications often begin with static providers connected to a fixed database boundary:

```ts
const client = await createAppClient();

const UserModel = new AmbitenModel({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

As systems evolve toward multi-tenancy or distributed execution, providers can become scoped or runtime-aware.

Explicit scoped providers allow infrastructure boundaries to be fixed deliberately:

```ts
const tenantProvider = client.withTenant("tenant-a");

const UserModel = new AmbitenModel({
  collectionName: "users",
  schema: userSchema,
  provider: tenantProvider
});
```

This approach is especially useful for jobs, maintenance workflows, background tasks, and controlled execution scopes outside normal request lifecycles.

In request-bound systems, runtime-aware providers resolve infrastructure dynamically from the active execution context automatically:

```ts
const UserModel = new AmbitenModel({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

When execution occurs inside `AmbitenContext`, the provider can resolve the correct tenant database, transaction session, and infrastructure boundary without additional application wiring.

## Relationship with AmbitenClient

<SignalFlow 
aria-label="Provider contract runtime relationship" :items='["AmbitenModel", "DbProvider", "AmbitenClient", "MongoDB"]'
 />

`AmbitenClient` is the default provider implementation used throughout most Ambiten applications.

It implements the provider contract by resolving tenant-aware databases, scoped infrastructure boundaries, MongoDB clients, and transaction sessions dynamically during execution.

## Why the provider contract exists

Without a provider contract, models would need to hold direct database references, switch infrastructure manually, duplicate tenant-routing logic, and coordinate transaction sessions themselves.

Over time, that causes infrastructure concerns to spread across feature code and makes execution behavior inconsistent across applications.

The provider contract prevents this by isolating infrastructure resolution into a dedicated runtime layer while still allowing models to execute against the correct database, tenant, and transaction boundary automatically.

## Mental model

```sh
Model = operation + collection boundary
Provider = database, client, and session resolution
Client = MongoDB infrastructure
```

## Summary

The provider contract allows `AmbitenModel` to remain structurally stable while infrastructure remains dynamic.

By separating persistence execution from infrastructure resolution, Ambiten supports fixed databases, scoped providers, tenant-aware routing, and transaction-aware execution without pushing that complexity into business logic.

This separation is one of the foundational reasons Ambiten can scale cleanly across multi-tenant systems, distributed runtimes, and evolving infrastructure environments.

## Related pages

- [AmbitenModel](/models/ambiten-model)
- [Context Binding](/models/context-binding)
- [AmbitenClient](/reference/api/ambiten-client)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
