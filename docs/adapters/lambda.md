# Lambda Adapter

The Lambda adapter integrates Tenra into AWS Lambda by wrapping the handler itself rather than attaching to a request middleware chain.

In serverless environments, the handler is the execution boundary. The adapter establishes runtime scope before the handler executes so every invocation runs inside a fully initialized `TenraContext`.

This allows Lambda-based systems to preserve the same runtime guarantees as Express, Fastify, GraphQL, or NestJS environments while remaining aligned with AWS Lambda’s stateless execution model.

## Integration model

Wrap the Lambda handler with `createLambdaAdapter(...)`.

```ts
import { createLambdaAdapter } from "@tenra/lambda";

export const handler = createLambdaAdapter(
  async (event) => {
    const users = await UserModel.find({});

    return {
      statusCode: 200,
      body: JSON.stringify(users)
    };
  },
  {
    tenancy: {
      header: "x-tenant-id",
      fallback: "default"
    }
  }
);
```

The wrapper normalizes the invocation, initializes runtime context, and ensures the handler executes inside the active Tenra runtime boundary.

## How the adapter works

Unlike traditional HTTP servers, AWS Lambda does not expose a persistent middleware lifecycle. Each invocation is isolated and short-lived.

The adapter therefore integrates directly around the handler execution path.

Internally, the adapter normalizes headers, paths, methods, cookies, and runtime metadata into a `TenraRequestLike` structure, invokes the adapter runtime, initializes `TenraContext`, and then executes the original handler inside that scope.

This ensures Lambda execution behaves consistently with every other Tenra runtime.

## Execution flow

The execution lifecycle remains structurally identical to other adapters even though the runtime model is event-driven.

<SignalFlow 
   aria-label="Lambda adapter execution flow"
   :items='["Lambda Event", "Adapter Wrapper", "Adapter Runtime", "TenraContext", "Handler", "MongoDB"]'
/>

The Lambda runtime provides the invocation event, the adapter establishes execution scope, and the handler executes with full runtime awareness.

## Handler execution

Once the adapter is installed, handlers can execute model operations directly without manual runtime coordination.

```ts
export const handler = createLambdaAdapter(async () => {
  const users = await UserModel.find({});

  return {
    statusCode: 200,
    body: JSON.stringify(users)
  };
});
```

Tenant resolution, context initialization, instrumentation, and middleware participation happen automatically inside the runtime boundary.

## Runtime behavior

Each Lambda invocation creates a fresh execution scope.

TenraContext is initialized per invocation, tenant identity is resolved from the incoming event metadata, and model execution remains fully context-aware throughout the handler lifecycle.

Because Lambda execution is stateless, runtime scope never leaks between invocations even when infrastructure resources such as MongoDB connections are reused internally.

This isolation is essential for correctness in concurrent serverless workloads.

## Transaction-aware execution

Transactions work inside Lambda the same way they do in every other Tenra runtime.

```ts
import { TenraContext } from "@tenra/core";

export const handler = createLambdaAdapter(async () => {
  return TenraContext.withTransaction(async () => {
    const user = await UserModel.create({
      name: "Alice"
    });

    await AuditModel.create({
      action: "USER_CREATED",
      userId: user._id
    });

    return {
      statusCode: 200,
      body: JSON.stringify(user)
    };
  });
});
```

The active session propagates automatically across nested model operations inside the invocation boundary.

## Stateless execution model

AWS Lambda introduces a fundamentally different runtime environment compared to long-running servers.

There is no persistent request lifecycle, execution environments may cold start or resume unpredictably, and runtime state must never be assumed to persist between invocations.

The adapter accounts for this by rebuilding runtime context on every execution while still allowing infrastructure layers such as database clients to reuse connections safely where appropriate.

This keeps execution deterministic without breaking serverless scalability characteristics.

## Why Lambda integration matters

Without a runtime adapter, serverless systems often accumulate repeated boilerplate around tenant resolution, request metadata propagation, transaction setup, and execution tracing.

The Lambda adapter centralizes those concerns into the runtime itself so handlers remain focused on business logic rather than infrastructure coordination.

This becomes especially important in event-driven systems where consistency across workers, queues, APIs, and scheduled functions matters operationally.

## Mental model

The Lambda adapter should be viewed as a runtime wrapper around invocation execution.

```PlainText
Lambda Event → Adapter → Context → Handler → MongoDB
```

The adapter establishes execution scope once, and all downstream operations inherit that state automatically.

## Summary

The Lambda adapter bridges AWS Lambda’s event model with Tenra’s runtime system.

It normalizes invocation execution into a consistent runtime boundary, initializes `TenraContext` for every request, preserves tenant-aware and transaction-aware execution, and allows serverless handlers to behave identically to traditional web runtimes without introducing infrastructure boilerplate.

## Related pages

- [Adapters Overview](/adapters/overview)
- [Usage Patterns](/adapters/usage-patterns)
- [TenraBootstrap](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
