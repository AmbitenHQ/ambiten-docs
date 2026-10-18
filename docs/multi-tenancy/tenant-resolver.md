---
title: Tenant Resolution
description: Resolve tenant identity from incoming requests and propagate it through Ambiten's execution context.
---

# Tenant Resolution

Tenant resolution answers one fundamental question:

> **Which tenant does this execution belong to?**

In Ambiten, identifying a tenant and locating that tenant's infrastructure are separate concerns.

A request-facing resolver determines the tenant identity. The adapter validates that identity when a validator is configured, then establishes an `AmbitenContext` for application execution.

Application code can read the resolved identity without manually passing it through every service, model, or database operation.

| Component | Responsibility |
| --- | --- |
| `TenantResolver` | Derives a tenant ID from a request. |
| `AmbitenContext` | Carries that identity through the current execution. |
| `MultiTenantManager` | Manages tenant configuration, discovery, registration, and MongoDB clients. |
| `TenantConfigResolver` | Supplies database configuration for a tenant absent from the local registry. |

The request resolver does not need to know the tenant's MongoDB URI or manage its connections.

The adapter examples below assume that the application and adapter have been initialized. Place startup examples containing `await` inside an async startup function.

## Resolution Flow

A typical request follows these stages:

1. The framework adapter receives the request.
2. The configured resolver derives a tenant ID.
3. The runtime checks whether required tenant identity is present.
4. A configured validator accepts or rejects the ID.
5. The adapter establishes the execution context.
6. Application logic runs inside that context.
7. Tenant-aware model operations obtain the appropriate database resources.

For example:

```http
POST /users HTTP/1.1
Host: api.example.com
x-tenant-id: tenant5
```

Inside the request handler:

```ts
const context = AmbitenContext.get();

console.log(context.tenantId);
// "tenant5"
```

After the adapter establishes context, application code can use the resolved tenant identity without repeatedly inspecting the original request.

## Header-Based Resolution

A common tenancy strategy resolves the tenant from an HTTP header:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
  },
});
```

A request containing:

```http
x-tenant-id: tenant5
```

makes the tenant ID available through:

```ts
const { tenantId } = AmbitenContext.get();

// tenantId === "tenant5"
```

The default header name is `x-tenant-id` when a `tenancy` configuration is supplied without a different `header`.

This example requires tenant identity, but does not check whether the tenant exists or whether the requester may access it. Configure validation and application authorization as appropriate.

The built-in header reader uses the first value when the normalized header value is an array. Use a custom resolver when the application needs stricter handling or normalization.

## The Resolved Tenant Is the Runtime Source of Truth

Downstream application code should use the tenant ID established at the adapter boundary.

For example, inside a route with a configured tenant-aware `UserModel`:

```ts
const { tenantId } = AmbitenContext.get();

const user = await UserModel.create({
  ...req.body,
  tenantId,
});
```

Placing `tenantId` after `...req.body` ensures that a tenant ID supplied in the request body does not replace the resolved value.

The route does not need to know whether the identity originally came from a header, cookie, route parameter, or custom resolver.

If the resolution strategy changes, application code can continue reading:

```ts
AmbitenContext.get().tenantId;
```

Database routing and document fields remain separate concerns. A tenant-aware provider uses context to select the database; storing `tenantId` in a document requires an appropriate schema field and supplied value or runtime default.

## Custom Tenant Resolution

Ambiten supports two places for a custom request-facing resolver:

| Option | Behavior |
| --- | --- |
| `resolvers.tenantId` | Replaces the built-in tenancy resolution chain. |
| `tenancy.resolver` | Runs first within the built-in chain; unresolved requests can continue to the other strategies. |

A custom resolver receives an `AmbitenRequestLike` and returns a string or `undefined`. It may be synchronous or asynchronous.

This self-contained example trims a tenant header and rejects array values:

```ts
import type { TenantResolver } from "@ambiten/adapter-types";

const resolveRequestTenant: TenantResolver = (req) => {
  const value = req.headers["x-tenant-id"];

  if (typeof value !== "string") {
    return undefined;
  }

  const tenantId = value.trim();

  return tenantId || undefined;
};

await adapter.install(app, {
  tenancy: {},
  resolvers: {
    tenantId: resolveRequestTenant,
  },
});
```

Here, `tenancy: {}` makes tenant identity required. Because `resolvers.tenantId` replaces the built-in chain, returning `undefined` causes tenant resolution to fail instead of falling back to another source.

The example demonstrates normalization, not authentication. An application can replace the function body with logic that derives the tenant from verified authentication data.

The request resolver should return identity. Tenant database discovery and connection management belong to the infrastructure layer.

### Built-In Resolution Order

When `resolvers.tenantId` is absent, the built-in tenancy resolver checks sources in this order:

| Order | Source | Configuration |
| --- | --- | --- |
| 1 | Custom tenancy resolver | `tenancy.resolver` |
| 2 | HTTP header | `tenancy.header`, defaulting to `x-tenant-id` |
| 3 | Cookie | `tenancy.cookie` |
| 4 | Route parameter | `tenancy.param` |
| 5 | First hostname label | `tenancy.subdomain: true` |
| 6 | A value in the JSON claims header | `tenancy.jwtClaim` |
| 7 | Configured fallback identity | `tenancy.fallback` |

Earlier matches take precedence. For example, configuring a cookie does not disable the default tenant header.

Cookie and route-parameter strategies require those values to be available when the adapter runs. Install cookie parsing before the adapter when needed. In Express, global middleware may run before route parameters have been populated.

The built-in subdomain strategy reads the first label of a hostname containing at least three labels. Use a custom resolver when tenant identification requires domain validation or more detailed hostname rules.

`jwtClaim` reads a dotted property path from JSON in the `x-user-claims` header. It does not verify a JWT.

Use `resolvers.tenantId` when the application needs complete control over source selection and fallback behavior.

## Resolution Before Context Creation

Request tenant resolution and validation occur before the adapter establishes the new request context.

The order is:

1. Resolve the tenant ID from the request.
2. Check required identity and run configured validation.
3. Build the execution context.
4. Run application logic inside `AmbitenContext`.

A request-facing resolver should therefore use its request argument rather than expecting the new request's tenant ID to already exist in `AmbitenContext`.

Likewise, a validator receives the tenant ID as its argument:

```ts
validate: async (tenantId) => {
  const tenant = await MultiTenantManager.resolveTenant(tenantId);

  return tenant !== undefined;
}
```

After context creation, routes, controllers, services, and model operations running within that execution can access:

```ts
AmbitenContext.get().tenantId;
```

## Tenant Validation

Resolving a tenant ID does not automatically establish that the tenant exists.

Configure `tenancy.validate` to check the resolved ID before application logic runs:

```ts
import { MultiTenantManager } from "@ambiten/core";

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant = await MultiTenantManager.resolveTenant(tenantId);

      return tenant !== undefined;
    },
  },
});
```

The validator receives the resolved tenant ID and returns a boolean, synchronously or asynchronously.

- Returning `true` allows execution to continue.
- Returning `false` causes the runtime to throw an invalid-tenant error.
- Throwing an error rejects execution with that error.

Validation also applies when the ID comes from `resolvers.tenantId`, provided `tenancy.validate` is configured.

The shared runtime throws errors; it does not assign an application-specific HTTP status. Handle those errors through the framework's error-handling mechanism.

## Resolution and Validation Are Different

Resolution, validation, and authorization answer different questions:

| Concern | Question |
| --- | --- |
| Resolution | What tenant ID does this request resolve to? |
| Validation | Is that tenant ID acceptable or known? |
| Authorization | May this requester act for that tenant? |

For example, a header may resolve to `"tenant5"`, and a configuration lookup may confirm that `"tenant5"` exists.

Neither fact alone proves that the caller is authorized to access it.

`tenancy.validate` receives the tenant ID, not the request object. Requester-specific authorization must use trusted authentication information through the application's resolver or authorization layer.

## Validation and Dynamic Tenants

Validation can trigger dynamic tenant discovery.

Suppose `"tenant5"` is absent from the local registry. A validator can call:

```ts
const tenant = await MultiTenantManager.resolveTenant("tenant5");
```

The manager:

1. Checks its local registry.
2. Calls the configured `TenantConfigResolver` when the tenant is absent.
3. Registers a successfully discovered tenant lazily.
4. Returns the registered configuration.

The tenant can therefore be validated without preloading every tenant at application startup.

`resolveTenant()` does not open the discovered tenant's MongoDB connection. The external configuration lookup may perform its own database or network operations.

If the resolver returns `null` or `undefined`, the manager returns `undefined`. Invalid configuration or lookup failures can throw.

See [Dynamic Tenants](./dynamic-tenants) for the complete discovery flow.

## TenantResolver vs TenantConfigResolver

These resolvers have different inputs, outputs, and responsibilities.

### TenantResolver

A `TenantResolver` operates at the request boundary.

It receives an `AmbitenRequestLike` and returns:

```ts
"tenant5"
```

or `undefined` when it cannot resolve an identity.

Configure it through the adapter's `tenancy.resolver` or `resolvers.tenantId` option.

It should not need the tenant's MongoDB URI or manage tenant clients.

### TenantConfigResolver

A `TenantConfigResolver` receives a tenant ID and returns external database configuration:

```ts
{
  uri: "mongodb://localhost:27017/db_tenant5",
  dbName: "db_tenant5",
  metadata: {
    tier: "standard",
  },
}
```

Its result follows `ResolvedTenantConfig`:

- `uri` is required.
- `dbName` is optional.
- `metadata` is optional.

It may return `null` or `undefined` for an unknown tenant and may be asynchronous.

The manager owns tenant registration and client state. The configuration resolver does not return a client or select the tenant's lazy connection state.

Register the function through `MultiTenantManager.setTenantConfigResolver()` or supply it through bootstrap configuration.

For JSON configuration, `multiTenant.tenantConfigResolverModule` identifies the module exporting this configuration resolver. It does not configure request-facing tenant identity resolution.

See [Dynamic Tenants](./dynamic-tenants) for function registration and module-reference examples.

## Tenant Resolution and AmbitenContext

Once resolution and configured validation succeed, the adapter establishes the execution context.

Application code can read:

```ts
const context = AmbitenContext.get();

console.log(context.tenantId);
console.log(context.requestId);
```

Other context values depend on the adapter and application configuration. A tenant ID does not automatically populate `dbName`, `collectionName`, or tenant metadata.

Code running inside the active context can access tenant identity when needed without adding a tenant parameter to every intervening function.

Outside an established context, `AmbitenContext.get().tenantId` may be `undefined`. Reading the context does not create tenant identity.

## Context Propagation Across Async Operations

Ambiten's context remains available through asynchronous execution associated with the established context.

This minimal example demonstrates propagation across an `await`:

```ts
import { AmbitenContext } from "@ambiten/core";

async function demonstrateTenantContext() {
  await AmbitenContext.run(
    {
      tenantId: "tenant5",
    },
    async () => {
      const before = AmbitenContext.get().tenantId;

      await Promise.resolve();

      const after = AmbitenContext.get().tenantId;

      console.log({ before, after });
      // { before: "tenant5", after: "tenant5" }
    }
  );
}
```

Framework adapters establish this context for their request handlers. Background jobs and other entry points can establish it explicitly with `AmbitenContext.run()`.

Context does not automatically travel through a queue, network request, or separate process. Carry the required identity through that boundary and establish a new context in the receiving execution.

## Framework Adapters Own the Request Boundary

Framework adapters translate framework-specific request objects into the `AmbitenRequestLike` shape consumed by the shared adapter runtime.

That shape includes headers and may include parameters, cookies, query values, a body, URL, and method.

Custom resolvers should use the normalized request contract. Framework-specific properties, such as an authentication middleware's `req.user`, are not automatically part of that contract.

Ensure that any parsing or authentication data required by the resolver is available at the adapter boundary through the application's integration.

Once tenant resolution and validation succeed, the adapter runs application logic inside `AmbitenContext`.

See [Framework Adapters](./framework-adapters) for framework-specific setup.

## Resolution Does Not Connect the Tenant

Resolving request identity does not itself open a tenant MongoDB connection.

The request-facing resolver supplies a tenant ID. A configured validator may then discover and register its infrastructure through `MultiTenantManager.resolveTenant()`.

A lazily registered tenant is connected when an operation requests its client through `getClient()`.

This separates three actions:

| Action | Result |
| --- | --- |
| Resolve request identity | Obtain a tenant ID. |
| Resolve tenant configuration | Find or register its infrastructure configuration. |
| Obtain the tenant client | Reuse an existing client or connect a lazy tenant. |

Static tenants registered eagerly may already have clients. Dynamic discovery registers tenants lazily.

A custom resolver or validator can perform application-defined I/O, but it does not need to manage tenant MongoDB connections.

## Missing Tenant Identity

The shared adapter runtime treats missing identity according to its configuration.

| Configuration | Missing identity behavior |
| --- | --- |
| A `tenancy` object is supplied | Throws `Tenant resolution failed.` |
| `resolvers.tenantId` is supplied together with `tenancy` | Throws if the custom resolver returns no identity. |
| `resolvers.tenantId` is supplied without `tenancy` | Returning `undefined` does not trigger the runtime's required-tenant check. |
| Neither is supplied | The adapter can establish a context without a tenant ID. |

Use a `tenancy` configuration for request paths that require tenant identity.

When `resolvers.tenantId` is present, its result is authoritative. Returning `undefined` does not fall back to the header, cookie, or other built-in strategies.

Within the built-in chain, `tenancy.fallback` supplies an identity when the earlier strategies do not resolve one. It does not replace a tenant that was resolved but subsequently failed validation.

Configure fallback only when the application intentionally supports that behavior. Tenant-required routes should not silently continue without tenant identity.

## Do Not Treat Untrusted Headers as Authentication

A header such as:

```http
x-tenant-id: tenant5
```

identifies the tenant presented by the caller. It does not prove that the caller may access `"tenant5"`.

Authenticate the requester and verify tenant membership or access permissions according to the application's policy.

The same applies to the built-in `jwtClaim` option. It reads JSON from `x-user-claims`; it does not validate a token signature, issuer, audience, or expiry.

Only use claims supplied through a trusted authentication boundary. Use a custom resolver when tenant identity must be derived directly from a verified token or authenticated account.

Also review resource overrides. The adapter runtime reads `x-db-name` and `x-collection-name` by default, and those values can influence downstream resource selection. Treat these as application-controlled inputs rather than assuming that tenant-ID validation authorizes arbitrary database or collection names.

For database and collection context resolvers, returning `undefined` falls back to their configured headers; it does not disable header lookup.

Ambiten supplies context propagation and tenant routing. The application defines authentication, authorization, and which request inputs are trusted.

## Avoid Re-Resolving the Tenant Throughout the Application

After a request crosses the adapter boundary successfully, downstream code should generally read:

```ts
const { tenantId } = AmbitenContext.get();
```

Repeatedly reading the original request source can disagree with custom normalization, authentication-derived identity, or configured precedence.

Keep source selection at the request boundary:

- The adapter and resolver interpret request information.
- Application code uses the resolved tenant ID.
- Infrastructure code resolves tenant resources.

This allows the request strategy to change without spreading transport-specific logic across services and repositories.

## Avoid Writing Tenant Infrastructure into the Request Context

The context carries execution identity and execution-specific state. It should not replace the tenant registry.

`MultiTenantManager` owns tenant connection URIs, registered clients, lazy state, and stored tenant configuration.

The context may legitimately contain execution-specific values such as `dbName`, `collectionName`, a transaction session, or application metadata. These do not replace the manager's tenant registration and connection responsibilities.

Tenant metadata is not automatically copied into `AmbitenContext.meta`. An application may deliberately expose selected metadata for an execution when needed.

Keep connection credentials and the full tenant infrastructure record in the appropriate infrastructure layer.

## Typical Request Example

The following example assumes:

- `app` is an initialized Express application and `express` is imported.
- Ambiten has been bootstrapped with multi-tenancy enabled.
- Static tenants or a configuration resolver have been registered.
- `UserModel` uses the configured tenant-aware provider.
- Its schema accepts the supplied fields.
- Authentication and tenant authorization are handled by the application.

Place the setup inside the application's async startup function:

```ts
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { createExpressAdapter } from "@ambiten/adapter-express";

// Inside async startup, after runtime and model initialization:
app.use(express.json());

const adapter = createExpressAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant = await MultiTenantManager.resolveTenant(tenantId);

      return tenant !== undefined;
    },
  },
});

app.post("/users", async (req, res, next) => {
  try {
    const { tenantId } = AmbitenContext.get();

    const user = await UserModel.create({
      ...req.body,
      tenantId,
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});
```

For an accepted request carrying `x-tenant-id: tenant5`:

1. The adapter resolves `"tenant5"`.
2. Validation finds or discovers the tenant configuration.
3. The adapter establishes context with that tenant ID.
4. The route calls `UserModel.create()`.
5. The tenant-aware provider obtains the tenant's database resources.
6. The model performs the operation.

An unresolved tenant, invalid configuration, or failed connection prevents successful completion. Handle resulting errors through the application's Express error middleware.

## Resolution Model

The request and infrastructure boundaries cooperate while retaining distinct responsibilities:

| Stage | Responsibility |
| --- | --- |
| Request resolution | Derive tenant identity from the chosen request source. |
| Validation and authorization | Check tenant acceptability and the requester's access. |
| Context establishment | Make tenant identity available during application execution. |
| Tenant discovery | Obtain configuration from the local registry or an external resolver. |
| Database access | Obtain a client and select the database for the operation. |

Infrastructure discovery may happen during validation or later during database access.

The request boundary answers:

> **Which tenant is this execution for?**

The infrastructure boundary answers:

> **How does the runtime reach that tenant's database?**

This separation allows the same application model code to work across different frameworks, authentication systems, and tenant configuration sources.

## Related Pages

Continue with:

- [Multi-Tenancy Overview](./overview) — the overall Ambiten tenancy architecture.
- [MultiTenantManager](./multi-tenant-manager) — tenant registration, lookup, discovery, runtime state, and clients.
- [Dynamic Tenants](./dynamic-tenants) — discovering tenants that are not registered at startup.
- [Framework Adapters](./framework-adapters) — integrating framework request lifecycles with Ambiten's execution context.

For exact resolver interfaces and configuration types, see the corresponding Ambiten API reference.
