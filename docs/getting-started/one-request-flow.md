# One Request Flow

This page follows a single request through the Ambiten runtime from the framework boundary to MongoDB.

Its purpose is to show how adapters, context propagation, models, providers, and infrastructure resolution work together as one execution system rather than as isolated utilities.

## The execution model

Every request inside Ambiten follows the same architectural path regardless of framework or deployment environment.

<SignalFlow
  aria-label="One request core flow"
  :items='["Request", "Adapter", "AmbitenContext", "AmbitenModel", "Provider", "AmbitenClient", "MongoDB"]'
/>

The transport layer may change, but the runtime model remains consistent.

### A simple request

A client sends a request into the system:

```http
GET /users
x-tenant-id: tenant-a
x-request-id: req-123
```

Inside an Express application, the handler may look entirely conventional:

```ts
app.get("/users", async (_req, res) => {
  const users = await UserModel.find({});
  res.json(users);
});
```

At the application layer, the operation appears simple. Underneath that call, however, Ambiten is coordinating tenant resolution, execution state, provider resolution, middleware, and persistence behavior automatically.

### Request ingress

Execution begins at the adapter boundary.

The adapter integrates with the host framework and transforms framework-specific requests into Ambiten’s runtime execution model.

```ts
createExpressAdapter().install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  }
});
```

At this stage, the runtime extracts operational metadata such as tenant identity, request identifiers, headers, cookies, and route parameters. The framework request is normalized into a consistent runtime shape before application logic begins.

### Tenant resolution

Once the request enters the runtime boundary, the adapter runtime resolves the active tenant scope.

```ts
tenantId = "tenant-a"
```

This tenant identity does not travel manually through services or model calls. Instead, it becomes part of the active execution boundary managed by the runtime itself.

### Context initialization

Ambiten establishes a scoped execution boundary using AmbitenContext.

```ts
AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },
  async () => {
    // route handler executes here
  }
);
```

From this point forward, all runtime-aware components resolve execution state directly from the active context. Tenant identity, request metadata, database overrides, and transaction sessions remain available throughout asynchronous execution without explicit parameter propagation.

### Application execution

Inside the request boundary, application logic remains focused on business behavior.

```ts
const users = await UserModel.find({});
```

The handler does not manually coordinate tenant state, request metadata, or transaction continuity.

```ts
// Not required during request-bound execution
await UserModel.find({}, { tenantId, requestId, session });
```

The runtime already owns the active execution state.

This separation is one of the primary architectural goals of Ambiten: application logic should not become responsible for infrastructure coordination.

### Model execution

AmbitenModel receives the operation and transforms it into a context-aware execution.

During this stage, the runtime may validate input through schema rules, execute middleware pipelines, attach instrumentation metadata, participate in active transactions, and prepare query execution state before infrastructure resolution occurs.

The model owns the operation boundary and determines which collection is being targeted during execution.

### Infrastructure resolution

Once execution reaches the provider layer, the model requests infrastructure bindings for the active runtime scope.

```ts
const db = await provider.db(ctx);
```

The provider resolves the correct database, tenant-aware infrastructure bindings, active sessions, runtime overrides, and persistence targets based on the current execution context.

Collection ownership, however, remains the responsibility of the model itself.

<SignalFlow
  aria-label="Provider and model responsibility flow"
  :items='["Provider resolves infrastructure", "Model resolves collection"]'
/>

This separation keeps execution responsibilities deterministic and composable.

### Client and database access

When AmbitenClient acts as the provider, it resolves the correct MongoDB infrastructure for the active tenant boundary.

For a tenant-aware request, execution typically follows this shape:

<SignalFlow
  aria-label="Tenant-aware client resolution"
  :items='["tenant-a", "tenant database/client", "users collection"]'
/>

The application layer does not need to understand how routing, database selection, or tenant partitioning occur internally. Those concerns remain isolated within the runtime infrastructure layer.

### Persistence execution

MongoDB ultimately executes the finalized operation:

```ts
db.collection("users").find(filter).toArray();
```

Once persistence completes, the result propagates back through the same execution boundary that initiated the request.

### Post-execution behavior

After persistence completes, the runtime continues executing post-operation behavior within the same scoped boundary.

Middleware may continue executing, instrumentation can record operation duration and metadata, logs may include tenant and request identifiers, and optional runtime systems such as cache invalidation or event dispatching can complete without leaking into application code.

The response then returns to the framework layer:

```ts
res.json(users);
```

When execution completes, the runtime scope is released automatically.

## Runtime flow

<OneRequestFlowVisual />

## Why this architecture matters

This execution model allows Ambiten to centralize infrastructure coordination while keeping application code stable and portable.

Tenant isolation, transaction participation, middleware execution, provider resolution, instrumentation, and runtime metadata propagation all remain attached to the execution boundary rather than becoming responsibilities of individual services or handlers.

As a result, the same model operation:

```ts
await UserModel.find({});
```

can execute consistently across Express, Fastify, NestJS, GraphQL, AWS Lambda, or background workers running inside `AmbitenContext.run(...)`.

The runtime environment changes. The execution model does not.

## Mental model

```text
You define the operation.

Ambiten supplies the execution boundary.
```

## Summary

A request in Ambiten is not merely a framework handler calling MongoDB.

It is a runtime-managed execution lifecycle where adapters, context propagation, models, providers, middleware, infrastructure resolution, and persistence operate together inside a single coordinated execution boundary.
