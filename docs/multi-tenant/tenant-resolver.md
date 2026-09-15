---
title: Tenant Resolution
description: Resolve tenant identity from incoming requests and propagate it through Ambiten's request-scoped runtime context.
---

# Tenant Resolution

Tenant resolution answers one fundamental question:

> **Which tenant does this execution belong to?**

In Ambiten, identifying a tenant and locating that tenant's infrastructure are deliberately separate concerns.

Tenant resolution determines the tenant identity associated with an incoming request:

```text
Incoming Request
      ↓
TenantResolver
      ↓
tenantId
      ↓
Validation
      ↓
AmbitenContext
```

Once resolved, the tenant identifier becomes part of the active `AmbitenContext` and can travel through the rest of the request lifecycle without being manually passed through each service, model, or database operation.

Tenant resolution does **not** determine the tenant's MongoDB URI, database name, connection state, or other infrastructure configuration.

Those responsibilities belong to `MultiTenantManager` and, when dynamic discovery is enabled, `TenantConfigResolver`.

```text
TenantResolver
→ Who is this request for?

AmbitenContext
→ What tenant belongs to this execution?

MultiTenantManager
→ What resources belong to that tenant?

TenantConfigResolver
→ Where can an unknown tenant be found?
```

This separation is central to Ambiten's multi-tenant architecture.

## Resolution Flow

A typical request follows this path:

```text
HTTP Request
     ↓
Framework Adapter
     ↓
TenantResolver
     ↓
tenantId = tenant5
     ↓
Tenant Validation
     ↓
AmbitenContext
     ↓
Application
     ↓
AmbitenModel
     ↓
MultiTenantManager
     ↓
Tenant Database
```

The framework adapter is responsible for entering application logic inside the resolved Ambiten runtime context.

After that boundary, application code no longer needs to repeatedly inspect the original request source to determine the tenant.

For example, a request may arrive with:

```http
POST /users
x-tenant-id: tenant5
```

and Ambiten can expose the resolved identity as:

```ts
const context = AmbitenContext.get();

console.log(context.tenantId);
// tenant5
```

The important value is no longer the original HTTP header.

It is the resolved runtime identity:

```ts
AmbitenContext.get().tenantId
```

## Header-Based Resolution

A common tenancy strategy is to resolve the tenant from an HTTP header.

For example:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  }
});
```

A request containing:

```http
x-tenant-id: tenant5
```

can then produce an Ambiten context containing:

```ts
{
  tenantId: "tenant5"
}
```

Application code can access it through:

```ts
const { tenantId } = AmbitenContext.get();
```

This is preferable to repeatedly doing:

```ts
req.headers["x-tenant-id"]
```

throughout the application.

The HTTP header is a transport-level detail.

`AmbitenContext.tenantId` is the resolved runtime identity.

## The Resolved Tenant Is the Runtime Source of Truth

Consider:

```ts
app.post("/users", async (req, res) => {
  const { tenantId } = AmbitenContext.get();

  const user = await UserModel.create({
    ...req.body,
    tenantId
  });

  res.status(201).json(user);
});
```

The route does not need to know how the tenant was originally identified.

Today it might come from:

```text
x-tenant-id
```

Later, the application could use a custom resolution strategy.

The rest of the application can continue reading:

```ts
AmbitenContext.get().tenantId
```

without depending on the transport mechanism used at the adapter boundary.

This gives the runtime a stable identity contract:

```text
request-specific source
        ↓
TenantResolver
        ↓
canonical tenantId
        ↓
AmbitenContext
        ↓
application
```

## Custom Tenant Resolution

Some applications cannot identify tenants from a simple header.

Tenant identity may need to be derived from application-specific information.

Ambiten allows the adapter runtime to use a custom tenant resolver.

Conceptually:

```ts
{
  resolvers: {
    tenantId: async (req) => {
      // Resolve tenant identity using application-specific logic.
      return "tenant5";
    }
  }
}
```

For example, an application might derive the tenant from authenticated request information:

```ts
await adapter.install(app, {
  resolvers: {
    tenantId: async (req) => {
      const authorization =
        req.headers?.authorization;

      if (!authorization) {
        return undefined;
      }

      const identity =
        await resolveAuthenticatedIdentity(
          authorization
        );

      return identity?.tenantId;
    }
  }
});
```

The resolver's concern ends once it has answered:

```text
Which tenant does this request belong to?
```

It should not establish MongoDB connections or manually configure `MultiTenantManager`.

Once the tenant identifier has been resolved, the rest of Ambiten's runtime can handle tenant resources independently.

## Resolution Before Context Creation

Tenant resolution happens before Ambiten executes application logic inside the request context.

Conceptually:

```ts
const resolvedTenantId =
  await resolveTenantFromRequest(req);

const context = {
  tenantId: resolvedTenantId
};

return AmbitenContext.run(
  context,
  () => handler()
);
```

This ordering is important.

Application code begins execution with the tenant identity already attached to the active context.

That means:

```ts
AmbitenContext.get().tenantId
```

can be available immediately inside the route, controller, service, middleware, or model operation running within that request lifecycle.

## Tenant Validation

Resolving a tenant identifier does not necessarily mean that the identifier is valid.

Ambiten allows tenant resolution to be followed by validation.

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

The flow becomes:

```text
Request
   ↓
Resolve tenantId
   ↓
tenant5
   ↓
validate("tenant5")
   ↓
valid?
 ┌───┴───┐
yes      no
 ↓        ↓
Context   reject request
```

Validation may be asynchronous.

This is useful when determining whether a tenant is valid requires external or runtime-backed information.

## Resolution and Validation Are Different

Tenant resolution and validation should not be treated as the same operation.

Resolution answers:

> What tenant identity does this request claim or resolve to?

Validation answers:

> Is that tenant identity acceptable for this application?

For example:

```text
Request header
x-tenant-id: tenant5
        ↓
resolution
        ↓
"tenant5"
        ↓
validation
        ↓
tenant5 exists?
```

Keeping those concerns separate makes tenancy behavior easier to reason about and test.

## Validation and Dynamic Tenants

Validation can work naturally with dynamic tenant discovery.

Suppose `"tenant5"` is not registered when the process starts.

A validator can call:

```ts
await MultiTenantManager.resolveTenant(
  "tenant5"
);
```

`resolveTenant()` first checks the local registry.

If the tenant is not registered and dynamic tenant resolution is configured, Ambiten can consult the configured `TenantConfigResolver`.

```text
validate tenant5
      ↓
resolveTenant("tenant5")
      ↓
local registry?
   ┌────┴────┐
  yes        no
   ↓          ↓
return     TenantConfigResolver
              ↓
         external lookup
              ↓
           tenant found
              ↓
            register
              ↓
             valid
```

The tenant can therefore be validated without requiring every valid tenant to be registered at application startup.

See [Dynamic Tenants](./dynamic-tenants) for the complete discovery flow.

## TenantResolver vs TenantConfigResolver

These two resolvers have different responsibilities and should not be combined conceptually.

### TenantResolver

A `TenantResolver` operates at the request boundary.

Its purpose is:

```text
request
   ↓
tenant identity
```

For example:

```text
HTTP request
   ↓
x-tenant-id
   ↓
tenant5
```

or:

```text
HTTP request
   ↓
custom authentication logic
   ↓
tenant5
```

The output is an identity:

```ts
"tenant5"
```

### TenantConfigResolver

A `TenantConfigResolver` operates at the infrastructure boundary.

Its purpose is:

```text
tenant identity
   ↓
tenant configuration
```

For example:

```text
tenant5
   ↓
TenantConfigResolver
   ↓
{
  uri,
  dbName,
  metadata,
  ...
}
```

The distinction is:

```text
TenantResolver
→ request → tenantId

TenantConfigResolver
→ tenantId → tenant infrastructure
```

A request resolver should not need to know the tenant's MongoDB URI.

A configuration resolver should not need to understand Express, Fastify, NestJS, HTTP headers, or request objects.

That separation keeps transport concerns and infrastructure concerns independent.

## Tenant Resolution and AmbitenContext

Once resolution and validation succeed, the tenant identifier becomes part of the execution context.

For example:

```ts
const context =
  AmbitenContext.get();

console.log(context);
```

may produce:

```ts
{
  tenantId: "tenant5",
  requestId: undefined,
  dbName: undefined,
  collectionName: undefined,
  debug: undefined,
  loggerMeta: undefined,
  meta: undefined
}
```

The tenant ID now belongs to the active execution rather than to a particular function signature.

This means application code does not need patterns such as:

```ts
await createUser(
  tenantId,
  data
);
```

followed by:

```ts
await userService.create(
  tenantId,
  data
);
```

followed by:

```ts
await repository.insert(
  tenantId,
  data
);
```

just to preserve tenant identity.

Instead, code running inside the Ambiten context can access:

```ts
AmbitenContext.get().tenantId
```

when tenant identity is required.

## Context Propagation Across Async Operations

Ambiten's context is request-scoped and designed to remain available across asynchronous execution associated with that request.

For example:

```ts
app.post("/users", async (req, res) => {
  const before =
    AmbitenContext.get().tenantId;

  await someAsyncOperation();

  const after =
    AmbitenContext.get().tenantId;

  console.log({
    before,
    after
  });

  res.sendStatus(204);
});
```

For a request belonging to `"tenant5"`, both values should represent the same execution:

```ts
{
  before: "tenant5",
  after: "tenant5"
}
```

This is important because real application flows rarely remain inside a single synchronous function.

Tenant identity may need to survive through:

```text
controller
   ↓
service
   ↓
await
   ↓
model
   ↓
MongoDB operation
```

Ambiten's framework adapters establish the request context so that application code can operate within that execution boundary.

## Framework Adapters Own the Request Boundary

Framework-specific adapters are responsible for translating framework request objects into the request shape understood by Ambiten's adapter runtime.

Conceptually:

```text
Express Request
       │
Fastify Request
       │
NestJS Request
       ↓
Framework Adapter
       ↓
AmbitenRequestLike
       ↓
Tenant Resolution
       ↓
AmbitenContext
```

This keeps `adapter-runtime` independent of individual HTTP frameworks.

The tenant resolver therefore works with the normalized Ambiten request boundary rather than requiring the Core runtime to understand each framework directly.

See [Framework Adapters](./framework-adapters) for framework-specific setup.

## Resolution Does Not Connect the Tenant

Resolving a tenant identity does not itself mean that a MongoDB connection must be opened.

These are separate stages:

```text
resolve request tenant
        ↓
tenantId = tenant5
        ↓
AmbitenContext
```

Database resources are resolved later when they are actually required:

```text
model operation
      ↓
MultiTenantManager
      ↓
resolve tenant configuration
      ↓
getClient()
      ↓
MongoDB
```

This separation allows lazy tenant connections.

A request can establish:

```ts
{
  tenantId: "tenant5"
}
```

without the request-facing resolver needing to manage database connection lifecycle.

## Missing Tenant Identity

When tenancy is required, a request that cannot be resolved to a tenant should not silently continue as though it belonged to another tenant.

Conceptually:

```text
Request
   ↓
TenantResolver
   ↓
undefined
   ↓
Tenant resolution failed
```

This protects the application from unintentionally falling back to unrelated tenant state.

Applications should configure their tenancy boundary according to whether tenant identity is mandatory for the request path being handled.

For tenant-aware operations, the expected invariant should be:

```text
request enters application logic
        ↓
tenant identity already resolved
```

## Do Not Treat Untrusted Headers as Authentication

A tenant header can be a useful resolution mechanism, but tenant resolution and authentication are not the same security concern.

For example:

```http
x-tenant-id: tenant5
```

only tells the resolver what tenant identity was presented.

It does not, by itself, prove that the caller is authorized to act for `"tenant5"`.

In environments where clients can control the header directly, applications should validate tenant access against authenticated identity or another trusted source.

A stronger flow may look like:

```text
Request
   ↓
Authentication
   ↓
Authenticated user/service identity
   ↓
TenantResolver
   ↓
tenant5
   ↓
Authorization / validation
   ↓
AmbitenContext
```

Ambiten provides the runtime machinery for tenant resolution and propagation.

The application remains responsible for defining its authentication and authorization policy.

## Avoid Re-Resolving the Tenant Throughout the Application

Once the request has crossed the adapter boundary successfully, application code should generally use the resolved context rather than attempting to derive the tenant again.

Prefer:

```ts
const { tenantId } =
  AmbitenContext.get();
```

over:

```ts
const tenantId =
  req.headers["x-tenant-id"];
```

inside downstream application logic.

Repeatedly reading the original request source introduces unnecessary coupling:

```text
Controller
→ knows x-tenant-id

Service
→ knows x-tenant-id

Repository
→ knows x-tenant-id
```

Using the runtime context instead gives:

```text
Framework Adapter
→ understands request source

Application
→ understands tenantId

Infrastructure
→ understands tenant resources
```

Each layer receives only the concern it needs.

## Avoid Writing Tenant Infrastructure into the Request Context

The context should carry execution identity and request-scoped information.

It should not become a replacement tenant registry.

For example, this is appropriate:

```ts
{
  tenantId: "tenant5"
}
```

The following infrastructure belongs to `MultiTenantManager`, not the request context:

```text
MongoDB URI
connection client
lazy connection state
deployment region
tenant infrastructure metadata
```

The runtime should remain conceptually separated:

```text
AmbitenContext
→ tenant identity for this execution

MultiTenantManager
→ tenant resources for the process
```

## Typical Request Example

A complete request flow may look like this:

```ts
const adapter =
  createExpressAdapter();

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

app.post("/users", async (req, res) => {
  const { tenantId } =
    AmbitenContext.get();

  const user =
    await UserModel.create({
      ...req.body,
      tenantId
    });

  res.status(201).json(user);
});
```

For:

```http
POST /users
x-tenant-id: tenant5
```

the conceptual execution is:

```text
POST /users
     ↓
x-tenant-id: tenant5
     ↓
Express Adapter
     ↓
TenantResolver
     ↓
tenant5
     ↓
validate("tenant5")
     ↓
AmbitenContext
tenantId = tenant5
     ↓
UserModel.create(...)
     ↓
MultiTenantManager
     ↓
db_tenant5
```

Application code never needs the tenant's MongoDB configuration.

The request-facing resolver never needs to perform model operations.

The model never needs to inspect the HTTP request.

Each layer remains responsible for one part of the flow.

## Resolution Model

A useful mental model is:

```text
                         REQUEST BOUNDARY
                                │
                         incoming request
                                │
                                ▼
                         TenantResolver
                                │
                             tenantId
                                │
                          validation
                                │
                                ▼
                         AmbitenContext
                                │
                         application code
                                │
                                ▼
                      INFRASTRUCTURE BOUNDARY
                                │
                      MultiTenantManager
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
          registered tenant?           unknown tenant?
                  │                           │
                  ▼                           ▼
           existing config           TenantConfigResolver
                  │                           │
                  └─────────────┬─────────────┘
                                │
                           tenant config
                                │
                            getClient()
                                │
                         tenant database
```

The request boundary answers:

> **Who is this execution for?**

The infrastructure boundary answers:

> **How does the runtime reach that tenant?**

Keeping those questions separate is what allows Ambiten's tenancy model to remain flexible across frameworks, authentication systems, and tenant infrastructure strategies.

## Related Pages

Continue with:

- [Multi-Tenancy Overview](./overview) — the overall Ambiten tenancy architecture.
- [MultiTenantManager](./multi-tenant-manager) — tenant registration, lookup, runtime state, and client lifecycle.
- [Dynamic Tenants](./dynamic-tenants) — discovering tenants that are not registered at startup.
- [Framework Adapters](./framework-adapters) — integrating framework request lifecycles with Ambiten's execution context.

For exact resolver interfaces, configuration types, and generated method signatures, see the corresponding Ambiten API reference.