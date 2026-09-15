---
title: Transactions
description: Understand how Ambiten establishes transaction boundaries, carries MongoDB sessions through AmbitenContext, and binds transaction state into model execution.
---

# Transactions

Transactions in Ambiten allow related MongoDB operations to execute inside one atomic transaction boundary.

When participating operations succeed, the transaction can commit.

When the transaction callback fails, the surrounding boundary can abort the transaction so participating MongoDB writes do not partially complete.

Ambiten integrates transaction state into its execution model so application services do not need to manually propagate MongoDB sessions through every function call.

Conceptually:

```text
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Participating Operations
      ↓
MongoDB
```

> **The boundary owns the transaction. Context carries the session. Models participate in it.**

If you are looking for the wider runtime invariants behind this behavior, see [Execution Guarantees](/architecture/execution-guarantees).

## Why Transactions Matter

Many workflows contain several dependent persistence operations.

For example:

```text
create user
      ↓
create wallet
      ↓
write audit record
```

If those writes represent one logical action, allowing only some of them to persist can leave the application in an invalid state.

A transaction provides one persistence boundary around those participating operations.

```text
All participating writes succeed
            ↓
          commit
```

or:

```text
transaction callback fails
            ↓
          abort
```

Transactions are therefore most useful when correctness depends on several MongoDB operations succeeding together.

## The Ambiten Transaction Model

Ambiten treats transaction participation as execution state.

The primary explicit API is:

```ts
await AmbitenContext.withTransaction(
  async () => {
    // transactional work
  }
);
```

During transactional execution, the active MongoDB session becomes part of the Ambiten execution context.

Participating model operations then derive that session into their effective `ModelContext`.

```text
withTransaction(...)
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Model Operations
```

This removes the need to manually forward `session` through ordinary application services.

## Transaction Participation vs Transaction Ownership

These are separate responsibilities.

### Transaction Boundary

The enclosing transaction boundary owns:

```text
session creation
transaction start
callback lifetime
commit
abort / rollback
session completion
```

### Participating Operations

Model operations inside that boundary consume the active session.

```text
Transaction Boundary
      ↓
session S1
      ↓
UserModel
      ↓
session S1
      ↓
WalletModel
      ↓
session S1
```

Individual models do not independently commit the surrounding transaction.

> **Models participate. The enclosing boundary decides the outcome.**

## Basic Usage

```ts
import {
  AmbitenContext
} from "@ambiten/core";

await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create({
      name: "John"
    });

    await ProfileModel.create({
      user: "John"
    });
  }
);
```

Both participating model operations execute using the active transaction session.

If the transaction callback rejects, the error propagates through the transaction boundary and the transaction can be aborted before control returns to the caller.

## How Session Propagation Works

Transaction state follows the same context-binding model used by the rest of Ambiten.

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
Application Logic
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
DbProvider / AmbitenClient
      ↓
MongoDB
```

The model does not need:

```ts
await UserModel.create(
  data,
  {
    session
  }
);
```

during ordinary context-driven transactional execution.

Instead, the active session is inherited from the execution context.

## AmbitenContext and ModelContext

`AmbitenContextState` contains the execution-level session:

```ts
session?: ClientSession;
```

`ModelContext` also contains:

```ts
session?: ClientSession;
```

The two contracts serve different layers.

```text
AmbitenContextState
= full execution state

ModelContext
= model-operation-facing state
```

During model execution:

```text
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
```

The provider and model operation then receive the transaction session through the effective operation context.

## Explicit Operation Context

Ambiten also supports explicit operation-level context where the model API permits it.

The general precedence remains:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

That means transaction state should not be thought of as an unconditional immutable value if the public operation API explicitly allows a session override.

For ordinary transactional execution, however, the recommended pattern is to let the active transaction boundary supply the session.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(data);
  }
);
```

## Automatic Participation

Inside an active transaction:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await OrderModel.create(
      order
    );

    await InventoryModel.updateOne(
      {
        _id: itemId
      },
      {
        $inc: {
          stock: -1
        }
      }
    );
  }
);
```

participating Ambiten model operations can resolve the same active MongoDB session.

This is the transaction guarantee that matters:

```text
same active transaction boundary
        ↓
same active session
        ↓
participating Ambiten operations
```

The application does not need to manually attach the session to each model call.

## What “Automatic” Means

Automatic session participation applies to operations that execute through Ambiten's transaction-aware runtime path.

It should not be interpreted as:

```text
every arbitrary MongoDB driver call
automatically joins the transaction
```

For example, direct raw driver operations must use the appropriate session according to MongoDB's own API contract.

The safe mental model is:

> **Ambiten propagates transaction state for participating Ambiten operations. External or raw database calls remain responsible for their own session usage unless explicitly integrated with the active transaction.**

## Nested Transaction-Aware Execution

Nested transaction-aware code should remain aligned with the active transaction state rather than creating unrelated transactional state for every nested model call.

Conceptually:

```text
Outer Transaction Boundary
      ↓
session S1
      ↓
Service A
      ↓
Model A
      ↓
Service B
      ↓
Model B
```

Nested application calls can therefore participate in the same active session without receiving it as a function argument.

If a nested `withTransaction(...)` call is supported by the runtime, it should follow Ambiten's existing transaction-aware behavior rather than be treated as an independent cross-database transaction.

The important architectural invariant is:

```text
one active transaction execution
→ one participating session state
```

rather than competing session plumbing throughout nested services.

## Error Propagation

Errors inside the transaction callback should propagate through the enclosing transaction boundary.

```ts
try {
  await AmbitenContext.withTransaction(
    async () => {
      await UserModel.create(
        data
      );

      throw new Error(
        "Operation failed"
      );
    }
  );
} catch (error) {
  console.error(
    "Transaction failed",
    error
  );
}
```

Application code should not swallow an error inside the transaction callback if that error is intended to cause the transaction to fail.

The transaction boundary needs the callback outcome in order to determine whether execution completed successfully.

## Commit and Rollback

Transaction completion belongs to the enclosing boundary.

Conceptually:

```text
withTransaction()
      ↓
Model A
      ↓
Model B
      ↓
callback resolves
      ↓
commit
```

and:

```text
withTransaction()
      ↓
Model A
      ↓
Model B throws
      ↓
callback rejects
      ↓
abort
```

Post-processing inside individual models should not be described as committing or rolling back the transaction.

The transaction lifecycle exists one level above the participating operations.

## Explicit Transaction Boundaries

Use `AmbitenContext.withTransaction(...)` when one specific application workflow should execute transactionally.

For example:

```ts
await AmbitenContext.withTransaction(
  async () => {
    const user =
      await UserModel.create({
        name: "Alice"
      });

    await WalletModel.create({
      userId: user._id,
      balance: 0
    });
  }
);
```

This gives the application precise control over where the transaction starts and ends.

## Adapter-Managed Transactions

Supported adapters can also establish transaction-aware execution at the framework boundary.

Conceptually:

```text
Request / Invocation
      ↓
Adapter
      ↓
AmbitenContext
      ↓
Transaction Boundary
      ↓
Application Handler
      ↓
Model Operations
```

For example, an adapter may be configured with:

```ts
enableTransactions: true
```

In that mode, the adapter runtime establishes the transaction boundary around the supported execution lifecycle.

Application code can then remain:

```ts
await UserModel.create(data);
await AuditModel.create(log);
```

without manually opening another transaction around every handler.

## Explicit vs Adapter-Managed Transactions

These are two different usage patterns.

### Execution-Wide Transaction

```text
enableTransactions: true
```

Use this when the entire supported request, invocation, or execution should be transactional.

### Explicit Transaction

```ts
AmbitenContext.withTransaction(...)
```

Use this when only a specific workflow or part of the execution requires atomicity.

They should not be presented as two mandatory layers around the same operation.

Choose the transaction boundary that matches the application requirement.

## Express Example

A transaction-aware Express integration may conceptually look like:

```ts
adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (
      tenantId
    ) => {
      const tenant =
        await MultiTenantManager
          .resolveTenant(
            tenantId
          );

      if (!tenant) {
        throw new Error(
          `Tenant with ID "${tenantId}" not found.`
        );
      }

      return true;
    }
  },

  enableTransactions: true
});
```

Tenant resolution identifies which tenant belongs to the execution.

The transaction boundary then operates using the MongoDB infrastructure resolved for that execution.

There is no need for an unrelated fallback tenant when required tenant resolution fails.

## Framework Transaction Boundaries

Different adapters establish execution differently.

Examples include:

```text
Express
→ middleware / request lifecycle

Fastify
→ lifecycle hook execution

NestJS
→ interceptor and Observable execution

GraphQL
→ operation / resolver execution

Lambda
→ invocation execution
```

For transaction-aware adapters, the transaction callback must remain active for the actual application execution that participates in the transaction.

The transaction must not complete merely because the framework initially returned a deferred execution object.

The execution boundary and the transaction boundary must cover the same participating work.

## NestJS and Deferred Execution

Frameworks that defer application work require special care.

For example, NestJS handlers commonly execute through RxJS Observables.

The actual subscription must remain inside the Ambiten execution boundary for context continuity.

For request-wide transactions, the transaction boundary must likewise remain active until the participating Observable execution has completed or failed.

This is a framework-integration concern rather than a model concern.

## Multi-Tenant Transactions

Tenant identity and transaction state can coexist in the same execution context.

```text
AmbitenContext
├── tenantId = tenant-a
└── session = S1
```

Model execution then derives:

```text
Effective ModelContext
├── tenantId = tenant-a
└── session = S1
```

Tenant infrastructure resolution and transaction participation remain distinct responsibilities.

```text
tenantId
→ determines tenant infrastructure

session
→ determines transaction participation
```

## Tenant Infrastructure Alignment

A transaction session must belong to the MongoDB client participating in that transaction.

Conceptually:

```text
tenantId
      ↓
tenant infrastructure
      ↓
MongoClient
      ↓
ClientSession
      ↓
transaction
```

Ambiten's runtime should therefore keep tenant infrastructure resolution and session participation aligned.

A session created from one MongoDB client should not be treated as a portable session for unrelated tenant infrastructure.

## Transaction State Does Not Authorize Tenant Access

A transaction can be tenant-aware without performing authorization.

These remain separate concerns:

```text
Authentication
→ who is the caller?

Tenant Resolution
→ which tenant belongs to execution?

Authorization
→ may caller act for tenant?

Transaction
→ which MongoDB operations commit together?
```

A transaction boundary does not replace application security checks.

## Transactions and Dynamic Tenants

Dynamic tenant discovery may occur before transaction-capable infrastructure becomes available.

Conceptually:

```text
tenantId
   ↓
MultiTenantManager.resolveTenant()
   ↓
TenantConfigResolver if needed
   ↓
tenant MongoClient
   ↓
ClientSession
   ↓
Transaction Boundary
```

The transaction itself should operate against already resolved, transaction-capable MongoDB infrastructure.

Dynamic tenant discovery and transaction lifecycle are related runtime steps but remain separate responsibilities.

## Transactions and AmbitenClient

`AmbitenClient` provides session capability through the provider contract.

```ts
const session =
  await client.startSession(
    ctx
  );
```

Conceptually:

```text
ModelContext
      ↓
AmbitenClient.startSession(ctx)
      ↓
AmbitenClient.client(ctx)
      ↓
resolved MongoClient
      ↓
ClientSession
```

For tenant-aware execution, session creation can therefore resolve through the appropriate tenant client.

## Direct Session Control

Applications can also use `AmbitenClient.startSession()` directly when explicit MongoDB session control is required.

```ts
const session =
  await client.startSession();
```

This is useful for lower-level infrastructure work.

It is different from Ambiten's context-managed transaction path.

The two styles are:

```text
DIRECT SESSION CONTROL

AmbitenClient.startSession()
      ↓
application manages session usage
```

and:

```text
AMBITEN TRANSACTION BOUNDARY

AmbitenContext.withTransaction(...)
      ↓
runtime carries active session
      ↓
participating model operations
```

## Transactions and Schema Middleware

Schema middleware participates in the model operation's effective context.

```text
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Schema Middleware
      ↓
Model Operation
```

Middleware can therefore observe transaction-aware operation state where the middleware API exposes that context.

The schema does not commit or abort the surrounding transaction.

It participates inside it.

## Transactions and Providers

The provider receives the effective `ModelContext`.

```text
AmbitenModel
      ↓
ModelContext.session
      ↓
DbProvider
      ↓
AmbitenClient
```

The provider can therefore resolve infrastructure consistent with the active transaction state without application services manually forwarding the session.

## Context Isolation

Transaction state belongs to one execution boundary.

```text
Execution A
session = S1
```

must remain isolated from:

```text
Execution B
session = S2
```

or:

```text
Execution C
no transaction
```

This is one of the reasons transaction state belongs in `AmbitenContext` instead of mutable process-global state.

## Process vs Execution Lifetime

Transaction state is execution-scoped.

```text
PROCESS LIFETIME
────────────────
AmbitenRuntime
AmbitenClient
MongoClient
MultiTenantManager
providers
```

```text
EXECUTION LIFETIME
──────────────────
AmbitenContext
tenantId
requestId
ClientSession
transaction state
```

A long-lived MongoDB client may serve many independent transaction boundaries over time.

A transaction session should not become global process state.

## Cross-Process Boundaries

`AsyncLocalStorage` does not propagate transaction state across:

```text
message queues
worker processes
separate services
HTTP calls
external event systems
```

A transaction is therefore not automatically distributed across service boundaries.

For example:

```text
Service A MongoDB Transaction
        ↓
HTTP Request
        ↓
Service B
```

does not create one shared MongoDB transaction across the two services.

Each service has its own execution and infrastructure boundary.

## Cross-Service Transactions

Ambiten transactions should not be documented as distributed transactions.

They coordinate participating MongoDB operations inside the supported transaction boundary.

For workflows spanning:

```text
MongoDB
payment provider
email service
message broker
another service
```

MongoDB transaction semantics alone cannot make all external side effects atomic.

Those workflows may require application patterns such as:

```text
outbox
compensation
idempotency
workflow orchestration
```

depending on system requirements.

## External Side Effects

Avoid assuming that this is globally atomic:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await OrderModel.create(order);

    await paymentProvider.charge(
      payment
    );
  }
);
```

MongoDB can roll back the participating database write.

It cannot automatically reverse an external payment request.

The transaction boundary only governs resources participating in the MongoDB transaction.

## Detached Async Work

Detached work should not be assumed to remain part of an active transaction.

For example:

```text
Transaction Callback
      ↓
fire-and-forget task
      ↓
callback completes
      ↓
transaction boundary closes
```

The detached work may execute outside the transaction lifetime.

Integrity-sensitive work should remain awaited inside the transaction callback.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await firstOperation();
    await secondOperation();
  }
);
```

## Keep Transactions Finite

Transaction boundaries should remain finite and focused.

Avoid using a transaction as an open-ended application context.

Good transaction boundaries normally wrap:

```text
a finite set of related MongoDB operations
```

rather than:

```text
an entire long-running business process
```

This makes failure behavior easier to reason about and reduces transaction duration.

## Performance Considerations

Transactions add coordination overhead.

Use them where atomic multi-operation consistency is required.

They are often unnecessary for:

```text
single independent writes
read-only operations
unrelated persistence work
operations already atomic at document level
```

Long-running transactions can also hold resources longer and increase the chance of transient transaction failures.

The objective is:

> **Use the smallest transaction boundary that preserves correctness.**

## Avoid External Latency Inside Transactions

Where possible, avoid:

```text
slow HTTP calls
email delivery
payment processing
large remote API requests
human interaction
long-running computation
```

inside the MongoDB transaction callback.

These extend transaction duration without becoming part of MongoDB's atomicity guarantee.

A better architecture often separates:

```text
database atomicity
```

from:

```text
external workflow coordination
```

## Retry Strategy

MongoDB transactions can fail under transient conditions.

If application-level retry behavior is required, it should remain:

```text
bounded
explicit
safe for the workflow
aware of idempotency
```

For example:

```ts
async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (
    let attempt = 0;
    attempt < retries;
    attempt++
  ) {
    try {
      return await AmbitenContext
        .withTransaction(
          fn
        );
    } catch (error) {
      if (
        attempt ===
        retries - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error(
    "Transaction retries exhausted."
  );
}
```

Retry logic should not blindly retry every application error.

The application should distinguish retryable infrastructure failures from business or validation failures according to its operational policy.

## Idempotency and Retries

A transaction callback may contain code that is unsafe to repeat.

For example:

```text
send email
charge payment
publish external event
```

If the transaction itself is retried, those external effects can occur more than once unless the workflow is designed for idempotency.

Therefore:

```text
transaction retry
≠
automatic workflow retry safety
```

Retries should consider the entire callback, not only the MongoDB writes.

## Example Workflow

```ts
await AmbitenContext.withTransaction(
  async () => {
    const user =
      await UserModel.create({
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
  }
);
```

The intended transaction boundary is:

```text
UserModel.create
        +
WalletModel.create
        +
AuditModel.create
        ↓
one participating MongoDB transaction
```

If one participating operation causes the transaction callback to fail, the enclosing transaction boundary determines the rollback outcome.

## Observability

Transaction execution can expose useful runtime information when logging or instrumentation is configured.

Relevant metadata may include:

```text
tenantId
requestId
operation metadata
transaction outcome
duration
participating model operations
error information
```

`AmbitenContext` makes execution metadata available to instrumentation.

The delivery guarantees of the logging or telemetry backend remain separate from the transaction contract.

Avoid treating observability delivery as part of transaction atomicity.

## Auditing

Audit records written through participating Ambiten model operations can join the same MongoDB transaction.

For example:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(
      user
    );

    await AuditModel.create({
      action: "USER_CREATED"
    });
  }
);
```

In this case, the audit write participates as a MongoDB operation inside the same transaction boundary.

External audit sinks do not automatically gain the same atomicity.

## Best Practices

Keep transaction boundaries around integrity-sensitive MongoDB work.

Prefer:

```text
short
finite
explicit
awaited
single-purpose
```

transaction callbacks.

Allow participating model operations to inherit the active session through runtime context.

Avoid:

```text
manual session plumbing everywhere
detached work inside transaction boundaries
unbounded transactions
unnecessary transactions around simple operations
external side-effect assumptions
cross-service atomicity assumptions
```

Choose either adapter-wide or explicit workflow-level transactions according to the desired atomic boundary.

## Relationship with Other Components

<TransactionLifecycleOverview />

The complete runtime relationship is:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
Application Logic
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
DbProvider / AmbitenClient
      ↓
MongoDB
      ↓
Commit / Abort
```

For adapter-managed execution:

```text
Adapter
   ↓
AmbitenContext
   ↓
Transaction Boundary
   ↓
Application
```

For explicitly scoped execution:

```text
Application
   ↓
AmbitenContext.withTransaction(...)
   ↓
Transaction Boundary
```

Both ultimately provide the same model-facing transaction state:

```text
ModelContext.session
```

## Mental Model

A useful transaction mental model is:

```text
Boundary owns atomicity.

Context carries the session.

Model binds session to the operation.

Provider resolves transaction-capable infrastructure.

MongoDB provides transaction semantics.
```

Or more compactly:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
ModelContext.session
      ↓
Participating MongoDB Operations
```

## What Ambiten Transactions Do Not Guarantee

Ambiten transactions do not by themselves guarantee:

```text
cross-service transactions
external API atomicity
message-broker atomicity
payment rollback
network availability
MongoDB availability
authorization
automatic cross-process session propagation
arbitrary raw-driver participation
infinite transaction lifetime
```

Those concerns belong to other application or infrastructure layers.

## Summary

Transactions in Ambiten are execution-scoped and context-driven.

The transaction boundary establishes and owns the MongoDB transaction.

`AmbitenContext` carries the active `ClientSession`.

`AmbitenModel.mergeCtx()` projects that session into the effective `ModelContext`.

Participating Ambiten operations then execute against the active transaction state without requiring manual session propagation.

The core path is:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
DbProvider / AmbitenClient
      ↓
MongoDB
```

The transaction boundary owns:

```text
start
commit
abort
completion
```

while models own:

```text
operation execution
```

and providers/client infrastructure own:

```text
database
MongoClient
session capability
```

The guiding principle is:

> **Keep atomicity at the boundary, transaction state in context, and session plumbing out of application services.**

## Related Pages

- [Context](/core/context)
- [Context Binding](/models/context-binding)
- [AmbitenModel](/models/ambiten-model)
- [Schema](/models/schema)
- [Provider Contract](/models/provider-contract)
- [AmbitenClient](/reference/api/ambiten-client)
- [Instrumentation](/core/instrumentation)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Architecture](/architecture/whitepaper)
