# Introduction

Ambiten is a context-aware runtime for building scalable, multi-tenant systems on MongoDB.

It extends beyond traditional Object-Document Mapping by treating execution state as part of the runtime itself. Context propagation, tenant isolation, transaction continuity, and infrastructure resolution are handled inside the execution boundary so application code can remain focused on business behavior rather than operational coordination.

Ambiten is designed for systems where correctness across asynchronous execution matters as much as data access itself.

## What Ambiten is

Ambiten sits between your application and MongoDB as an execution-aware data runtime.

Rather than acting solely as a schema or query abstraction layer, Ambiten coordinates the operational state surrounding every database interaction. Request metadata, tenant scope, transaction sessions, middleware execution, and infrastructure bindings remain attached to the runtime throughout the execution lifecycle.

This allows services, models, and handlers to execute without repeatedly propagating infrastructure concerns through application code.

```ts
await UserModel.create(data);
```

Behind this operation, Ambiten automatically resolves:

- active tenant scope
- request-scoped metadata
- transaction session continuity
- provider and database resolution
- middleware execution
- instrumentation and observability context

The result is a cleaner execution model where infrastructure remains centralized and execution behavior remains predictable.

## Why teams adopt Ambiten

As backend systems grow, the difficulty is rarely CRUD itself. The challenge is maintaining execution correctness as runtime complexity increases.

In conventional architectures, tenant identity, request metadata, sessions, and cross-cutting policies often become manually threaded through services and helper layers. Over time, this creates fragile execution paths and infrastructure leakage throughout the codebase.

Ambiten addresses this by moving execution coordination into the runtime.

Context propagation becomes automatic. Transactions remain bound to the same execution boundary. Multi-tenancy is enforced at the runtime layer rather than through repeated query filtering. Middleware executes deterministically across operations, and infrastructure behavior becomes observable without duplicating instrumentation logic throughout the application.

This model allows teams to scale systems without continuously rebuilding infrastructure coordination patterns around the data layer.

## Runtime model

Every execution inside Ambiten follows a consistent lifecycle.

A request enters through an adapter boundary such as Express, Fastify, GraphQL, NestJS, or AWS Lambda. The runtime resolves tenant identity and request metadata, initializes a scoped AmbitenContext, and executes application logic inside that boundary.

From that point forward, models, providers, middleware, transactions, and instrumentation resolve execution state directly from the runtime rather than from manually propagated parameters.

<SignalFlow 
aria-label="Ambiten runtime flow" :items='["Adapter", "AmbitenContext", "Model", "Provider", "AmbitenClient", "MongoDB"]'
/>

This architecture allows execution behavior to remain consistent regardless of framework or deployment environment.

## Core capabilities

### Context-aware execution

Ambiten preserves execution state across asynchronous boundaries using AsyncLocalStorage. Runtime-aware components can access tenant identity, request metadata, sessions, and infrastructure bindings without explicit parameter passing.

### Runtime-enforced multi-tenancy

Tenant isolation is treated as a runtime boundary rather than a query-level concern. Once a tenant is resolved, all execution remains scoped to that tenant automatically.

### Transaction continuity

Operations executed within the same transaction boundary automatically share the same MongoDB session, eliminating accidental out-of-transaction writes.

### Adapter-driven portability

The execution model remains stable across REST APIs, GraphQL services, background jobs, and serverless environments because runtime coordination is decoupled from the transport layer.

### Middleware and observability

Middleware pipelines, instrumentation, logging, and runtime events execute consistently across all model operations, enabling centralized policy enforcement and operational visibility.

## Getting started

To begin working with Ambiten:

1. Start with [Installation](/getting-started/installation) to configure the runtime and dependencies.
2. Continue to [Quick Start](/getting-started/quick-start) to run a minimal Ambiten application.
3. Explore the architecture and runtime model through:
   - [Context](/core/context) 
   - [Transactions](/core/transactions)
   - [Adapters Overview](/adapters/overview) to understand how the runtime behaves in real applications.
4. [Runtime Execution Flow](/architecture/runtime-execution-flow)

## Positioning

Ambiten is not simply an ODM.

It is a runtime architecture for building context-aware, multi-tenant, execution-safe systems on MongoDB.
