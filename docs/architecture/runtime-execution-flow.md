# Runtime Execution Flow

This document describes how Tenra executes an operation from entry to persistence.

It connects the major components of the runtime into a single execution path so you can understand how context, models, providers, and infrastructure interact during execution.

## Core idea

A Tenra execution follows a consistent runtime sequence:

<SignalFlow
  aria-label="Runtime core flow"
  :items='["Adapter", "Context", "Model", "Provider", "Client", "MongoDB"]'
/>

Each layer owns a specific responsibility, and execution moves progressively through the runtime without overlapping concerns.

## Execution lifecycle

### 1. Ingress

Execution enters the runtime through an adapter boundary. This boundary may originate from an HTTP framework such as `Express`, `Fastify`, or `NestJS`, but it can also come from `GraphQL operations`, `background jobs`, `queue consumers`, or `AWS Lambda` handlers. Regardless of the transport mechanism, execution always enters the runtime through the same normalized boundary model.

### 2. Adapter normalization

Once execution enters the system, the adapter extracts execution metadata, resolves tenant identity, and prepares runtime options before application logic begins.

**Example:**

```ts
adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  }
});
```

### 3. Context initialization

After normalization, the adapter initializes the execution boundary through `TenraContext.run()`.

```ts
TenraContext.run(...)
```

This establishes the active runtime scope, including values such as `tenantId`, `requestId`, database overrides, and optional transaction sessions. The boundary remains active throughout asynchronous execution until control exits the runtime scope.

#### Context resolution model

Runtime-aware components do not receive execution state through direct parameter passing. Instead, state is resolved implicitly from the active `TenraContext` boundary during execution.

This allows models, providers, middleware, and instrumentation systems to remain infrastructure-independent while still participating in tenant-aware and transaction-aware execution.

The result is a runtime model where application code focuses on domain behavior rather than infrastructure propagation.

### 4. Application execution

Controllers, resolvers, services, or handlers execute inside the active runtime boundary.

```ts
await UserModel.find({});
```

Application logic executes without manually forwarding tenant identifiers, sessions, request metadata, or database configuration through every function call.

### 5. Model execution

When an operation reaches `TenraModel`, the runtime begins transforming the request into a context-aware execution pipeline. The model validates schema input, executes registered middleware, prepares execution metadata, and coordinates the operation lifecycle before infrastructure resolution begins.

At this stage, the operation still remains infrastructure-independent.

### 6. Provider resolution

The model then delegates infrastructure resolution to the provider layer.

```ts
const db = await provider.db(ctx);
```

The provider resolves the active infrastructure bindings associated with the current execution boundary. This includes database selection, tenant-aware routing, active transaction sessions, collection resolution, and runtime-specific overrides.

Because provider resolution is context-aware, infrastructure decisions remain deterministic for the lifetime of the execution boundary.

### 7. Client execution

After provider resolution completes, `TenraClient` translates the finalized operation into MongoDB driver calls.

```ts
db.collection("users").find(...)
```

At this point, execution has moved fully from runtime coordination into persistence execution.

### 8. Persistence

The MongoDB driver executes the finalized operation against the resolved persistence target.

Tenra intentionally maintains a high-fidelity relationship with the MongoDB driver rather than masking database behavior behind opaque abstractions.

### 9. Post-processing

After persistence completes, the runtime re-enters the execution pipeline for post-processing. Post-middleware executes, instrumentation finalizes telemetry, results are transformed when necessary, and active transactions either commit or roll back depending on execution outcome.

This stage completes the runtime lifecycle for the operation.

### 10. Egress

Once execution leaves the runtime boundary, the active context is released and control returns to the host environment.

## Visual flow

<RuntimeExecutionVisualFlow />

### Example (end-to-end)

```ts
app.get("/users", async (_req, res) => {
  const users = await UserModel.find({});
  res.json(users);
});
```

Internally, the adapter first resolves the tenant boundary and initializes the runtime context. The model operation then executes inside that boundary, the provider resolves the correct infrastructure bindings, and the MongoDB driver performs the finalized query before the result returns through the runtime pipeline.

## Key properties of the flow

### Context-driven execution

Execution state is resolved from the runtime boundary rather than manually propagated through application code. This allows asynchronous operations to remain context-aware without coupling business logic to infrastructure concerns.

### Layered responsibility

Each runtime layer owns a narrowly defined responsibility. Context manages execution state, models coordinate execution behavior, providers resolve infrastructure bindings, and clients communicate with the persistence layer. This separation prevents responsibility leakage between layers.

### Runtime portability

The execution flow remains consistent across REST APIs, GraphQL services, serverless runtimes, queue processors, and background workers. The host framework may change, but the runtime execution model remains stable.

### Deterministic resolution

Given the same execution boundary and resolution rules, the same operation resolves the same infrastructure bindings. This guarantees predictable tenant routing, session propagation, and persistence behavior throughout execution.

## Why this matters

This execution architecture allows Tenra to eliminate infrastructure plumbing from application code while preserving deterministic runtime behavior. Tenant isolation can be enforced consistently, transaction continuity can propagate safely across asynchronous execution, and application models can remain stable across multiple runtime environments without requiring infrastructure rewrites.

The result is a runtime model that scales operational complexity without forcing that complexity into the business domain.

## Mental model

```text
You don’t pass state into the model.

The runtime provides it.
```

## Related pages

- [Architecture Overview](/architecture/whitepaper)
- [Context](/core/context)
- [TenraModel](/models/defining-models)
- [Provider Contract](/models/provider-contract)
- [TenraClient](/api/tenra-client)
