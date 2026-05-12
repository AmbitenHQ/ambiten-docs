# Adapters Overview

Adapters are the ingress layer of the Tenra runtime.

They connect external frameworks and execution environments to Tenra’s context-driven execution model by establishing a consistent runtime boundary before application logic begins executing.

Adapters do not replace frameworks.
They normalize them into the same execution system.

Whether execution starts in Express, Fastify, GraphQL, NestJS, or AWS Lambda, the runtime behavior remains consistent once the request enters Tenra.

## Why adapters exist

Modern applications run across very different environments.

An HTTP request in Express behaves differently from a GraphQL resolver execution or a Lambda invocation lifecycle. Without a unifying runtime layer, each environment tends to solve the same operational concerns independently: request context propagation, tenant resolution, transaction initialization, metadata correlation, and async execution continuity.

Over time, this creates duplicated infrastructure logic and inconsistent execution behavior across services.

Adapters eliminate that fragmentation by establishing one shared runtime contract regardless of the host framework.

## The adapter responsibility

Adapters are intentionally small.

They do not execute business logic or persistence operations. Their responsibility is to establish runtime scope correctly before execution continues downstream.

At runtime, an adapter normalizes incoming requests or events, resolves request and tenant metadata, initializes TenraContext, optionally enables transaction-aware execution, and then returns control to the framework lifecycle.

Once the execution boundary exists, models, middleware, instrumentation, and transactions behave consistently across environments.

## The shared execution model

Regardless of framework, execution follows the same conceptual path:

```PlainText
Framework → Adapter → Adapter Runtime → TenraContext → Models → MongoDB
```

<SignalFlow 
aria-label="Shared adapter runtime flow" 
:items='["Framework", "Adapter", "Adapter Runtime", "TenraContext", "Core", "MongoDB"]' 
/>

The framework handles transport and lifecycle semantics.
The adapter establishes runtime scope.
TenraContext carries execution state.
Models and middleware consume that state during execution.

This separation is what allows Tenra applications to remain portable without rewriting model or persistence logic for each environment.

## Supported adapters

Tenra currently supports:

| Runtime    | Integration style        |
| ---------- | ------------------------ |
| Express    | Middleware               |
| Fastify    | Lifecycle hooks          |
| NestJS     | Modules and interceptors |
| GraphQL    | Context factory          |
| AWS Lambda | Wrapped handler          |

Although the integration style changes between frameworks, the execution contract remains identical once execution enters the runtime.

## The adapter runtime

Internally, adapters delegate execution setup to a shared adapter runtime layer.

This layer centralizes tenant resolution, context initialization, transaction coordination, and async execution continuity so those responsibilities do not need to be reimplemented separately for every framework integration.

The result is operational consistency across runtimes rather than framework-specific implementations of context handling and transaction propagation.

## Runtime portability

One of the primary goals of the adapter system is portability.

The same model operation:

```ts
await UserModel.find({});
```

should behave identically whether it executes inside Express middleware, a Fastify hook chain, a NestJS interceptor boundary, a GraphQL resolver, or a Lambda invocation.

The adapter ensures runtime scope is already established before execution reaches application code.

This allows business logic to remain focused on domain behavior instead of infrastructure coordination.

## Choosing an adapter

Adapter choice should follow the host environment rather than application architecture.

Express fits middleware-oriented HTTP services. Fastify aligns well with performance-focused hook-driven systems. NestJS is designed for modular enterprise applications, while GraphQL adapters support resolver-driven execution. AWS Lambda adapters are intended for serverless and event-driven workloads.

The adapter changes how execution enters the runtime, not how runtime features behave after execution begins.

## Architectural boundary

Adapters define the separation between transport and execution.

```sh
Framework → transport and lifecycle
Adapter   → runtime initialization
Context   → execution state
Models    → data operations
MongoDB   → persistence
```

Without this separation, transport concerns and runtime concerns tend to become tightly coupled.

Adapters preserve that boundary cleanly.

## Summary

Adapters are the ingress boundary into the Tenra runtime.

They normalize framework-specific execution into a shared context-aware model, initialize runtime scope, resolve tenant identity, and prepare transaction-aware execution before application logic begins.

This is what allows Tenra applications to remain portable, predictable, and operationally consistent across multiple runtimes.

## Related pages

- [Express](/adapters/express)
- [Fastify](/adapters/fastify)
- [NestJS](/adapters/nestjs)
- [GraphQL](/adapters/graphql)
- [Lambda](/adapters/lambda)
- [Usage Patterns](/adapters/usage-patterns)
