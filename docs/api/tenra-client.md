# TenraClient

TenraClient is the runtime infrastructure layer between Tenra and MongoDB.

It is responsible for resolving database access, tenant-aware infrastructure boundaries, scoped execution, and transaction-capable sessions during runtime execution.

Where `TenraModel` defines how operations execute, `TenraClient` determines where those operations execute and under what infrastructure conditions.

This distinction is important.

`TenraClient` does not orchestrate the application runtime. It operates within the runtime boundary already established by adapters, `TenraContext`, or higher-level orchestration layers such as [TenraBootstrap](/advanced/bootstrap-cli).

## Role inside the runtime

In traditional ODM architectures, database clients are often treated as global connection objects shared across the entire application.

Tenra takes a different approach.

TenraClient participates directly in runtime-aware execution. It can resolve databases dynamically from tenant scope, participate in request-scoped execution, inherit active transaction sessions, and adapt infrastructure resolution based on the current execution boundary.

This allows infrastructure routing to remain centralized while application code stays stable and framework-agnostic.

## When to use TenraClient

Most application code interacts primarily with `TenraModel`.

`TenraClient` becomes important when infrastructure behavior needs to be controlled explicitly. Typical examples include dynamic database resolution, low-level collection access, scoped tenant execution, infrastructure tooling, diagnostics, migrations, or advanced runtime orchestration.

It is also the primary implementation behind the provider contract used throughout Tenra’s runtime model.

## Creating a client

A client can be initialized directly:

```ts
import { TenraClient } from "@tenra/core";

const client = new TenraClient({
  uri: "mongodb://127.0.0.1:27017",
  options: {
    dbName: "my-app"
  }
});
```

Applications that prefer a shared initialization flow can use the static initializer:

```ts
const client = TenraClient.init({
  uri: "mongodb://127.0.0.1:27017",
  options: {
    dbName: "my-app"
  }
});
```

The client definition itself remains stable. What changes during execution is the runtime scope applied to infrastructure resolution.

## Connection lifecycle

Before database operations can execute, the client must establish a MongoDB connection:

```ts
await client.connect();

const db = await client.db();
const users = await client.collection("users");
```

Once connected, the client becomes the infrastructure entry point for database-level operations and runtime-aware persistence resolution.

## Runtime-aware database resolution

`db()` is not simply a thin wrapper around the MongoDB driver.

It resolves the active database boundary dynamically using execution context, tenant scope, scoped overrides, and runtime configuration.

Conceptually, resolution follows this order:

```Plain Text
Explicit runtime override
→ Tenant-aware resolution
→ Context database override
→ Scoped client override
→ Default configured database
```

```ts
const db = await client.db({
  dbName: "analytics"
});
```

This allows infrastructure behavior to adapt dynamically without forcing application services to manage database routing manually.

## Tenant-aware infrastructure

When multi-tenancy is enabled, TenraClient can resolve databases per tenant automatically:

```ts
const db = await client.db({
  tenantId: "tenant-a"
});
```

This keeps tenant resolution inside the runtime infrastructure layer rather than scattering it throughout controllers, services, or model calls.

The result is deterministic infrastructure routing with significantly less application-level plumbing.

## Collection access

Collections can be resolved directly through the client:

```ts
const users = await client.collection("users");
```

Collection access remains runtime-aware. Database overrides, tenant scope, and active transaction sessions continue to apply automatically during execution.

For defensive or testing scenarios, `getCollection()` can be used when explicit collection checks are preferred.

## Sessions and transaction support

TenraClient exposes direct session access for lower-level transaction orchestration:

```ts
const session = await client.startSession();
```

In most applications, transaction orchestration should remain at the runtime level through `TenraContext.withTransaction(...)`.

Direct session handling is intended primarily for advanced infrastructure scenarios where explicit MongoDB session control is required.

## Scoped clients

Rather than mutating global state, Tenra uses immutable scoped client variants.

```ts
const tenantClient = client.withTenant("tenant-a");
const reportingClient = client.withDatabase("reporting");

await tenantClient.collection("users");
```

Scoped clients create isolated infrastructure views aligned with request-scoped and concurrent execution environments.

This approach prevents runtime leakage and keeps infrastructure boundaries explicit without sacrificing flexibility.

## Context-bound execution

`withContext()` allows infrastructure execution to occur inside an explicit runtime boundary:

```ts
await client.withContext(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },
  async () => {
    const users = await client.collection("users");
  }
);
```

This keeps direct client operations aligned with the same execution guarantees used throughout the rest of the Tenra runtime.

## Mutable database switching

The client also supports mutable database switching:

```ts
await client.useDatabase("reporting");
```

Because this mutates the active client scope, it should be used carefully in concurrent or request-driven environments.

Scoped alternatives such as `withDatabase(...)` are generally safer and more predictable for production systems.

## Operational capabilities

Beyond persistence access, `TenraClient` also exposes infrastructure-level operational utilities.

This includes cluster inspection, collection and database management, connection lifecycle control, connection-state inspection, and diagnostic helpers intended for tooling, migrations, operational dashboards, and test environments.

These capabilities are intentionally close to the MongoDB driver rather than heavily abstracted away.

## Runtime helper utilities

Tenra also exposes static runtime helpers for advanced infrastructure resolution scenarios:

```ts
TenraClient.getDatabase(ctx, uri);
TenraClient.getTenantDB(tenantId);
TenraClient.getAllTenantDBs();
```

These helpers are typically used internally or in advanced orchestration flows where infrastructure resolution happens outside normal request execution boundaries.

## Relationship with the runtime

<SignalFlow 
   aria-label="TenraClient runtime relationship"
   :items='["TenraContext", "TenraClient", "MongoDB"]'
/>

TenraContext defines execution state.
TenraClient resolves infrastructure boundaries from that state.
MongoDB performs persistence against the resolved target.

This separation is one of the foundational architectural patterns inside Tenra.

## Design philosophy

Tenra intentionally keeps `TenraClient` close to the MongoDB driver.

The goal is not to obscure MongoDB behind excessive abstraction layers, but to provide a structured runtime-aware execution model around it.

This preserves operational transparency while still enabling tenant-aware routing, scoped execution, transaction participation, and context-driven infrastructure resolution.

## Mental model

```Plain Text
Context defines execution state.
Client resolves infrastructure.
MongoDB executes persistence.
```

## Summary

`TenraClient` is the runtime-aware infrastructure layer of Tenra.

It bridges Tenra’s execution model with MongoDB’s driver-level capabilities while remaining aware of tenant scope, request context, transaction participation, and runtime boundaries.

By separating infrastructure resolution from model execution, Tenra allows applications to scale across tenants, runtimes, and evolving infrastructure environments without pushing that complexity into business logic.

## Related pages

- [Context](/core/context)
- [Transactions](/core/transactions)
- [TenraModel](/models/defining-models)
- [Provider Contract](/models/provider-contract)
- [TenraBootstrap](/advanced/bootstrap-cli)
