# Execution Guarantees

Execution guarantees define what Ambiten ensures at runtime, regardless of application complexity.
They establish the boundaries of correctness, consistency, and behavior that developers can rely on when building on top of the system.

This page is intentionally explicit. It clarifies both what Ambiten guarantees and what it does not.

This page explains how Ambiten guarantees execution behavior. If you are looking for how execution moves through the runtime, see [Runtime Execution Flow](/architecture/runtime-execution-flow).

<DocOverviewCards
  eyebrow="Runtime Contract"
  title="Ambiten guarantees correctness inside a single execution boundary."
  description="The runtime preserves context, keeps transactions on one session, enforces tenant scope when present, runs middleware deterministically, and emits structured non-blocking telemetry."
  accent="#6d5dfc"
  :signals='["Context propagation", "Transaction continuity", "Tenant isolation", "Middleware order", "Telemetry"]'
  :cards='[
    { "label": "Guaranteed", "title": "Execution state remains consistent", "text": "Operations inside a runtime boundary inherit the same context, tenant metadata, database overrides, and active session." },
    { "label": "Observable", "title": "Runtime behavior is emitted consistently", "text": "Instrumentation and events expose operation, duration, tenant, request, database, collection, and outcome metadata." },
    { "label": "Bounded", "title": "Ambiten does not pretend to own distributed systems", "text": "Cross-service transactions, network reliability, external side effects, and global tenant consistency remain application or infrastructure concerns." }
  ]'
  :flow='[
    { "label": "Boundary", "title": "AmbitenContext" },
    { "label": "Work", "title": "Model operations" },
    { "label": "Policy", "title": "Middleware and tenant scope" },
    { "label": "Signal", "title": "Instrumentation and events" }
  ]'
/>

## Why guarantees matter

In simple systems, correctness is often implicit in call structure. In runtime-driven systems, correctness depends on execution behavior across asynchronous boundaries, execution lifecycles, and infrastructure resolution.

Without clear guarantees, teams are forced to assume behavior, which leads to subtle bugs, inconsistent execution, and fragile production systems.

Ambiten defines its guarantees so that runtime behavior is predictable, testable, and safe to compose upon.

## Guaranteed behavior

### Context propagation

Ambiten guarantees that `AmbitenContext` is preserved across asynchronous execution within a single runtime boundary.

```ts
await AmbitenContext.run(
  { tenantId: "tenant-a" },
  async () => {
    await UserModel.create(data);
    await AuditModel.create(log);
  }
);
```

All operations inside the boundary inherit the same context without requiring manual propagation.

This includes: `tenant identity`, `request metadata`, `database overrides`, `active session`

### Transaction continuity

When a transaction is active, Ambiten guarantees that all model operations within that boundary execute using the same MongoDB session.

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(data);
  await ProfileModel.create(profile);
});
```

All operations participating in the boundary remain bound to the same MongoDB session for the duration of the transaction scope. In other words `consistent session binding` and `no accidental “out-of-transaction” writes`.

### Tenant isolation

Ambiten guarantees that, when tenant context is present and correctly resolved, all model operations execute within that tenant’s scope.

This applies to:

- database resolution
- collection access
- transaction boundaries
- instrumentation and events

Tenant scope is resolved at the execution boundary and remains immutable for the lifetime of that runtime context.

### Provider Resolution Consistency

Ambiten guarantees that provider resolution within a runtime boundary remains stable for the lifetime of that execution context.

Database handles, collection resolution, and session access remain scoped to the active runtime context and are not recomputed unpredictably during execution.

### Middleware execution order

Ambiten guarantees deterministic middleware execution.

For any operation:

```Plain text
before hooks → operation → after hooks
```

Hooks execute in registration order within each phase. This ensures predictable behavior for `validation`, `policy enforcement`, `transformation`, `lifecycle logic`

### Structured instrumentation

Ambiten guarantees that instrumented operations emit structured telemetry with consistent metadata.

Each operation will include `operation type`, `duration`, `tenant` and `request identifiers`, `database` and `collection` names, `success` or` failure` state

This makes runtime behavior observable and correlatable across requests.

### Non-blocking telemetry

Instrumentation and event emission are guaranteed to be non-blocking. Telemetry emission is decoupled from the primary execution path.

- request latency is not affected
- execution flow remains uninterrupted

### Boundary Lifetime

A runtime boundary begins when `AmbitenContext.run()` or an adapter runtime initializes execution context and ends when execution leaves that scope.

Context state is not guaranteed outside the active boundary lifetime.

## Non-guaranteed behavior

Ambiten is explicit about what it does not guarantee.

These boundaries are intentional.

### Cross-service transactions

Ambiten does not guarantee transaction continuity across multiple services or processes.

Transactions are limited to a single MongoDB session within a single runtime boundary.

Distributed transactions must be handled explicitly at the application or infrastructure level.

### Network and infrastructure reliability

Ambiten does not guarantee network availability, MongoDB cluster health, or external service responsiveness.

These are external concerns and must be handled through infrastructure design, retries, and resilience patterns.

### Global consistency across tenants

Ambiten does not enforce consistency across tenants.

Each tenant is treated as an independent execution scope.

Cross-tenant coordination must be implemented explicitly when required.

### External side-effect integrity

Operations involving external systems (such as payment APIs or messaging services) are not automatically coordinated with database transactions.

For example:

```ts
await AmbitenContext.withTransaction(async () => {
  await chargeCustomer(); // external call
  await OrderModel.create(order);
});
```

If the external call fails or behaves unpredictably, Ambiten cannot guarantee consistency between that system and MongoDB.

### Long-running execution safety

Ambiten does not guarantee safety for:

excessively long transactions, unbounded request execution, or uncontrolled background loops.

These must be managed through proper application design and runtime limits.

## Design intent

Ambiten’s guarantees are focused on execution correctness within a single runtime boundary.

They are designed to ensure that:

- context remains consistent
- transactions behave predictably
- tenant isolation is enforced
- middleware execution is deterministic
- instrumentation reflects real behavior

At the same time, Ambiten deliberately avoids overextending into areas that belong to:

distributed systems design, infrastructure reliability, and cross-service coordination.

## Mental model

```Plain text
Ambiten guarantees correctness inside the runtime.
The system guarantees correctness across runtimes.
```

## Summary

Execution guarantees define the contract between Ambiten and the applications built on top of it.

They provide confidence that runtime behavior will remain consistent across asynchronous execution, tenant boundaries, and transaction scopes, while clearly defining the limits of that responsibility.

By making these guarantees explicit, Ambiten allows teams to build systems that are both predictable and scalable without relying on implicit assumptions about how execution behaves.

## See also

- [Context](/core/context)
- [Transactions](/core/transactions)
- [Instrumentation](/core/instrumentation)
- [Multi-Tenancy Strategy](/architecture/multi-tenancy)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
