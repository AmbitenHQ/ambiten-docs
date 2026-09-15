---
title: Dynamic Tenants
description: Resolve and register tenants at runtime when they are not known during application startup.
---

# Dynamic Tenants

Dynamic tenants allow Ambiten to work with tenants that are not registered when the application starts.

Instead of requiring every tenant configuration to be loaded into memory during bootstrap, Ambiten can discover tenant infrastructure on demand when a request references an unknown tenant.

This makes dynamic tenancy suitable for systems where tenant configuration lives in an external source such as:

- a control database,
- a tenant registry service,
- a configuration API,
- an account service,
- a secrets-backed infrastructure store,
- or another application-defined configuration source.

The runtime flow is:

```text
Request
   ↓
TenantResolver
   ↓
tenantId
   ↓
AmbitenContext
   ↓
MultiTenantManager
   ↓
tenant registered?
   ├── yes → use existing configuration
   │
   └── no
        ↓
   TenantConfigResolver
        ↓
   external tenant lookup
        ↓
   tenant configuration found
        ↓
   register tenant
        ↓
   getClient()
        ↓
   tenant database
```

Dynamic discovery extends the local runtime registry without changing the way application code interacts with models.

A dynamically discovered tenant ultimately behaves like any other registered tenant.

## Static and Dynamic Tenants

Ambiten supports both static and dynamic tenant registration.

A static tenant is known when multi-tenancy is initialized.

For example:

```ts
await runtime.registerMultiTenancy({
  tenants: {
    tenant1: "mongodb://localhost:27017/db_tenant1",
    tenant2: "mongodb://localhost:27017/db_tenant2",
    tenant3: "mongodb://localhost:27017/db_tenant3"
  },
  lazy: true
});
```

These tenants enter the runtime registry during application startup.

A dynamic tenant is different.

For example:

```text
tenant5
```

may not exist in the local registry when the application starts.

Instead, Ambiten can discover it later:

```text
Application startup
   ↓
tenant1 registered
tenant2 registered
tenant3 registered

Later...

Request for tenant5
   ↓
tenant5 not registered
   ↓
dynamic resolution
   ↓
tenant5 registered
```

Static and dynamic tenants eventually share the same runtime infrastructure.

The difference is only **when and how their configuration becomes known**.

## TenantConfigResolver

Dynamic tenant discovery is handled through a `TenantConfigResolver`.

Its responsibility is simple:

> Given a tenant ID, return the infrastructure configuration required for that tenant.

Conceptually:

```text
tenantId
   ↓
TenantConfigResolver
   ↓
TenantConfig
```

A resolver may look like this:

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

The resolver does not need to know anything about:

```text
Express
Fastify
NestJS
HTTP headers
route parameters
cookies
controllers
models
```

It receives a resolved tenant identity and returns tenant infrastructure.

This keeps transport concerns separate from tenant configuration.

## TenantResolver vs TenantConfigResolver

Dynamic tenancy depends on an important distinction between two resolver types.

### TenantResolver

A request-facing tenant resolver answers:

> Which tenant does this request belong to?

For example:

```text
HTTP request
   ↓
x-tenant-id: tenant5
   ↓
TenantResolver
   ↓
tenant5
```

The result is only the identity:

```ts
"tenant5"
```

### TenantConfigResolver

A tenant configuration resolver answers:

> Where does tenant5 live?

For example:

```text
tenant5
   ↓
TenantConfigResolver
   ↓
MongoDB URI
database name
metadata
lazy configuration
```

Conceptually:

```text
TenantResolver
→ request → tenantId

TenantConfigResolver
→ tenantId → tenant configuration
```

The request resolver should not need to know the tenant's MongoDB connection information.

The configuration resolver should not need to understand the incoming HTTP request.

This separation allows each concern to evolve independently.

## Dynamic Resolution Flow

Suppose the runtime starts with three tenants:

```text
tenant1
tenant2
tenant3
```

and all three are registered in lazy mode.

Runtime statistics may initially show:

```ts
{
  registeredTenants: 3,
  connectedTenants: 0,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

A request then arrives with:

```http
x-tenant-id: tenant5
```

The adapter resolves:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

When the runtime needs tenant infrastructure:

```ts
await MultiTenantManager.resolveTenant(
  "tenant5"
);
```

Ambiten follows this path:

```text
resolveTenant("tenant5")
        ↓
getTenant("tenant5")
        ↓
not registered
        ↓
TenantConfigResolver.resolve("tenant5")
        ↓
configuration found
        ↓
register tenant5
        ↓
return tenant config
```

The tenant is now part of the local runtime registry.

If a database operation then requires an active client:

```ts
await MultiTenantManager.getClient(
  "tenant5"
);
```

the flow continues:

```text
tenant5 registered
     ↓
client available?
  ┌──┴──┐
 yes    no
  ↓      ↓
return   connect
client     ↓
         return client
```

The resulting tenant state may look like:

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

while the aggregate runtime statistics become:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

Only the tenant that required database access has become connected.

The original three tenants remain lazy.

## Dynamic Discovery Does Not Mean Immediate Connection

Tenant discovery and database connection are separate operations.

When:

```ts
await MultiTenantManager.resolveTenant(
  "tenant5"
);
```

succeeds, the tenant can become registered without necessarily opening a MongoDB client immediately.

Conceptually:

```text
unknown
   ↓
resolved
   ↓
registered
   ↓
still lazy
```

A connection is only required when:

```ts
await MultiTenantManager.getClient(
  "tenant5"
);
```

or another runtime operation requires database access.

The lifecycle may therefore be:

```text
unknown tenant
      ↓
resolved externally
      ↓
registered
      ↓
lazy
      ↓
first database operation
      ↓
connected
```

This separation helps prevent unnecessary tenant connections from being opened simply because tenant configuration was discovered.

## Dynamic Resolution Through Model Operations

In normal application code, developers usually do not need to manually orchestrate dynamic resolution.

For example:

```ts
app.post("/users", async (req, res) => {
  const user =
    await UserModel.create(req.body);

  res.status(201).json(user);
});
```

If the active context contains:

```ts
{
  tenantId: "tenant5"
}
```

and `"tenant5"` has not been registered yet, Ambiten can resolve the tenant as part of the runtime database-selection path.

Conceptually:

```text
UserModel.create(...)
       ↓
AmbitenContext
tenantId = tenant5
       ↓
AmbitenClient
       ↓
MultiTenantManager
       ↓
tenant5 registered?
       ↓ no
TenantConfigResolver
       ↓
tenant5 configuration
       ↓
register
       ↓
getClient()
       ↓
db_tenant5
       ↓
insert
```

Application code remains focused on the model operation.

It does not need to manually coordinate:

```text
tenant discovery
tenant registration
client creation
database selection
```

for every request.

## Validation with Dynamic Tenants

Tenant validation can participate in dynamic discovery.

For example:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant =
        await MultiTenantManager.resolveTenant(
          tenantId
        );

      if (!tenant) {
        throw new Error(
          `Tenant with ID "${tenantId}" not found.`
        );
      }

      return true;
    }
  }
});
```

This allows a request to reference a tenant that is valid but not yet registered locally.

The flow becomes:

```text
Request
   ↓
tenant5
   ↓
validate("tenant5")
   ↓
resolveTenant("tenant5")
   ↓
local registry miss
   ↓
TenantConfigResolver
   ↓
tenant found
   ↓
register
   ↓
validation succeeds
   ↓
AmbitenContext
```

This avoids requiring the application to preload every valid tenant during startup.

## Missing Dynamic Tenants

A dynamic resolver may return no configuration.

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
      lazy: true
    };
  }
});
```

For an unknown tenant:

```text
tenant999
```

the flow may become:

```text
tenant999
   ↓
local registry miss
   ↓
TenantConfigResolver
   ↓
no configuration
   ↓
unresolved tenant
```

Application behavior should then follow the tenancy policy configured at the adapter or service boundary.

For tenant-required routes, unresolved tenants should normally be rejected rather than silently falling back to another tenant.

## Avoid Default-Tenant Fallback for Unknown Dynamic Tenants

Dynamic tenant resolution should not be treated as:

```text
tenant not found
   ↓
use default database
```

That behavior can break tenant isolation.

If the request belongs to:

```text
tenant5
```

but `"tenant5"` cannot be resolved, the safer runtime invariant is:

```text
tenant5 unresolved
        ↓
do not continue as another tenant
```

A multi-tenant system should avoid silently converting:

```text
unknown tenant
```

into:

```text
global/default tenant
```

unless the application has explicitly designed that behavior for a specific non-tenant route.

## Concurrent Dynamic Resolution

In a real application, multiple requests may reference the same previously unknown tenant at nearly the same time.

Conceptually:

```text
Request A → tenant5
Request B → tenant5
Request C → tenant5
```

Without coordination, all three requests could attempt the same external lookup or registration work.

`MultiTenantManager.resolveTenant()` is designed as the central resolution path so that dynamic resolution can be coordinated at the runtime level rather than independently by controllers or services.

Application code should therefore prefer:

```ts
await MultiTenantManager.resolveTenant(
  tenantId
);
```

over directly calling a tenant configuration resolver itself.

The manager is the owner of the runtime registry.

The resolver is only the provider of external configuration.

```text
Application
    ↓
MultiTenantManager
    ↓
TenantConfigResolver
```

rather than:

```text
Application
    ↓
TenantConfigResolver directly
```

This keeps dynamic discovery, registration, and runtime state under one authority.

## External Tenant Stores

The resolver can use any external source that can provide the required tenant configuration.

### Control Database

```ts
async function lookupTenant(
  tenantId: string
) {
  return controlDb
    .collection("tenants")
    .findOne({ tenantId });
}
```

The resolver can then map the stored record into the configuration expected by Ambiten:

```ts
MultiTenantManager.setTenantConfigResolver({
  async resolve(tenantId) {
    const record =
      await lookupTenant(tenantId);

    if (!record) {
      return undefined;
    }

    return {
      tenantId,
      uri: record.mongoUri,
      dbName: record.databaseName,
      lazy: true,
      metadata: {
        region: record.region,
        tier: record.tier
      }
    };
  }
});
```

### Configuration Service

An application may instead call an internal service:

```ts
async function lookupTenant(
  tenantId: string
) {
  const response =
    await fetch(
      `https://tenant-control.internal/${tenantId}`
    );

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(
      "Tenant configuration service unavailable."
    );
  }

  return response.json();
}
```

The source is application-defined.

The runtime contract remains the same:

```text
tenantId
   ↓
resolver
   ↓
tenant configuration
```

## Tenant Metadata

Dynamic configuration may include tenant metadata.

For example:

```ts
return {
  tenantId,
  uri: config.uri,
  dbName: config.dbName,
  lazy: true,

  metadata: {
    region: config.region,
    tier: config.tier
  }
};
```

The resulting registered tenant may expose:

```ts
{
  tenantId: "tenant5",
  dbName: "db_tenant5",
  metadata: {
    region: "de-west-1",
    tier: "supreme"
  }
}
```

Metadata can be useful for:

- observability,
- operational diagnostics,
- region awareness,
- tenant classification,
- infrastructure decisions.

Metadata is runtime tenant information.

It should not be confused with request-scoped context.

## Dynamic Tenant Metadata vs AmbitenContext Metadata

These two concepts serve different purposes.

Tenant configuration metadata:

```ts
{
  region: "de-west-1",
  tier: "supreme"
}
```

describes the tenant.

Request context metadata:

```ts
AmbitenContext.get().meta
```

describes the active execution.

Conceptually:

```text
Tenant metadata
→ belongs to the tenant

Context metadata
→ belongs to this request/operation
```

The fact that both may contain application-defined information does not make them interchangeable.

## Dynamic Tenants and Lazy Connections

Dynamic resolution works especially well with lazy connections.

A tenant can be discovered and registered without requiring the runtime to keep every possible tenant connected.

Imagine an application serving thousands of tenants.

Opening every connection at startup would create a runtime model like:

```text
startup
   ↓
connect tenant1
connect tenant2
connect tenant3
...
connect tenant5000
```

Dynamic resolution with lazy activation instead allows:

```text
startup
   ↓
load only required static configuration
   ↓
wait for requests

tenant317 request
   ↓
discover tenant317
   ↓
connect tenant317

tenant842 request
   ↓
discover tenant842
   ↓
connect tenant842
```

This allows runtime resource usage to follow actual application demand rather than the total theoretical tenant population.

## Dynamic Tenants Are Registered Locally After Resolution

Once a dynamic tenant has been successfully resolved, it becomes part of the current runtime registry.

For example:

```ts
await MultiTenantManager.resolveTenant(
  "tenant5"
);
```

followed by:

```ts
const tenant =
  MultiTenantManager.getTenant(
    "tenant5"
  );
```

can now return the locally registered configuration.

The runtime therefore moves through:

```text
before resolution

getTenant("tenant5")
→ not registered
```

then:

```text
resolveTenant("tenant5")
→ external lookup
→ registered
```

then:

```text
getTenant("tenant5")
→ local registry hit
```

This means external discovery is not required every time the tenant is referenced during the lifetime of that runtime registration.

## `getTenant()` vs `resolveTenant()` for Dynamic Tenants

The distinction between these methods is especially important for dynamic tenancy.

### `getTenant()`

```ts
MultiTenantManager.getTenant(
  "tenant5"
);
```

asks:

> Is tenant5 already registered here?

It does not perform external discovery.

### `resolveTenant()`

```ts
await MultiTenantManager.resolveTenant(
  "tenant5"
);
```

asks:

> Can Ambiten resolve tenant5, either locally or externally?

Conceptually:

```text
getTenant()
    = local registry only

resolveTenant()
    = local registry
      +
      TenantConfigResolver
```

For dynamic tenants, use `resolveTenant()` when external discovery is permitted or required.

## `resolveTenant()` vs `getClient()`

Dynamic discovery and active database access are also separate concerns.

```ts
await MultiTenantManager.resolveTenant(
  "tenant5"
);
```

means:

> Resolve and register this tenant if possible.

While:

```ts
await MultiTenantManager.getClient(
  "tenant5"
);
```

means:

> Resolve this tenant if necessary and give me a usable MongoDB client.

The relationship is:

```text
resolveTenant()
    = identity → configuration

getClient()
    = identity → configuration → connection
```

This distinction allows tenant configuration to be inspected without necessarily opening a database connection.

## Dynamic Tenant Lifecycle

A dynamically discovered tenant typically moves through these states:

```text
UNKNOWN
   ↓
request references tenant
   ↓
RESOLVING
   ↓
TenantConfigResolver
   ↓
REGISTERED
   ↓
lazy
   ↓
database operation
   ↓
CONNECTING
   ↓
CONNECTED
```

In simplified form:

```text
unknown
→ resolved
→ registered
→ connected when needed
```

The transition from registered to connected is intentionally independent from discovery.

## Dynamic Tenants and Model Routing

Once the dynamic tenant has entered the runtime, Ambiten models use the same routing behavior as they do for statically registered tenants.

For example:

```ts
const user =
  await UserModel.create({
    username: "Abinod Ltd",
    email: "aemma@abinod.com"
  });
```

with:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

can result in:

```text
UserModel
   ↓
tenant5
   ↓
db_tenant5
```

The model does not need to know whether `"tenant5"` was:

```text
registered during startup
```

or:

```text
discovered thirty milliseconds ago
```

That distinction belongs to the runtime.

## Dynamic Tenants and Framework Adapters

Framework adapters resolve request identity but do not own dynamic tenant infrastructure.

For example:

```text
Express
Fastify
NestJS
   ↓
TenantResolver
   ↓
tenant5
   ↓
AmbitenContext
```

The adapter does not need to know:

```text
tenant5 MongoDB URI
tenant5 database name
tenant5 region
tenant5 connection state
```

Those remain under `MultiTenantManager`.

This gives the architecture a clear boundary:

```text
Framework Adapter
→ request identity

MultiTenantManager
→ tenant infrastructure
```

See [Framework Adapters](./framework-adapters) for request integration.

## Failure Handling

Dynamic tenant resolution can fail for more than one reason.

### Tenant Does Not Exist

The resolver may return:

```ts
undefined
```

when the tenant is unknown.

This is a normal resolution outcome.

### External Resolver Failure

The configuration source may be unavailable:

```text
tenant registry unavailable
network failure
control database unavailable
```

That is different from:

```text
tenant does not exist
```

Applications should preserve this distinction where operationally important.

For example:

```ts
async resolve(tenantId) {
  try {
    const config =
      await tenantService.find(tenantId);

    return config ?? undefined;
  } catch (error) {
    throw new Error(
      `Unable to resolve tenant "${tenantId}".`,
      { cause: error }
    );
  }
}
```

Returning `undefined` should generally mean:

```text
tenant not found
```

while throwing should represent:

```text
resolution failed
```

This distinction can improve diagnostics and observability.

## Security Considerations

A dynamically resolved tenant ID should not automatically be treated as proof that the requester is authorized to use that tenant.

For example:

```http
x-tenant-id: tenant5
```

may successfully resolve `"tenant5"` from the tenant registry.

That only proves:

```text
tenant5 exists
```

It does not prove:

```text
this requester may access tenant5
```

A secure application may need:

```text
Authentication
   ↓
Authenticated identity
   ↓
Requested tenant
   ↓
Authorization
   ↓
Tenant resolution
   ↓
AmbitenContext
```

or another policy appropriate to the application's security model.

Tenant discovery and tenant authorization are separate concerns.

## Avoid Putting Tenant Secrets in Request Context

Dynamic tenant configuration may contain sensitive infrastructure values such as:

```text
MongoDB URI
credentials
service endpoints
internal metadata
```

These values belong to the tenant resource layer.

Do not copy them into:

```ts
AmbitenContext
```

unless there is a specific request-scoped reason to do so.

Prefer:

```text
AmbitenContext
→ tenantId

MultiTenantManager
→ URI, dbName, client, metadata
```

This reduces unnecessary propagation of infrastructure data through application layers.

## Operational Example

Consider a runtime initialized with:

```text
tenant1
tenant2
tenant3
```

all in lazy mode.

Initial state:

```ts
{
  registeredTenants: 3,
  connectedTenants: 0,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

A request arrives:

```http
POST /users
x-tenant-id: tenant5
```

Tenant resolution produces:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

The validator or model path invokes:

```ts
await MultiTenantManager.resolveTenant(
  "tenant5"
);
```

The external resolver returns:

```ts
{
  tenantId: "tenant5",
  uri: "...",
  dbName: "db_tenant5",
  lazy: true,
  metadata: {
    region: "de-west-1",
    tier: "supreme"
  }
}
```

A model operation then requires the client:

```ts
await UserModel.create({
  username: "Abinod Ltd",
  email: "aemma@abinod.com"
});
```

The resulting tenant state becomes:

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

and runtime statistics become:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

This demonstrates the complete dynamic lifecycle:

```text
request identity
      ↓
unknown tenant
      ↓
external discovery
      ↓
registration
      ↓
lazy activation
      ↓
correct tenant database
```

## Recommended Mental Model

A useful way to think about dynamic tenancy is:

```text
TenantResolver
→ Who?

TenantConfigResolver
→ Where?

MultiTenantManager.resolveTenant()
→ Does Ambiten know how to reach this tenant?

MultiTenantManager.getClient()
→ Give Ambiten an active resource for this tenant.

AmbitenContext
→ Which tenant belongs to this execution?
```

Or as one flow:

```text
Request
   ↓
Who?
   ↓
tenant5
   ↓
Where?
   ↓
db_tenant5
   ↓
Need database access?
   ↓
connect when required
   ↓
execute operation
```

This keeps request identity, external discovery, resource lifecycle, and database access related without collapsing them into the same concern.

## Related Pages

Continue with:

- [Multi-Tenancy Overview](./overview) — the overall Ambiten multi-tenancy architecture.
- [Tenant Resolution](./tenant-resolution) — how incoming requests are mapped to tenant identities.
- [MultiTenantManager](./multi-tenant-manager) — tenant registry, lookup, discovery, connection lifecycle, and runtime state.
- [Framework Adapters](./framework-adapters) — how framework requests enter Ambiten's execution context.

For exact `TenantConfigResolver`, `TenantConfig`, and `MultiTenantManager` type signatures, see the corresponding Ambiten API reference.