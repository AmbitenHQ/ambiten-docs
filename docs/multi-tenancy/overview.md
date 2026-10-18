# Multi-Tenancy Overview

Ambiten provides multi-tenancy as part of its runtime rather than as a convention that every application layer must implement independently.

A tenant identity can enter an application through an HTTP header, route parameter, cookie, token, subdomain, or custom resolver. Once resolved, Ambiten carries that identity through the active execution context and uses it when database resources are selected.

This allows application code to work with Ambiten models without manually passing a tenant identifier through every function call.

<MultiTenancyOverview />

The multi-tenant runtime separates responsibilities:

| Component | Responsibility |
| --- | --- |
| Tenant resolution | Determines which tenant a request belongs to. |
| `AmbitenContext` | Carries tenant identity and other execution state through the current asynchronous execution. |
| `MultiTenantManager` | Manages tenant configuration, discovery, registration, and MongoDB client creation and reuse. |
| `AmbitenClient` | Resolves the database required by the active tenant through its configured tenant-aware provider. |
| `AmbitenModel` | Performs operations against the database selected for the current execution. |

When using `AmbitenBootstrapFactory`, enable `multiTenant.enabled` so bootstrap configures the tenant-aware database provider. Applications that construct providers manually must supply the corresponding tenant resolver themselves.

Tenant identity in the context and tenant-aware database configuration work together to route model operations.

## Request-Scoped Tenant Identity

When a framework adapter receives a request, it resolves the tenant using the configured tenancy strategy.

For example, with an initialized adapter:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
  },
});
```

A request such as:

```http
POST /users HTTP/1.1
Host: api.example.com
x-tenant-id: tenant5
```

makes the resolved tenant identity available inside the request's Ambiten execution context:

```ts
const { tenantId } = AmbitenContext.get();

// tenantId === "tenant5"
```

The context may also contain a request ID, database name, session, logger, and other execution state, depending on the application's configuration.

The resolved tenant identity belongs to the current execution. Application code does not need to repeatedly read the original HTTP header or manually forward `"tenant5"` through each service and model operation.

Tenant resolution is not tied specifically to HTTP headers. A custom resolver may derive the same tenant identity from another source while the rest of the runtime continues to use the context.

Resolving a tenant ID does not establish authorization. The application must still verify that the requester is allowed to access that tenant.

## Static and Dynamic Tenants

Ambiten supports both statically configured tenants and dynamically discovered tenants.

A static tenant is known when multi-tenancy is initialized.

For example, the `multiTenant` section of an application configuration may contain:

```json
{
  "multiTenant": {
    "enabled": true,
    "tenants": {
      "tenant1": "mongodb://localhost:27017/db_tenant1",
      "tenant2": "mongodb://localhost:27017/db_tenant2",
      "tenant3": "mongodb://localhost:27017/db_tenant3"
    },
    "initOptions": {
      "lazy": true
    }
  }
}
```

These tenants are registered during initialization. With `initOptions.lazy` enabled, their MongoDB connections are deferred until needed.

A dynamic tenant does not need to exist in the local registry at startup. When the manager encounters an unregistered tenant, it can call a configured `TenantConfigResolver` to obtain that tenant's database configuration.

This is useful when tenant configuration lives outside the application process, for example in:

- A control database.
- An account service.
- A configuration API.
- A secrets or infrastructure service.
- Another application-defined source.

Programmatic configuration accepts the resolver function through `multiTenant.tenantConfigResolver`.

JSON configuration references a module that exports the function:

```json
{
  "multiTenant": {
    "enabled": true,
    "tenantConfigResolverModule": {
      "path": "./src/tenantResolver.ts",
      "exportName": "resolveTenantConfig"
    }
  }
}
```

This is a configuration fragment; retain the application's other configuration properties.

The module path is resolved relative to the JSON configuration file. Loading a `.ts` module requires a runtime that supports TypeScript imports. For a compiled deployment, reference the emitted JavaScript module, such as `./dist/tenantResolver.js`.

Static tenants and a dynamic resolver can be configured together. The static `tenants` map may also be empty or omitted when tenant configuration is supplied entirely by the resolver.

Both approaches populate the same local runtime registry and use the same tenant-aware database resolution path.

See [Dynamic Tenants](./dynamic-tenants) for complete programmatic and JSON configuration examples.

## Lazy Tenant Connections

Registration and connection are separate operations.

A tenant may be known to Ambiten without having an active MongoDB client.

For example, after registering three static tenants lazily and configuring a dynamic resolver:

```ts
const stats = MultiTenantManager.getStats();
```

The statistics might report:

```json
{
  "registeredTenants": 3,
  "connectedTenants": 0,
  "lazyTenants": 3,
  "dynamicResolverEnabled": true
}
```

If a request then arrives for `"tenant5"` and its model operation requires database access, Ambiten can discover, register, and connect that tenant on demand.

After a successful connection, the statistics might become:

```json
{
  "registeredTenants": 4,
  "connectedTenants": 1,
  "lazyTenants": 3,
  "dynamicResolverEnabled": true
}
```

The newly used tenant is connected while the other registered tenants remain lazy.

`initOptions.lazy` controls initialization of the static tenant map. Dynamically discovered tenants are registered lazily by `MultiTenantManager`; their resolver does not supply a `lazy` setting.

`getClient(tenantId)` returns an existing tenant client or connects a lazily registered tenant. It returns `null` when no tenant configuration can be resolved, and connection failures can throw.

These statistics describe the manager's tenant registry. A separate base connection opened during application bootstrap is not included in these tenant counts.

## Tenant Resolution Is Separate from Tenant Configuration

Ambiten distinguishes two questions:

| Question | Responsibility |
| --- | --- |
| Which tenant does this request belong to? | The request-facing `TenantResolver`. |
| Where does this tenant's database live? | `TenantConfigResolver` and `MultiTenantManager`. |

The request resolver returns a tenant identity, such as `"tenant5"`.

The configuration resolver receives that identity and returns a `ResolvedTenantConfig` containing:

- `uri`: the tenant's MongoDB connection URI.
- `dbName`: an optional database name.
- `metadata`: optional application-defined tenant metadata.

A minimal resolver module could contain:

```ts
import type { TenantConfigResolver } from "@ambiten/core";

export const resolveTenantConfig: TenantConfigResolver = (tenantId) => {
  if (tenantId !== "tenant5") {
    return undefined;
  }

  return {
    uri: "mongodb://localhost:27017/db_tenant5",
    dbName: "db_tenant5",
    metadata: {
      tier: "standard",
    },
  };
};
```

This example recognizes one tenant. An application can replace the condition with a database or service lookup and make the function asynchronous when needed.

Returning `null` or `undefined` indicates that the tenant could not be found.

For manual manager setup, register the function directly:

```ts
import { MultiTenantManager } from "@ambiten/core";
import { resolveTenantConfig } from "./tenantResolver.js";

MultiTenantManager.setTenantConfigResolver(resolveTenantConfig);
```

The setter validates and stores the function. It does not perform the lookup or open a connection immediately. Bootstrap performs this registration when the resolver is supplied through its configuration.

An HTTP adapter can therefore identify `"tenant5"` without knowing its MongoDB URI, database name, deployment region, or metadata.

The manager associates the returned configuration with the tenant ID and manages its registration and connection state.

## AmbitenContext and MultiTenantManager

`AmbitenContext` and `MultiTenantManager` participate in the same tenant flow, but serve different purposes.

`AmbitenContext` answers questions about the current execution:

```ts
const tenantId = AmbitenContext.get().tenantId;
```

`MultiTenantManager` answers questions about tenant resources registered in the current runtime:

```ts
const tenant = MultiTenantManager.getTenant("tenant5");
```

`getTenant()` is a synchronous local-registry lookup. It returns the registered configuration or `undefined`; it does not invoke the external resolver.

To allow dynamic discovery, use:

```ts
const tenant = await MultiTenantManager.resolveTenant("tenant5");
```

This checks the local registry first and, if needed, calls the configured resolver. A successfully discovered tenant is registered before its configuration is returned.

The tenant registry is local to the application process. Separate application processes maintain their own registration and connection state.

Keeping these responsibilities separate prevents request-scoped state from becoming global tenant state.

## Models Use the Active Runtime Context

With a tenant-aware provider configured, model operations can use the current execution context to select the tenant database.

Assuming `UserModel` has been configured with the appropriate schema and provider, application code can focus on the operation:

```ts
const user = await UserModel.create({
  username: "Abinod Ltd",
  email: "aemma@abinod.com",
});
```

When the active context contains `tenantId: "tenant5"`, the provider can obtain that tenant's client and database configuration through `MultiTenantManager`.

The operation then runs against the model's collection in the selected tenant database.

The model does not need to infer tenant identity itself, and the application does not need to manually select a database for every operation.

In the tenant-aware provider path, an unresolved tenant causes the operation to fail. It is not silently redirected to the application's base database.

Tenant-based database routing also does not automatically add a `tenantId` field to stored documents. If documents need that field, define it in the schema and configure its value or runtime default.

## Framework Adapters

Framework adapters connect framework-specific request lifecycles to Ambiten's runtime context.

Express, Fastify, NestJS, and other supported integrations use the shared adapter runtime to establish context before application logic runs.

Once inside that context, tenant identity remains available through asynchronous operations and model calls within the active execution.

Ambiten supports ESM and CommonJS consumers while preserving the request-scoped context used by its framework adapters.

For background jobs or other execution paths without a framework adapter, establish the context explicitly:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant5",
  },
  async () => {
    await UserModel.create({
      username: "Abinod Ltd",
      email: "background@abinod.com",
    });
  }
);
```

The model must still use a configured tenant-aware provider.

See [Framework Adapters](./framework-adapters) for adapter-specific configuration.

## Multi-Tenancy Flow

A typical tenant-aware model operation follows this sequence:

1. A request arrives.
2. The framework adapter resolves its tenant identity.
3. `AmbitenContext` carries `tenantId` through the execution.
4. Application code calls an Ambiten model.
5. The model's provider requests resources for the active tenant.
6. `MultiTenantManager` checks its local registry.
7. If the tenant is absent, the configured `TenantConfigResolver` attempts discovery.
8. A successfully discovered tenant is registered lazily.
9. `getClient()` returns an existing client or connects the tenant when needed.
10. The provider selects the tenant database and the model operation executes.

If tenant discovery fails or the database cannot be reached, the operation does not proceed successfully through this flow. The application handles the resulting error according to its request or service policy.

The application configures tenant identity resolution and tenant infrastructure. Ambiten then coordinates context propagation, discovery, registration, and database selection during model operations.

## Next

Continue with:

- [Tenant Resolution](./tenant-resolver) — how tenant identity is derived from a request.
- [MultiTenantManager](./multi-tenant-manager) — tenant registration, lookup, discovery, connections, and runtime state.
- [Dynamic Tenants](./dynamic-tenants) — resolving tenants that are not known at startup.
- [Framework Adapters](./framework-adapters) — connecting framework request lifecycles to Ambiten's execution context.