# Transactions

Transactions in Ambiten allow multiple dependent operations to execute as a single atomic unit of work.

Either every participating operation succeeds, or the entire execution is rolled back. This guarantee becomes essential whenever business correctness depends on coordinated writes across multiple collections, models, or runtime layers.

This page explains how Ambiten preserves transaction continuity inside an execution boundary. If you are looking for the runtime guarantees behind this behavior, see [Execution Guarantees](/architecture/execution-guarantees).

## Why transactions matter

Most real-world workflows are not isolated writes. They are coordinated execution sequences that must remain logically consistent even under failure conditions.

Without transactions, partial failure can leave systems in invalid states. A user may exist without a profile, inventory may be decremented without a recorded order, or audit entries may persist for operations that never completed successfully.

Transactions ensure that these workflows behave as one consistent unit of execution rather than a series of unrelated database operations.

## The Ambiten transaction model

In Ambiten, transactions are not treated as a manual session management problem.

They are part of the runtime execution model itself.

When a transaction begins, Ambiten creates a MongoDB session, binds it into AmbitenContext, and allows every downstream model operation to participate automatically.

The primary API is:

```ts
await AmbitenContext.withTransaction(async () => {
  // transactional work
});
```

This architecture provides three important guarantees:

- transaction state propagates automatically
- nested execution remains consistent
- atomic boundaries stay aligned with the runtime scope

<TransactionLifecycleOverview />

## Basic usage

```ts
import { AmbitenContext } from "@Ambiten/core";

await AmbitenContext.withTransaction(async () => {
  await UserModel.create({ name: "John" });

  await ProfileModel.create({
    user: "John"
  });
});
```

If any participating operation fails, the runtime rolls back the entire unit of work before control returns to the caller.

No partial writes survive the failure boundary.

## How propagation works

Transaction propagation follows the same execution principles as the rest of the runtime.

`withTransaction()` creates the session, AmbitenContext stores the active transaction state, downstream model operations resolve the session automatically, and the runtime commits or rolls back based on the final outcome of the execution boundary.

No manual session forwarding is required between services or model calls.

## Adapter integration

Transactions integrate naturally with Ambiten’s request-scoped runtime architecture.

Adapters can enable transaction-aware execution directly at the framework boundary:

```ts
// Express adapter example
const adapter = createExpressAdapter();

adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  },
  enableTransactions: true
});
```

Once enabled, transaction scope remains isolated to the active request lifecycle while preserving consistent session reuse throughout execution.

## Automatic session propagation

Inside a transaction boundary:

```ts
await AmbitenContext.withTransaction(async () => {
  await OrderModel.create(order);

  await InventoryModel.updateOne(
    { _id: itemId },
    { $inc: { stock: -1 } }
  );
});
```

Every operation automatically participates in the active MongoDB session.

This eliminates the need for patterns such as:

```ts
await Model.create(data, { session });
```

Transaction participation becomes part of the runtime contract rather than a discipline problem spread across application code.

## Nested transaction behavior

Nested transaction scopes remain predictable and safe.

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(data);

  await AmbitenContext.withTransaction(async () => {
    await AuditModel.create({
      action: "USER_CREATED"
    });
  });
});
```

When a transaction already exists, the nested scope reuses the active session instead of creating a competing transaction boundary.

The entire execution chain remains atomic and aligned with the same rollback behavior.

## Error handling and rollback

Rollback behavior is explicit and deterministic.

```ts
try {
  await AmbitenContext.withTransaction(async () => {
    await UserModel.create(data);

    throw new Error("fail");
  });
} catch (error) {
  console.error("Transaction rolled back", error);
}
```

Any unhandled error inside the boundary triggers rollback automatically.

Rollback completes before control returns to the caller, and the original error is preserved so application layers can respond appropriately.

## Transaction boundaries

Transactions remain scoped to the active execution boundary.

That boundary may originate from an adapter-managed request lifecycle or an explicit `withTransaction(...)` scope.

Transaction state does not cross unrelated requests, detached background tasks, or asynchronous execution chains outside the active context boundary.

This isolation is critical for correctness in concurrent systems.

## Multi-tenant compatibility

Transactions in Ambiten are inherently tenant-aware because transaction state lives inside AmbitenContext.

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(data);
});
```

The runtime guarantees that the active session remains aligned with the correct tenant infrastructure throughout execution.

This prevents transaction drift across tenant boundaries and ensures isolation remains intact even during complex write orchestration.

## Performance considerations

Transactions introduce coordination overhead and should be used intentionally.

They are most valuable when multiple dependent writes must remain consistent across collections or operational boundaries.

They are less appropriate for isolated document writes, read-only execution paths, or workflows involving long-running external latency.

The goal is correctness where consistency matters—not wrapping every database operation inside a transaction automatically.

## Retry strategy

MongoDB transactions may occasionally fail due to transient infrastructure conditions.

In those cases, retry logic is typically implemented at the orchestration boundary:

```ts
async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await AmbitenContext.withTransaction(fn);
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }

  throw new Error("Transaction retries exhausted.");
}
```

Retries should remain bounded, explicit, and appropriate for the operational requirements of the workflow.

## Example workflow

```ts
await AmbitenContext.withTransaction(async () => {
  const user = await UserModel.create({
    name: "Alice"
  });

  await WalletModel.create({
    userId: user._id,
    balance: 0
  });

  await AuditModel.create({
    action: "USER_CREATED",
    userId: user._id
  });
});
```

This guarantees that user creation, wallet provisioning, and audit recording either complete together or roll back together.

## Operational visibility

Transactions are also an important observability boundary.

When instrumentation or structured logging is enabled, runtime telemetry can expose transaction lifecycle events, participating operations, execution duration, rollback outcomes, tenant metadata, and request correlation identifiers.

This makes transactional behavior significantly easier to diagnose under production load or failure conditions.

## Best practices

Keep transactions short-lived and focused on integrity-sensitive workflows.

Avoid external network calls inside transaction boundaries whenever possible, since external latency increases transaction duration and expands the failure surface.

Use transactions intentionally around orchestration boundaries rather than scattering them inconsistently across unrelated service layers.

The most reliable transaction systems are usually the simplest and most deliberate.

## Relationship with other components

<SignalFlow
  aria-label="Transaction runtime relationship"
  :items='["Adapter", "AmbitenContext", "Transaction Boundary", "AmbitenModel", "MongoDB"]'
/>

Within the runtime architecture, adapters establish execution scope, `AmbitenContext` stores the active session, transaction boundaries define atomic execution, models reuse the active transaction state automatically, and MongoDB performs the final commit or rollback.

Each layer participates in the same runtime contract without leaking session coordination into application code

## Summary

Transactions in Ambiten are runtime-managed and context-driven.

They allow applications to maintain atomic consistency across complex workflows while keeping transaction coordination isolated from business logic.

Rather than treating transactions as a manual session propagation problem, Ambiten turns them into part of the execution model itself.

## Related pages

- [Context](/core/context)
- [Instrumentation](/core/instrumentation)
- [Director Observability Dashboard](/operations/director)
- [Context Binding](/models/context-binding)
- [AmbitenClient](/reference/api/ambiten-client)
- [Architecture](/architecture/whitepaper)
