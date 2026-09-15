---
title: MultiTenantManager
description: Manage tenant registration, dynamic discovery, MongoDB client resolution, and runtime tenancy state in Ambiten.
---

# MultiTenantManager

`MultiTenantManager` is Ambiten's runtime registry and resource manager for multi-tenant applications.

It is responsible for knowing which tenants are currently registered, resolving tenants that are not yet known locally, managing their MongoDB client lifecycle, and exposing runtime tenancy state.

It does **not** determine which tenant an incoming request belongs to.

That responsibility belongs to tenant resolution and `AmbitenContext`.

```text
Request
   ↓
TenantResolver
   ↓
AmbitenContext.tenantId
   ↓
MultiTenantManager
   ├── registered tenant?
   │      ↓ yes
   │   use config
   │
   └── no
          ↓
      TenantConfigResolver
          ↓
      resolve configuration
          ↓
      register tenant
          ↓
      getClient()
          ↓
      tenant database
```

At a high level:

```text
AmbitenContext
→ Which tenant belongs to this execution?

MultiTenantManager
→ What configuration and resources belong to that tenant?
```

This separation allows request-scoped identity and process-level tenant infrastructure to remain independent while still participating in the same runtime flow.

## Responsibilities

`MultiTenantManager` coordinates four primary concerns:

- tenant registration,
- tenant lookup,
- dynamic tenant discovery,
- MongoDB client lifecycle.

It also exposes runtime information such as the number of registered, connected, and lazy tenants.

A registered tenant can exist without having an active MongoDB connection.

This distinction is central to Ambiten's lazy tenancy model.

```text
registered
    ≠
connected
```

A tenant may therefore be known to the runtime while its MongoDB client remains unopened until the first database operation requires it.

## Tenant Configuration

A tenant configuration represents the infrastructure information Ambiten needs in order to work with a tenant.

Conceptually:

```ts
interface TenantConfig {
  tenantId: string;
  uri: string;
  dbName: string;
  client?: MongoClient;
  lazy: boolean;
  metadata?: Record<string, unknown>;
}
```

For example:

```ts
const tenant = {
  tenantId: "tenant5",
  uri: "mongodb://localhost:27017",
  dbName: "db_tenant5",
  lazy: true,
  metadata: {
    region: "de-west-1",
    tier: "supreme"
  }
};
```

The important distinction is that this configuration belongs to the runtime registry.

It is not request-scoped state.

It is not request-scoped state.

A request may carry:

```ts
{
  tenantId: "tenant5"
}
```

while `MultiTenantManager` holds the infrastructure required to actually reach that tenant.

```ts
getTenant()
MultiTenantManager.getTenant(tenantId)
```

`getTenant()` performs a synchronous lookup against the current local tenant registry.

It does not perform external tenant discovery.

```ts
const tenant =
  MultiTenantManager.getTenant("tenant5");
```

If `"tenant5"` is already registered, the corresponding tenant configuration is returned.

If it is not registered, no external resolver is consulted.

Think of `getTenant()` as:

```text
local registry lookup only
```

This makes it suitable when you specifically want to inspect the runtime's currently known tenant state.

For example:

```ts
const tenant =
  MultiTenantManager.getTenant("tenant5");

if (tenant) {
  console.log(tenant.dbName);
}
```

## When to use `getTenant()`

Use it when you want to:

- inspect a tenant that should already be registered,
- read runtime tenant metadata,
- examine lazy or connected state,
- avoid triggering external discovery.

Do not use it when your application needs to discover tenants dynamically.

For that, use `resolveTenant()`.

```ts
resolveTenant()
await MultiTenantManager.resolveTenant(tenantId)
```

`resolveTenant()` is the runtime-aware tenant lookup operation.

It first checks the local registry.

If the tenant is not registered and a dynamic tenant configuration resolver is available, Ambiten can use that resolver to discover the tenant externally.

Conceptually:

```text
resolveTenant("tenant5")
        ↓
registered locally?
   ┌────┴────┐
  yes        no
   ↓          ↓
return     TenantConfigResolver
config          ↓
             found?
          ┌────┴────┐
         yes        no
          ↓          ↓
      register    unresolved
          ↓
      return config
```

Example:

```ts
const tenant =
  await MultiTenantManager.resolveTenant("tenant5");

if (!tenant) {
  throw new Error("Tenant not found.");
}
```

This is the correct operation when the tenant may exist outside the current runtime registry.

## Local and dynamic resolution

The distinction between the two lookup methods is intentional:

```ts
getTenant()
    = local registry only

resolveTenant()
    = local registry
      +
      external discovery when required
```

This allows callers to be explicit about whether tenant discovery is permitted.

`getClient()`

```ts
await MultiTenantManager.getClient(tenantId)
```

`getClient()` resolves the tenant and guarantees that a usable MongoDB client is available.

It is the resource-oriented operation in the manager.

Conceptually:

```text
getClient("tenant5")
        ↓
resolve tenant
        ↓
tenant found?
        ↓
client already connected?
   ┌────┴────┐
  yes        no
   ↓          ↓
return     establish client
client          ↓
            update runtime state
                 ↓
             return client
```

Example:

```ts
const client =
  await MultiTenantManager.getClient("tenant5");

const db =
  client.db("db_tenant5");
```

In normal Ambiten model operations, application code usually does not need to call `getClient()` directly.

Ambiten's runtime uses the active tenant context to resolve the appropriate database resource when a model operation requires it.

For example:

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

the runtime can resolve the correct tenant client without requiring the application to manually call:

```ts
MultiTenantManager.getClient("tenant5");
```

Direct client access is therefore mainly useful for infrastructure-level operations or advanced integrations.

## Lazy Tenant Activation

Ambiten separates tenant registration from MongoDB connection establishment.

Consider an application initialized with three tenants in lazy mode.

At startup:

```ts
MultiTenantManager.getStats();
```

might return:

```ts
{
  registeredTenants: 3,
  connectedTenants: 0,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

The tenants are known, but no tenant-specific MongoDB clients are active.

Now suppose a request arrives for a tenant that is not yet registered:

```ts
x-tenant-id: tenant5
```

The adapter resolves:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

When a model operation requires database access:

```text
tenant5
   ↓
not registered locally
   ↓
TenantConfigResolver
   ↓
configuration found
   ↓
tenant5 registered
   ↓
getClient()
   ↓
MongoDB client established
```

The tenant may then appear as:

```ts
{
  tenantId: "tenant5",
  dbName: "db_tenant5",
  connected: true,
  lazy: false,
  metadata: {
    region: "de-west-1",
    tier: "supreme"
  }
}
```

while runtime statistics become:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

The three unused tenants remain lazy.

Only the tenant that required a database operation has transitioned to an active connection.

## Dynamic Tenant Configuration

Dynamic tenants are resolved through a `TenantConfigResolver`.

This allows tenant infrastructure to live outside the running application.

For example:

```ts
MultiTenantManager.setTenantConfigResolver({
  async resolve(tenantId) {
    const config =
      await lookupTenant(tenantId);

    if (!config) {
      return undefined;
    }

    return {
      tenantId,
      uri: config.uri,
      dbName: config.dbName,
      lazy: true,
      metadata: config.metadata
    };
  }
});
```

The external lookup can be backed by any application-defined source, such as:

- a control database,
- a tenant registry service,
- an internal configuration API,
- an infrastructure service,
- a secrets-backed configuration store.

Ambiten only needs the resolver to produce the tenant configuration required by the runtime.

A dynamically discovered tenant then enters the same registry as tenants that were configured at startup.

```ts 
const tenant =
  await MultiTenantManager.resolveTenant(
    "tenant5"
  );
```

At this point, if resolution succeeds, the tenant is known to the runtime.

A client can then be requested:

```ts
const client =
  await MultiTenantManager.getClient(
    "tenant5"
  );
```

The first operation answers:

> Does this tenant exist, and what is its configuration?

The second answers:

> Give me a usable MongoDB client for this tenant.

`getAllTenants()`

```ts
MultiTenantManager.getAllTenants()
```

Returns the tenants currently registered in the runtime.

This includes tenants that may not yet have active MongoDB clients.

Conceptually:

```rexr
Runtime Registry

tenant1  registered  lazy
tenant2  registered  lazy
tenant3  registered  lazy
tenant5  registered  connected
```

`getAllTenants()` represents the registry as a whole, not just active connections.

It is useful for runtime inspection, diagnostics, administration, and observability.

`getAllConnectedTenants()`

```text
MultiTenantManager.getAllConnectedTenants()
```

Returns only tenants that currently have active clients.

For example:

```text
tenants: 4
Connected tenants: 1
```

could mean:

```text
tenant1  lazy
tenant2  lazy
tenant3  lazy
tenant5  connected
```

Calling:

```ts
MultiTenantManager.getAllConnectedTenants();
```

would therefore return only the connected tenant state.

This is useful when application infrastructure needs to reason specifically about active database resources rather than every registered tenant.

`getStats()`

```ts
MultiTenantManager.getStats()
```

Returns a summary of the current multi-tenant runtime state.

For example:

```ts
const stats =
  MultiTenantManager.getStats();

console.log(stats);
```

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

These values describe different aspects of the runtime:

| Field                    | Meaning                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `registeredTenants`      | Number of tenants currently known to the runtime                    |
| `connectedTenants`       | Number of tenants with active MongoDB clients                       |
| `lazyTenants`            | Number of registered tenants still waiting for on-demand connection |
| `dynamicResolverEnabled` | Whether external tenant discovery is configured                     |

This makes `getStats()` useful for:

- runtime diagnostics,
- health endpoints,
- operational dashboards,
- development inspection,
- observability integrations.

`getTenant()`, `resolveTenant()`, and `getClient()`

These methods deliberately represent different levels of responsibility.

```text
getTenant()
    ↓
local registry lookup

resolveTenant()
    ↓
local registry
+
dynamic discovery

getClient()
    ↓
tenant resolution
+
connection guarantee
```

Or more directly:

```text
getTenant()
    ≠ external discovery

resolveTenant()
    = registry + external discovery

getClient()
    = resolution + usable MongoDB client
```

Choosing the correct method depends on what the caller actually needs.

### Inspect local state

```ts
const tenant =
  MultiTenantManager.getTenant("tenant5");
```
Use this when the tenant should already exist in the runtime.

### Discover a tenant if necessary

```ts
const tenant =
  await MultiTenantManager.resolveTenant(
    "tenant5"
  );
```

Use this when the tenant may need to be resolved externally.

### Require database access

```ts
const client =
  await MultiTenantManager.getClient(
    "tenant5"
  );
```

Use this when a live tenant client is required.

## MultiTenantManager vs AmbitenContext

`MultiTenantManager` and `AmbitenContext` solve different problems.

### AmbitenContext Solves

`AmbitenContext` describes the current execution.

```ts
AmbitenContext.get();
```

might return:

```ts
{
  tenantId: "tenant5",
  requestId: "req_123",
  dbName: undefined,
  collectionName: undefined
}
```

Its question is:

> What belongs to this request or operation?

### MultiTenantManager Solves

`MultiTenantManager` describes tenant infrastructure known to the process.

```ts
MultiTenantManager.getTenant("tenant5");
```

might represent:

```ts
{
  tenantId: "tenant5",
  uri: "...",
  dbName: "db_tenant5",
  lazy: false,
  metadata: {
    region: "de-west-1"
  }
}
```

Its question is:

> What configuration and resources belong to this tenant?

The distinction is:

```text
AmbitenContext
→ execution-scoped state

MultiTenantManager
→ runtime tenant state
```

A request can therefore carry only:

```text
tenantId = tenant5
```

while the manager knows:

```text
tenant5
├── MongoDB URI
├── database name
├── connection state
├── lazy state
└── metadata
```

The request does not need to carry infrastructure configuration.

```text
HTTP Request
   ↓
Framework Adapter
   ↓
TenantResolver
   ↓
tenantId = tenant5
   ↓
AmbitenContext
   ↓
Application
   ↓
UserModel.create(...)
   ↓
AmbitenClient
   ↓
MultiTenantManager
   ↓
resolveTenant("tenant5")
   ↓
getClient("tenant5")
   ↓
db_tenant5
   ↓
MongoDB operation
```

Application code remains focused on the operation:

```ts
await UserModel.create({
  username: "Abinod Ltd",
  email: "aemma@abinod.com"
});
```

rather than manually coordinating:

```text
tenant lookup
+
tenant registration
+
client creation
+
database selection
+
request context
```

That coordination belongs to the runtime.

## Using the Resolved Tenant Identity

Once a framework adapter has resolved the request's tenant, `AmbitenContext` should be treated as the runtime source of that execution identity.

For example:

```ts
const { tenantId } =
  AmbitenContext.get();

if (!tenantId) {
  throw new Error(
    "Tenant context is required."
  );
}
```

This is preferable to repeatedly reading the original transport-specific value:

```ts
req.headers["x-tenant-id"];
```

because the tenant may have been resolved from another source.

For example:

```text
header
cookie
route parameter
subdomain
token claim
custom resolver
```

All of these can ultimately result in:

```ts
AmbitenContext.get().tenantId;
```

The rest of the application can therefore remain independent of the original request mechanism.

## Application Code Usually Does Not Call the Manager Per Request

Although `MultiTenantManager` is publicly available, ordinary request handlers generally do not need to perform tenant management manually.

You normally do not need this:

```ts
app.post("/users", async (req, res) => {
  const tenantId =
    AmbitenContext.get().tenantId;

  await MultiTenantManager
    .resolveTenant(tenantId);

  await MultiTenantManager
    .getClient(tenantId);

  const user =
    await UserModel.create(req.body);

  res.json(user);
});
```

Instead:

```ts
app.post("/users", async (req, res) => {
  const user =
    await UserModel.create(req.body);

  res.json(user);
});
```

The active Ambiten context supplies the tenant identity and the runtime handles resource resolution when the model operation requires it.

Direct manager access is most useful for:

- tenant administration,
- diagnostics,
- infrastructure services,
- explicit tenant preloading,
- runtime inspection,
- advanced integration code.

## Avoid Mixing Request Identity and Tenant Infrastructure

A tenant identifier and a tenant configuration are not the same thing.

This:

```ts
{
  tenantId: "tenant5"
}
```

is enough to identify the tenant within an execution.

This:

```ts
{
  tenantId: "tenant5",
  uri: "...",
  dbName: "db_tenant5",
  lazy: true,
  metadata: {
    region: "de-west-1"
  }
}
```

belongs to tenant infrastructure.

Avoid propagating database URIs, connection state, or infrastructure metadata through application request layers.

Use:

```text
AmbitenContext
```

for execution identity and:

```text
MultiTenantManager
```

for tenant resources.

## Operational Model

A useful mental model is:

```text
                    PROCESS
                       │
              MultiTenantManager
                       │
       ┌───────────────┼───────────────┐
       │               │               │
    tenant1         tenant2         tenant5
    lazy            lazy            connected
                                       │
                                  db_tenant5

                     REQUEST
                       │
                AmbitenContext
                       │
                tenantId=tenant5
                       │
                 model operation
                       │
                       └──────────────→ tenant5
```

`MultiTenantManager` exists across requests.

`AmbitenContext` exists for the active execution.

That separation is what allows one application process to safely coordinate many tenant resources while each request retains its own tenant identity.

## Related Pages

Continue with:

- [Multi-Tenancy](./multi-tenant-manager) Overview — the overall Ambiten tenancy architecture.
- [Tenant Resolution](./tenant-resolver) — how a request becomes a tenant identity.
- [Dynamic Tenants](./dynamic-tenants) — resolving tenants that are not registered at startup.
- [Framework Adapters](./framework-adapters) — connecting framework request lifecycles to Ambiten's runtime context.

For exact method signatures, parameter types, and generated declarations, see the `MultiTenantManager` API reference.
