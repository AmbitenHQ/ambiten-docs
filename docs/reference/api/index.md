# API Overview

The Ambiten API is organized around a single architectural principle:

>**Execution happens inside a runtime boundary, not through isolated function calls.**

Every major API surface in Ambiten exists to support one coordinated execution model. Context establishes execution scope, models coordinate operations, providers resolve infrastructure, and MongoDB performs persistence inside a consistent runtime path.

The goal is not to expose a large collection of disconnected utilities. The goal is to make execution behavior predictable, portable, and observable across the entire system.

<DocOverviewCards 
eyebrow="API Surface" title="Each API owns one responsibility inside the same execution model." description="Ambiten organizes context, models, schemas, providers, clients, middleware, transactions, instrumentation, and events around one coordinated runtime boundary." accent="#4568f2" :signals='["Context", "Model", "Schema", "Provider", "Client", "Middleware", "Events"]'
:cards='[ { "label": "Scope", "title": "Context defines execution", "text": "Tenant identity, request metadata, database overrides, and sessions are established once and inherited throughout execution." }, { "label": "Behavior", "title": "Models and schemas define operational behavior", "text": "Validation, middleware, lifecycle rules, and execution policies remain inside the runtime layer rather than scattered across services." }, { "label": "Infrastructure", "title": "Providers and clients resolve where work executes", "text": "Database, MongoDB client, and session resolution adapt dynamically without leaking infrastructure concerns into application logic." } 
]' 
:flow='[ { "label": "Ingress", "title": "Adapter" }, { "label": "Scope", "title": "Context" }, { "label": "Execution", "title": "Model" }, { "label": "Resolution", "title": "Provider" }, { "label": "Persistence", "title": "MongoDB" }
]'
/>

## The shape of the system

At a high level, every `Ambiten` application follows the same execution path:

```text
Adapter → Context → Model → Provider → Client → MongoDB
```

Each layer exposes its own API surface, but those APIs are not independent. They cooperate inside one runtime model where responsibilities remain clearly separated.

This separation is what allows `Ambiten` to support multi-tenancy, transaction-aware execution, runtime portability, and observability without pushing infrastructure logic into business code.

## Core runtime APIs

The core runtime APIs define how execution is scoped, how operations behave, and how persistence is coordinated.

### Context

`AmbitenContext` establishes the execution boundary.

It carries runtime-scoped state such as tenant identity, request metadata, database overrides, active sessions, and instrumentation metadata. Any operation executed inside that boundary automatically inherits the same execution scope.

This is what enables context-aware execution without manually threading infrastructure state through every service or function.

### Models

Models

`AmbitenModel` is the primary execution surface for application-level data access.

Models coordinate operations, participate in middleware pipelines, consume runtime context, and execute inside active transaction boundaries automatically.

A model defines the operational boundary for a collection while remaining independent from infrastructure resolution concerns.

### Schema

`AmbitenSchema` defines structural and behavioral rules around persistence.

Schemas control validation, middleware hooks, transformation behavior, lifecycle rules, and runtime-aware policy enforcement. They shape how data behaves during execution, not merely how it is stored.

### Provider

The provider contract defines how infrastructure is resolved during execution.

Providers supply databases, MongoDB clients, and sessions based on the active runtime context. This allows infrastructure behavior to adapt dynamically without requiring model definitions to change.

In most applications, this responsibility is fulfilled by `AmbitenClient`.

### Client

`AmbitenClient` is the infrastructure bridge between `Ambiten` and MongoDB.

It manages connections, resolves tenant-aware databases, supports scoped execution boundaries, and exposes lower-level infrastructure capabilities while still participating in the same runtime-aware execution model as the rest of the system.

## Execution system APIs

Beyond persistence access, `Ambiten` also exposes APIs that shape execution behavior across the runtime.

### Middleware

Middleware allows execution behavior to be intercepted and extended around model operations.

Validation, auditing, access control, transformation, soft delete enforcement, and observability logic can all execute consistently without being duplicated across application layers.

### Transactions

Transactions are managed through runtime context.

When a transaction boundary is active, all participating operations automatically reuse the same MongoDB session, ensuring atomic consistency without manual session propagation.

### Instrumentation

Instrumentation transforms execution into an observable runtime system.

Operations can emit structured telemetry containing duration, execution metadata, tenant identity, request identifiers, and operational signals that make runtime behavior measurable rather than opaque.

### Events

Events expose execution activity as structured runtime signals.

This enables integrations with observability systems, audit pipelines, analytics tooling, and operational monitoring platforms without coupling those systems directly to application logic.

## Infrastructure and integration APIs

Ambiten also provides APIs responsible for runtime initialization and framework integration.

### Bootstrap

`AmbitenBootstrap` prepares the runtime environment.

It initializes infrastructure, configures multi-tenancy, establishes runtime behavior, and wires optional systems such as adapters, logging, instrumentation, and GraphQL integration.

Bootstrap defines how the runtime starts, not how execution behaves internally.

### Adapters

Adapters connect `Ambiten` to external runtimes such as Express, Fastify, NestJS, GraphQL servers, and serverless environments.

Their responsibility is to normalize incoming execution into Ambiten’s runtime model and establish the context boundary for downstream operations.

## Mental model

The API surface becomes easier to understand when viewed through architectural responsibilities:

```text
Context    → defines execution scope
Model      → coordinates operations
Schema     → defines behavior and validation
Provider   → resolves infrastructure
Client     → connects to MongoDB
Middleware → shapes execution
Events     → expose execution signals
```

Each layer owns one responsibility while remaining part of the same coordinated runtime path.

## How the APIs work together

A typical operation demonstrates how these APIs cooperate during execution:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "req-123"
  },
  async () => {
    return UserModel.find({});
  }
);
```

Although the application code appears minimal, several runtime layers participate automatically.

The context establishes execution scope.
The model coordinates execution.
Middleware shapes behavior.
The provider resolves infrastructure.
The client communicates with MongoDB.
Instrumentation and events expose operational signals.

The runtime manages the execution system so application code can remain focused on business behavior.

## Design philosophy

The Ambiten API is intentionally organized around runtime-oriented design principles.

Execution is context-driven rather than parameter-driven. Infrastructure resolution remains separated from model behavior. Runtime concerns such as tenant isolation, transaction continuity, and instrumentation are enforced centrally instead of being reimplemented across services.

This allows systems to grow in complexity while preserving clarity at the application layer.

## Summary

The Ambiten API is not a collection of isolated utilities. It is a structured interface to a coordinated execution runtime.

By separating context, execution behavior, infrastructure resolution, and persistence into clearly defined layers, Ambiten allows applications to support complex runtime behavior without losing architectural coherence.

Understanding how these APIs fit together is the foundation for using Ambiten effectively.

### Related pages

- [AmbitenModel](/models/ambiten-model)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [AmbitenClient](/reference/api/ambiten-client)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
