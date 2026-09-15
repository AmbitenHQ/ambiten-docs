# Multi-Tenancy Overview

Ambiten provides multi-tenancy as part of its runtime rather than as a convention that every application layer must implement independently.

A tenant identity can enter an application through an HTTP header, route parameter, cookie, token, subdomain, or a custom resolver. Once resolved, Ambiten carries that identity through the active execution context and uses it when database resources are selected.

This allows application code to work with Ambiten models without manually passing a tenant identifier through every function call.

<MultiTenancyOverview />

```text
Request
   ↓
Tenant Resolution
   ↓
AmbitenContext
   ↓
MultiTenantManager
   ↓
Tenant MongoDB Client
   ↓
Tenant Database
   ↓
AmbitenModel
```

The multi-tenant runtime is built around a separation of responsibilities:

- Tenant resolution determines which tenant a request belongs to.
- AmbitenContext carries that tenant identity through the current execution.
- MultiTenantManager manages tenant configuration, discovery, registration, and client lifecycle.
- AmbitenClient resolves the database connection required by the active tenant.
- AmbitenModel performs operations against the database selected for the current execution.

This separation keeps tenant identity, tenant infrastructure, and application data access related without collapsing them into one concern.

## Request-Scoped Tenant Identity

When a framework adapter receives a request, it resolves the tenant using the configured tenancy strategy.

For example:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

A request such as:

```bash
POST /users
x-tenant-id: tenant5
```

can result in the following runtime context:

```ts
AmbitenContext.get();
{
  tenantId: "tenant5",
  requestId: undefined,
  dbName: undefined,
  collectionName: undefined,
  ...
}
```

The resolved tenant identity belongs to the current execution.

Application code does not need to repeatedly read the original HTTP header or manually forward `"tenant5"` through each service and model operation.

Instead:

```ts
const { tenantId } = AmbitenContext.get();
```

returns the tenant associated with the active request.

This also means tenant resolution is not tied specifically to HTTP headers. A custom resolver may derive the same tenant identity from another source while the rest of the runtime continues to work unchanged.

## Static and Dynamic Tenants

Ambiten supports both statically configured tenants and dynamically discovered tenants.

A static tenant is known when multi-tenancy is initialized.

Conceptually:

```ts
{
  tenant1: "...",
  tenant2: "...",
  tenant3: "..."
}
```

These tenants can be registered during application startup and, when lazy mode is enabled, remain disconnected until they are actually needed.

A dynamic tenant does not need to exist in the local registry at startup.

Instead, Ambiten can resolve its configuration when the tenant is first encountered:

```text
tenant5 request
   ↓
tenant5 not registered
   ↓
TenantConfigResolver
   ↓
external tenant configuration found
   ↓
tenant5 registered
   ↓
client created when required
```

This is useful when tenant configuration lives outside the application process, for example in:

- a control database,
- an account service,
- a configuration API,
- a secrets or infrastructure service,
- or another application-defined source.

Static and dynamic tenants ultimately enter the same runtime registry and use the same database resolution path.

## Lazy Tenant Connections

Registration and connection are separate operations.

A tenant may be known to Ambiten without having an active MongoDB client.

For example, after startup:

```ts
MultiTenantManager.getStats();
```

might report:

```ts
{
  registeredTenants: 3,
  connectedTenants: 0,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

If a request then arrives for a dynamically resolved tenant:

```ts
tenant5
```

and a model operation requires database access, Ambiten can register and connect that tenant on demand.

The resulting state might become:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

The newly used tenant is connected while the other registered tenants remain lazy.

This prevents every tenant connection from needing to be opened during application startup.

## Tenant Resolution Is Separate from Tenant Configuration

Ambiten deliberately distinguishes two different questions.

The first is:

> Which tenant does this request belong to?

That is the responsibility of the request-facing `TenantResolver`.

The second is:

> Where does this tenant live?

That is the responsibility of tenant configuration resolution and `MultiTenantManager`.

The complete path can therefore look like this:

```text
Incoming Request
      ↓
TenantResolver
      ↓
tenantId
      ↓
AmbitenContext
      ↓
MultiTenantManager
      ↓
registered locally?
   ┌───────┴────────┐
  yes               no
   ↓                 ↓
use config     TenantConfigResolver
                     ↓
                resolve config
                     ↓
                 register
   └───────────┬───────────┘
               ↓
           getClient()
               ↓
        tenant database
```

This distinction is important because request identity and database configuration often come from completely different systems.

An HTTP adapter may determine that a request belongs to:

```ts
tenant5
```

without knowing anything about that tenant's MongoDB URI, database name, deployment region, or metadata.

`MultiTenantManager` owns that infrastructure-facing information.

## AmbitenContext and MultiTenantManager

`AmbitenContext` and `MultiTenantManager` participate in the same tenant flow, but they serve different purposes.

```text
AmbitenContext
→ What belongs to this execution?

MultiTenantManager
→ What tenant resources exist in this runtime?
```

For example:

```ts
AmbitenContext.get().tenantId
```

answers:

> Which tenant is the current request running for?

While:

```ts
MultiTenantManager.getTenant("tenant5")
```

answers:

> Is tenant5 currently registered, and what configuration is associated with it?

Keeping these responsibilities separate prevents request-scoped state from becoming global tenant state.

## Models Use the Active Runtime Context

Once a tenant has been resolved, model operations can use the current execution context to select the correct database.

Application code can remain focused on the operation itself:

```ts
const user = await UserModel.create({
  username: "Abinod Ltd",
  email: "aemma@abinod.com"
});
```

If the active context contains:

```ts
{
  tenantId: "tenant5"
}
```

Ambiten can resolve the corresponding tenant configuration and execute the operation against that tenant's database.

Conceptually:

```text
UserModel.create(...)
       ↓
AmbitenContext
tenantId = tenant5
       ↓
MultiTenantManager
       ↓
tenant5 MongoClient
       ↓
db_tenant5
       ↓
users collection
```

The model does not need to infer tenant identity itself, and the application does not need to manually select a database for every operation.

## Framework Adapters

Framework adapters connect framework-specific request lifecycles to Ambiten's runtime context.

For example:

```text
Express / Fastify / NestJS
          ↓
     adapter-runtime
          ↓
     AmbitenContext
          ↓
      application
```

The adapter is responsible for entering the request into the Ambiten execution context before application logic runs.

Once inside that context, tenant identity can remain available across asynchronous operations and model calls.

Ambiten's package boundary supports both ESM and CommonJS consumers while preserving the request-scoped runtime context used by framework adapters.

See [Framework Adapters](/multi-tenant/framework-adapters) for adapter-specific configuration.

## Multi-Tenancy Flow

Putting the pieces together:

```text
1. Request arrives

2. Framework adapter resolves tenant identity

3. AmbitenContext stores tenantId for the execution

4. Application calls an Ambiten model

5. Ambiten resolves the tenant through MultiTenantManager

6. If necessary, TenantConfigResolver discovers the tenant

7. The tenant is registered

8. getClient() guarantees an active MongoDB client

9. Ambiten selects the tenant database

10. The model operation executes
```

The application therefore does not need to manually coordinate request identity, tenant discovery, connection management, and model routing.

Those concerns remain separate while participating in the same runtime.

## Next

Continue with:

- [Tenant Resolution](./tenant-resolver) — how tenant identity is derived from a request.
- [MultiTenantManager](./multi-tenant-manager) — tenant registration, lookup, discovery, connections, and runtime state.
- [Dynamic Tenants](./dynamic-tenants) — resolving tenants that are not known at startup.
- [Framework Adapters](./framework-adapters) — connecting HTTP framework request lifecycles to Ambiten's execution context.
