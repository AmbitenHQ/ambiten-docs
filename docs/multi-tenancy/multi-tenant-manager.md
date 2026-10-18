---
title: MultiTenantManager
description: Manage tenant registration, dynamic discovery, MongoDB client resolution, and runtime tenancy state in Ambiten.
---

# MultiTenantManager

`MultiTenantManager` is Ambiten's runtime registry and resource manager for multi-tenant applications.

It tracks registered tenants, discovers configuration for tenants not yet known locally, creates and reuses tenant MongoDB clients, and exposes runtime tenancy state.

Request-facing tenant resolution determines which tenant an execution belongs to. `AmbitenContext` carries that identity through the execution.

| Component | Responsibility |
| --- | --- |
| `TenantResolver` | Derives tenant identity from a request. |
| `AmbitenContext` | Carries tenant identity and other execution state. |
| `MultiTenantManager` | Registers tenants and resolves their configuration and clients. |
| `TenantConfigResolver` | Supplies external configuration for an unregistered tenant. |
| Tenant-aware provider | Selects the database used by model operations. |

The manager's registry persists across requests within the application process. It is separate from request-scoped context.

## Responsibilities

`MultiTenantManager` coordinates:

- Tenant registration.
- Local tenant lookup.
- Dynamic tenant discovery.
- MongoDB client creation and reuse.
- Inspection of registered, connected, and lazy tenant state.

Registration and connection are separate actions.

A tenant can be registered without having a MongoDB client. In lazy mode, its connection is deferred until an operation requests the client.

Removing a registry entry is also separate from closing its client. Registry cleanup behavior is described below.

## Tenant Configuration

A registered tenant contains both infrastructure configuration and manager-owned runtime state:

```ts
import type { MongoClient } from "mongodb";

interface TenantConfig {
  tenantId: string;
  uri: string;
  dbName: string;
  client?: MongoClient;
  lazy: boolean;
  metadata?: Record<string, unknown>;
}
```

For example, a lazily registered tenant may contain:

```ts
const tenant = {
  tenantId: "tenant5",
  uri: "mongodb://localhost:27017/db_tenant5",
  dbName: "db_tenant5",
  client: undefined,
  lazy: true,
  metadata: {
    region: "de-west-1",
    tier: "supreme",
  },
};
```

This record belongs to the runtime registry.

A request can carry only its tenant identity through `AmbitenContext`, while the manager holds the configuration needed to reach that tenant.

`TenantConfig` differs from `ResolvedTenantConfig`, which describes the external configuration returned by a dynamic resolver. The resolver supplies `uri`, optional `dbName`, and optional `metadata`; the manager supplies tenant identity, client, and lazy state.

## getTenant()

```ts
const tenant = MultiTenantManager.getTenant("tenant5");
```

`getTenant()` performs a synchronous lookup against the local registry.

- If the tenant is registered, it returns its configuration.
- If the tenant is absent, it returns `undefined`.
- It does not invoke the external resolver.

For example:

```ts
const tenant = MultiTenantManager.getTenant("tenant5");

if (tenant) {
  console.log({
    tenantId: tenant.tenantId,
    dbName: tenant.dbName,
    lazy: tenant.lazy,
    hasClient: Boolean(tenant.client),
  });
}
```

The returned record is a shallow copy. Nested metadata and the client instance are not deep-cloned. Treat lookup results as inspection data rather than a supported way to modify registration state.

Pass a non-empty tenant ID. Invalid tenant IDs throw rather than behaving as ordinary missing-tenant lookups.

### When to Use getTenant()

Use it when you want to:

- Inspect a tenant expected to be registered.
- Read registered tenant metadata.
- Examine lazy state or client presence.
- Avoid triggering external discovery.

Use `resolveTenant()` when the tenant may need to be discovered.

## resolveTenant()

```ts
const tenant = await MultiTenantManager.resolveTenant("tenant5");
```

`resolveTenant()` checks the local registry first.

If the tenant is absent and a configuration resolver is installed, it invokes that resolver. A successfully discovered tenant is registered lazily before its configuration is returned.

```ts
const tenant = await MultiTenantManager.resolveTenant("tenant5");

if (!tenant) {
  throw new Error('Tenant "tenant5" could not be resolved.');
}

console.log(tenant.dbName);
```

The method returns `undefined` when:

- The tenant is absent and no resolver is configured.
- The resolver returns `null` or `undefined`.

Invalid configuration or failures inside the resolver can throw.

Resolving configuration does not open the discovered tenant's MongoDB connection. The external lookup may perform its own database or network operations.

### Local and Dynamic Resolution

| Method | Local lookup | External discovery | Opens a tenant connection |
| --- | --- | --- | --- |
| `getTenant()` | Yes | No | No |
| `resolveTenant()` | Yes | When needed and configured | No |
| `getClient()` | Yes, through tenant resolution | When needed and configured | For a resolved lazy tenant |

Once registered, a tenant is returned from the local registry without repeating the external lookup.

Changes in an external tenant source are not automatically refreshed in an existing registration.

Concurrent discovery calls for the same tenant ID share an in-flight lookup within the process. This does not imply the same coordination for concurrent client creation or across separate processes.

## getClient()

```ts
const client = await MultiTenantManager.getClient("tenant5");
```

`getClient()` resolves the tenant and attempts to obtain its MongoDB client.

It:

1. Resolves the tenant configuration.
2. Returns the registered client when one exists.
3. Creates and connects a client when the tenant is lazy.
4. Stores the client and sets `lazy` to `false` after a successful connection.

The return type is `Promise<MongoClient | null>`.

An unresolved tenant produces `null`. Resolution and connection failures can throw. The method does not guarantee that every call succeeds.

For direct database access:

```ts
const tenantId = "tenant5";

const tenant = await MultiTenantManager.resolveTenant(tenantId);

if (!tenant) {
  throw new Error(`Tenant "${tenantId}" could not be resolved.`);
}

const client = await MultiTenantManager.getClient(tenantId);

if (!client) {
  throw new Error(`No MongoDB client is available for "${tenantId}".`);
}

const db = client.db(tenant.dbName);
```

In ordinary model operations, application code usually does not need to call `getClient()` directly.

With a tenant-aware provider configured, the model uses the active execution context to obtain the appropriate database resources:

```ts
const user = await UserModel.create({
  username: "Abinod Ltd",
  email: "aemma@abinod.com",
});
```

Direct client access is mainly useful for infrastructure operations and advanced integrations.

## Lazy Tenant Activation

Consider an application with three tenants registered lazily and a dynamic resolver configured.

At startup:

```ts
const stats = MultiTenantManager.getStats();
```

The result might be:

```json
{
  "registeredTenants": 3,
  "connectedTenants": 0,
  "lazyTenants": 3,
  "dynamicResolverEnabled": true
}
```

Now a request arrives for `"tenant5"`.

If the external resolver finds its configuration, the manager registers it lazily. A subsequent database operation requests its client and establishes the connection.

To inspect its resulting state:

```ts
const tenant = MultiTenantManager.getTenant("tenant5");

const summary = tenant
  ? {
      tenantId: tenant.tenantId,
      dbName: tenant.dbName,
      connected: Boolean(tenant.client),
      lazy: tenant.lazy,
      metadata: tenant.metadata,
    }
  : undefined;

console.log(summary);
```

`connected` is a derived value in this example. It is not a property of `TenantConfig`.

After successful connection, the summary may contain:

```json
{
  "tenantId": "tenant5",
  "dbName": "db_tenant5",
  "connected": true,
  "lazy": false,
  "metadata": {
    "region": "de-west-1",
    "tier": "supreme"
  }
}
```

Runtime statistics would then reflect:

```json
{
  "registeredTenants": 4,
  "connectedTenants": 1,
  "lazyTenants": 3,
  "dynamicResolverEnabled": true
}
```

The three unused tenants remain lazy.

For bootstrap configuration, `multiTenant.initOptions.lazy` controls initialization of the static tenant map. Dynamically discovered tenants are registered lazily by the manager.

## Dynamic Tenant Configuration

Dynamic discovery uses a `TenantConfigResolver` function.

A minimal, self-contained example is:

```ts
import { MultiTenantManager } from "@ambiten/core";
import type { TenantConfigResolver } from "@ambiten/core";

const resolver: TenantConfigResolver = (tenantId) => {
  if (tenantId !== "tenant5") {
    return undefined;
  }

  return {
    uri: "mongodb://localhost:27017/db_tenant5",
    dbName: "db_tenant5",
    metadata: {
      region: "de-west-1",
      tier: "supreme",
    },
  };
};

MultiTenantManager.setTenantConfigResolver(resolver);
```

This example recognizes one tenant. Replace the function body with an external lookup when configuration lives in a control database, registry service, configuration API, or another application-defined source.

The resolver may be synchronous or asynchronous.

Its result follows this contract:

```ts
interface ResolvedTenantConfig {
  uri: string;
  dbName?: string;
  metadata?: Record<string, unknown>;
}
```

Return `null` or `undefined` when the tenant does not exist.

`setTenantConfigResolver()` validates and stores the function. It does not call it or register tenants immediately.

The setter accepts a function, not an object containing a `resolve()` method.

If the application organizes its resolver as an object, pass a callback that invokes the method:

```ts
const tenantResolver = {
  resolve: resolver,
};

MultiTenantManager.setTenantConfigResolver((tenantId) =>
  tenantResolver.resolve(tenantId)
);
```

Use this as an alternative to registering the function directly.

To trigger discovery:

```ts
const tenant = await MultiTenantManager.resolveTenant("tenant5");
```

To request database access:

```ts
const client = await MultiTenantManager.getClient("tenant5");

if (!client) {
  throw new Error('Tenant "tenant5" could not provide a client.');
}
```

Bootstrap can register the resolver through `multiTenant.tenantConfigResolver`. JSON configuration can reference its exported function through `multiTenant.tenantConfigResolverModule`.

See [Dynamic Tenants](./dynamic-tenants) for complete configuration examples.

### Clearing the Resolver

```ts
MultiTenantManager.clearTenantConfigResolver();
```

This removes the configured resolver function.

Existing registrations and clients remain in the registry. Clearing the resolver does not close connections or remove registered tenants.

## getAllTenants()

```ts
const tenants = MultiTenantManager.getAllTenants();
```

Returns a `TenantConfig[]` containing the tenants currently registered with the manager.

This includes:

- Statically configured tenants.
- Manually registered tenants.
- Dynamically discovered tenants that have already been registered.
- Lazy tenants without clients.
- Tenants with registered clients.

It does not enumerate every tenant that exists in an external configuration source.

For example:

```ts
const summaries = MultiTenantManager.getAllTenants().map((tenant) => ({
  tenantId: tenant.tenantId,
  dbName: tenant.dbName,
  lazy: tenant.lazy,
  hasClient: Boolean(tenant.client),
}));

console.log(summaries);
```

Each returned record is a shallow copy. Nested metadata and client instances retain their references.

## getAllConnectedTenants()

```ts
const tenantIds = MultiTenantManager.getAllConnectedTenants();
```

Returns a `string[]` of tenant IDs whose registry records contain a client.

For example:

```ts
["tenant5"]
```

It does not return tenant configuration objects.

To inspect the corresponding records:

```ts
for (const tenantId of MultiTenantManager.getAllConnectedTenants()) {
  const tenant = MultiTenantManager.getTenant(tenantId);

  console.log({
    tenantId,
    dbName: tenant?.dbName,
  });
}
```

The result reflects client presence in the registry. It is not a live connectivity check.

## getStats()

```ts
const stats = MultiTenantManager.getStats();

console.log(stats);
```

Example:

```json
{
  "registeredTenants": 4,
  "connectedTenants": 1,
  "lazyTenants": 3,
  "dynamicResolverEnabled": true
}
```

| Field | Meaning |
| --- | --- |
| `registeredTenants` | Number of tenant records in the local registry. |
| `connectedTenants` | Number of records containing a client instance. |
| `lazyTenants` | Number of records whose `lazy` flag is `true`. |
| `dynamicResolverEnabled` | Whether a tenant configuration resolver is installed. |

These statistics are useful for runtime inspection, diagnostics, and operational dashboards.

They describe registry state rather than database health. Closing a client externally does not automatically remove its registry reference.

The counts cover tenant registrations managed here. A separate base connection opened during application bootstrap is not included.

## Choosing the Appropriate Lookup

### Inspect Local State

```ts
const tenant = MultiTenantManager.getTenant("tenant5");
```

Use this when you want local state without external discovery.

### Discover a Tenant if Necessary

```ts
const tenant = await MultiTenantManager.resolveTenant("tenant5");
```

Use this when the tenant may exist outside the local registry.

### Require Database Access

```ts
const client = await MultiTenantManager.getClient("tenant5");

if (!client) {
  throw new Error('Tenant "tenant5" could not provide a client.');
}
```

Use this when infrastructure code needs the tenant's MongoDB client.

### Read the Database Name

For a local-only lookup:

```ts
const dbName = MultiTenantManager.getTenant("tenant5")?.dbName;
```

To allow discovery:

```ts
const dbName = await MultiTenantManager.resolveTenantDbName("tenant5");
```

`getTenantDbName()` is also asynchronous in the current implementation and can fall back to dynamic resolution:

```ts
const dbName = await MultiTenantManager.getTenantDbName("tenant5");
```

Use the local `getTenant()` lookup when external discovery must not occur.

## MultiTenantManager vs AmbitenContext

### AmbitenContext

`AmbitenContext` describes the active execution.

```ts
const context = AmbitenContext.get();

console.log({
  tenantId: context.tenantId,
  requestId: context.requestId,
});
```

Its question is:

> What identity and state belong to this request or operation?

### MultiTenantManager

`MultiTenantManager` describes tenant infrastructure registered in the process.

```ts
const tenant = MultiTenantManager.getTenant("tenant5");

console.log({
  tenantId: tenant?.tenantId,
  dbName: tenant?.dbName,
  lazy: tenant?.lazy,
});
```

Its question is:

> What configuration and resources belong to this tenant?

A request can carry its tenant ID while the manager holds the URI, database name, client, lazy state, and metadata.

When the model uses a tenant-aware provider, these responsibilities cooperate during database access without requiring application code to coordinate each step manually.

## Using the Resolved Tenant Identity

After the framework adapter establishes tenant context, use that context as the source of the execution's tenant identity:

```ts
const { tenantId } = AmbitenContext.get();

if (!tenantId) {
  throw new Error("Tenant context is required.");
}
```

The tenant may have been resolved from a header, cookie, route parameter, subdomain, or custom authentication-aware resolver.

Reading the context keeps downstream application code independent of the original request mechanism.

The manager's inspection methods do not identify the current request's tenant. That identity comes from the active context.

## Application Code Usually Does Not Call the Manager Per Request

Ordinary request handlers generally do not need to call `resolveTenant()` and `getClient()` before every model operation.

With tenant context established and a tenant-aware provider configured:

```ts
app.post("/users", async (req, res, next) => {
  try {
    const user = await UserModel.create(req.body);

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});
```

The provider uses the active context to obtain tenant resources when the operation needs them.

With `AmbitenBootstrapFactory`, enable `multiTenant.enabled` so bootstrap configures the tenant-aware provider. Manually constructed providers require the corresponding tenant resolver configuration.

Direct manager access remains useful for:

- Tenant registration and preloading.
- Tenant validation.
- Runtime inspection and diagnostics.
- Infrastructure services.
- Advanced integrations.

## Avoid Mixing Request Identity and Tenant Infrastructure

A tenant ID identifies the tenant associated with an execution.

A tenant configuration describes how the runtime reaches that tenant and what resources it has registered.

Keep connection URIs, client instances, and registration state in the infrastructure layer.

`AmbitenContext` may contain execution-specific database overrides, sessions, or application metadata. It should not become a replacement for the tenant registry.

Tenant metadata is not automatically copied into the execution context.

## Registry Removal and Client Cleanup

To remove one registration:

```ts
const removed = MultiTenantManager.removeTenant("tenant5");
```

The method returns `true` when a registered entry was removed and `false` when it was absent.

To clear all registrations:

```ts
MultiTenantManager.clearTenants();
```

These methods remove registry entries. They do not call `MongoClient.close()`.

Coordinate client shutdown separately, taking account of active operations and any shared client ownership.

Removing a tenant also does not delete its external configuration. If the configured resolver can still find that tenant, a later lookup can register it again.

`clearTenants()` leaves the configured resolver installed. Use `clearTenantConfigResolver()` separately when external discovery should also be disabled.

Registry removal is therefore not a complete tenant-deactivation or authorization mechanism.

## Operational Model

The manager's registry is local to the application process and persists across requests.

Each request or explicitly established background execution has its own `AmbitenContext`.

For example:

| Scope | Example state |
| --- | --- |
| Runtime registry | `tenant1` and `tenant2` are lazy; `tenant5` has a client. |
| Current execution | `tenantId` is `"tenant5"`. |
| Model operation | The tenant-aware provider obtains resources for `"tenant5"`. |

Separate application processes maintain their own registrations and clients. Registering a tenant in one process does not populate another process's registry.

An external tenant configuration source can provide shared configuration, while each process maintains the resources it needs locally.

## Related Pages

Continue with:

- [Multi-Tenancy Overview](./overview) — the overall Ambiten tenancy architecture.
- [Tenant Resolution](./tenant-resolver) — how a request becomes a tenant identity.
- [Dynamic Tenants](./dynamic-tenants) — resolving tenants that are not registered at startup.
- [Framework Adapters](./framework-adapters) — connecting framework request lifecycles to Ambiten's execution context.

For exact method signatures and parameter types, see the `MultiTenantManager` API reference.