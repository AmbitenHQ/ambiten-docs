# Context Binding

Context binding is the mechanism that allows `TenraModel` to execute against the active runtime scope without forcing infrastructure state through every layer of an application.

In Tenra, models do not operate as isolated collection wrappers. They execute inside a managed runtime boundary capable of supplying tenant identity, database selection, transaction state, collection overrides, and request metadata automatically during execution.

That is what makes model calls remain structurally simple:

```ts
await UserModel.find({});
```

while still ensuring the operation executes against the correct tenant, database, and transactional session.

## Why context binding exists

In conventional architectures, runtime state tends to leak into application services over time. Controllers and resolvers begin forwarding `tenantId`, `dbName`, and `session` values manually, and transaction participation becomes dependent on developer discipline rather than runtime guarantees.

The result is predictable: infrastructure concerns spread across feature code, execution rules drift between services, and tenant-aware logic becomes duplicated throughout the application layer.

Context binding eliminates that pattern by moving execution state into the runtime itself.

Instead of manually propagating infrastructure state:

```ts
await UserModel.create(data, {
  tenantId,
  dbName,
  session
});
```

Tenra allows models to resolve execution state from the active runtime boundary automatically:

## The runtime binding model

Context binding in Tenra emerges from the interaction between four runtime layers.

Adapters establish the execution boundary. `TenraContext` stores request-scoped state. `TenraModel` consumes that state during execution, while `TenraClient` resolves the correct infrastructure target from the active context.

The model itself does not discover infrastructure independently. It executes inside a scope that has already been established by the runtime.

<ContextBindingFlow />

This separation is deliberate. The adapter owns ingress, the context owns state continuity, the model owns execution behavior, and the client owns infrastructure resolution.

## Bound execution state

The runtime boundary may carry values such as tenant identity, request identifiers, database scope, collection overrides, active sessions, logging metadata, and instrumentation state.

Those values can originate from:

```ts
TenraContext.run(...)
TenraContext.withTransaction(...)
adapter-managed request scopes
scoped providers such as withTenant(...)
```

Once established, the execution scope remains available throughout the asynchronous call chain automatically.

## Context-aware execution

The clearest example of context binding is execution inside an explicit runtime boundary:

```ts
await TenraContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123",
    dbName: "tenant_a_db"
  },
  async () => {
    return UserModel.find({});
  }
);
```

The model call itself remains unchanged, yet the runtime already understands which tenant is active, which database should be resolved, whether a transaction session exists, and which request metadata belongs to the operation.

This is the central architectural idea behind Tenra:

```text
Static model definition.
Dynamic runtime execution.
```

## Provider-driven infrastructure resolution

Context binding works because infrastructure resolution is delegated to the provider layer rather than embedded inside application code.

At execution time, the provider may resolve tenant-aware databases, scoped collections, active sessions, or runtime-specific overrides directly from the active context.

Conceptually:

```ts
const db = await provider.db({
  tenantId: "tenant-a",
  dbName: "tenant_a_db"
});
```

In normal application code, this resolution happens automatically through the model and client layers. The runtime boundary changes per request, but the model definition itself remains stable.

## Transaction binding

Transaction continuity depends on context binding.

When a transaction boundary is active:

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.create(data);
  await AuditLogModel.create(log);
});
```

the active MongoDB session becomes part of the execution context itself.

All downstream model operations automatically participate in the same transaction boundary without requiring manual session propagation. This guarantees that nested execution paths remain atomic and transaction-safe even as the application grows more complex.

## Tenant-aware execution

Tenant binding follows the same runtime model.

A request may enter the system with:

```http
x-tenant-id: tenant-a
```

Once the adapter resolves and binds that identity into `TenraContext`, every downstream model operation becomes tenant-aware automatically:

```ts
await UserModel.find({});
```

The application layer remains clean while the runtime enforces tenant isolation underneath.

This separation is one of the reasons Tenra scales more coherently in multi-tenant environments. Tenant isolation becomes part of the runtime architecture rather than an application-level filtering discipline.

## Request and observability continuity

Context binding is not limited to persistence behavior. The same execution boundary can also carry request identifiers, audit metadata, tracing information, logging enrichment data, and instrumentation state.

Because that metadata moves with the runtime boundary itself, logs and telemetry remain correlated with the originating request automatically without requiring every service signature to carry observability parameters manually.

## Adapter-managed binding

In most applications, context binding begins at the adapter layer.

The adapter receives a request or event, extracts execution metadata, initializes TenraContext, and allows models to execute inside that runtime scope.

This is why adapters are a foundational architectural layer in Tenra rather than a simple transport convenience.

The same execution model applies consistently across `Express`, `Fastify`, `NestJS`, `GraphQL`, `AWS Lambda`, and background execution flows without requiring model changes.

## Scoped execution outside requests

Execution scope can also be established explicitly outside request lifecycles.

```ts
const tenantProvider = client.withTenant("tenant-a");

const UserModel = new TenraModel({
  collectionName: "users",
  schema: userSchema,
  provider: tenantProvider
});
```

This pattern is useful for background jobs, maintenance workflows, infrastructure tooling, and scheduled execution where request-bound adapters are not present.

## What context binding prevents

A well-defined runtime binding model prevents several common architectural failures.

It removes repetitive infrastructure plumbing from feature code, prevents accidental tenant leakage, preserves transaction continuity across nested operations, and keeps infrastructure-routing logic out of application services.

Instead of forcing business code to coordinate runtime state manually, Tenra centralizes those concerns into the execution system itself.

## Design guidance

Context-driven execution should remain the default approach:

```ts
await UserModel.create(data);
```

rather than manually injecting infrastructure state:

```ts
await UserModel.create(data, {
  tenantId,
  session,
  dbName
});
```

unless the application is intentionally overriding the active execution boundary.

Models should remain runtime-agnostic. A model should not know whether execution originated from Express, GraphQL, Lambda, Fastify, or a background worker. The runtime boundary supplies execution state uniformly regardless of ingress source.

## Runtime relationship

<SignalFlow
  aria-label="Context binding runtime relationship"
  :items='["Adapter", "TenraContext", "TenraModel", "TenraClient", "MongoDB"]'
/>

The adapter establishes execution scope. `TenraContext` preserves runtime state. `TenraModel` consumes that state during execution, while `TenraClient` resolves infrastructure and MongoDB performs persistence.

## Summary

Context binding is the mechanism that makes Tenra models runtime-aware without coupling business logic to infrastructure concerns.

It allows model execution to inherit tenant scope, transaction participation, database resolution, and request metadata directly from the active runtime boundary, keeping applications structurally clean while preserving consistent and predictable execution behavior at scale.
