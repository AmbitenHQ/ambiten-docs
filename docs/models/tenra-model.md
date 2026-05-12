# TenraModel

`TenraModel` is the runtime execution unit for data operations in Tenra.

This page explains how TenraModel executes operations inside an execution boundary. If you are looking for how model execution receives tenant, database, and session state, see [Context Binding](/models/context-binding).

A `TenraModel` represents a collection, but more importantly, it executes inside Tenra’s runtime architecture. Every operation automatically participates in context propagation, tenant isolation, transaction boundaries, middleware execution, and provider-driven infrastructure resolution without requiring those concerns to be passed manually through application code.

If `TenraContext` defines execution state and `TenraClient` resolves infrastructure, `TenraModel` is where both converge.

>Provider resolves. Model executes.

## What TenraModel is

A `TenraModel` is a typed, schema-bound execution surface for persistence operations.

It is responsible for coordinating runtime-aware model execution while remaining isolated from infrastructure orchestration concerns such as tenant routing, connection management, or transport-layer behavior.

Application workflows define orchestration. Providers resolve infrastructure. `TenraModel` executes operations inside the active runtime boundary.

## Runtime responsibilities

`TenraModel` owns the execution lifecycle surrounding persistence behavior.

It exposes schema-aware operations such as:

```ts
await UserModel.find({});
await UserModel.create(data);
await UserModel.updateOne(filter, update);
```

Although these APIs appear simple, execution occurs inside a prepared runtime scope.

During execution, the model automatically resolves tenant identity, database scope, active transaction state, middleware participation, request metadata, and collection behavior from the active `TenraContext`.

This allows application code to remain clean while the runtime coordinates execution consistency underneath.

### Context-aware execution

Every operation executes inside the current runtime boundary.

```ts
await TenraContext.run(
  {
    tenantId: "tenant-a",
    dbName: "tenant_a_db"
  },
  async () => {
    return UserModel.find({});
  }
);
```

The model call itself remains stable.

What changes dynamically is the execution context surrounding the operation: the active tenant, resolved database, transaction session, middleware behavior, request metadata, and infrastructure bindings.

This separation between static definition and dynamic execution is one of the central architectural ideas behind Tenra.

>Static model definition. Dynamic runtime execution.

### Transaction participation

When a transaction is active, model operations automatically participate in the same execution scope.

```ts
await TenraContext.withTransaction(async () => {
  await UserModel.create(data);
});
```

The active session propagates through the runtime boundary automatically, allowing nested operations to remain transaction-safe without explicit session plumbing.

### Middleware participation

Every operation executed through TenraModel participates in the middleware lifecycle.

Validation, auditing, access shaping, normalization, observability, soft-delete enforcement, and policy execution all occur consistently around persistence behavior rather than being scattered across service layers.

Because middleware executes inside the same runtime boundary, it remains tenant-aware and transaction-aware automatically.

## Infrastructure delegation

`TenraModel` does not communicate with MongoDB directly.

Infrastructure resolution is delegated to the provider layer.

```ts
TenraModel → TenraClient → MongoDB
```

This separation allows infrastructure behavior to change dynamically per execution boundary while models remain stable and transport-agnostic.

Database selection, tenant routing, session resolution, and client lifecycle management therefore remain outside business logic and outside the model itself.

## Runtime relationship

<TenraModelRuntimeFlow />

The adapter establishes the execution boundary, TenraContext stores runtime state, TenraModel coordinates execution behavior, TenraClient resolves infrastructure, and MongoDB performs persistence.

Each layer owns a distinct responsibility inside the runtime architecture.

## Provider relationship

Every TenraModel depends on a provider.

The provider resolves the active database, MongoClient, tenant scope, and transaction session for the current execution boundary.

This allows models to remain portable across environments while adapting dynamically to runtime state.

## Why this architecture matters

Without a runtime-aware execution boundary, applications often accumulate infrastructure leakage over time.

Tenant identifiers become manually threaded through services. Transaction sessions must be propagated explicitly. Infrastructure logic spreads across workflows. Persistence behavior becomes tightly coupled to application structure.

TenraModel prevents this fragmentation by centralizing execution behavior inside the runtime layer itself.

The result is a cleaner separation between application behavior and infrastructure coordination.

## Relationship with other concepts

<TenraModelConceptMap />

## Design principles

<TenraModelPrinciples />

## Summary

`TenraModel` is not merely a collection wrapper or document abstraction.

It is the runtime execution layer responsible for coordinating context-aware, middleware-aware, tenant-aware, and transaction-aware persistence behavior inside Tenra’s execution model.

By combining schema definition, runtime context propagation, middleware orchestration, and provider delegation, `TenraModel` enables consistent and infrastructure-independent data execution across the system.

## See also

- [Defining Models](/models/defining-models)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Middleware](/core/middleware)
- [TenraClient](/api/tenra-client)
- [Architecture](/architecture/whitepaper)
