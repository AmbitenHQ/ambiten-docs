---
title: Ambiten Architecture Overview
description: Understand Ambiten's context-aware runtime architecture, execution boundaries, multi-tenant infrastructure, transaction continuity, and MongoDB integration.
---

# Ambiten Architecture Overview

Ambiten is a context-aware runtime foundation for MongoDB applications.

Its primary architectural goal is to separate application behavior from execution infrastructure so that tenant identity, request metadata, transaction state, database routing, and runtime lifecycle concerns do not need to be manually propagated through business code.

Ambiten combines:

```text
context-aware execution
multi-tenant infrastructure
transaction continuity
framework adapters
model orchestration
MongoDB-native persistence
```

into one runtime model.

This page explains the structure of that architecture.

For the order in which an individual operation moves through the runtime, see [Runtime Execution Flow](/architecture/runtime-execution-flow).

For the invariants applications can rely on during that execution, see [Execution Guarantees](/architecture/execution-guarantees).

## Core Philosophy

Traditional application architectures often allow infrastructure concerns to spread through application layers.

A service may begin by accepting:

```text
tenantId
requestId
database
MongoDB session
logger metadata
```

and then forward those values through controllers, services, repositories, and models.

Conceptually:

```text
Controller
   ↓ passes tenantId
Service
   ↓ passes tenantId + session
Repository
   ↓ selects database
Model
```

This creates infrastructure coupling inside APIs that should primarily describe application behavior.

Ambiten takes a different approach.

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
Runtime-Aware Model
      ↓
Infrastructure Resolution
```

Execution-specific state is established once and remains available to runtime-aware components throughout the active execution.

Application code can therefore remain focused on operations such as:

```ts
await UserModel.find({});
```

instead of repeatedly coordinating the infrastructure required to execute that operation.

## Architectural Model

Ambiten uses a layered runtime architecture.

<ArchitectureDiagram />

At a high level:

```text
                PROCESS LIFETIME
                       │
            AmbitenBootstrapFactory
                       │
                 AmbitenRuntime
                       │
        ┌──────────────┴──────────────┐
        │                             │
MultiTenantManager             Runtime Providers
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
               EXECUTION LIFETIME
                       │
          Framework Adapter / Explicit
                 Context Boundary
                       │
                       ▼
                AmbitenContext
                       │
                       ▼
               Application Logic
                       │
                       ▼
                 AmbitenModel
                       │
                       ▼
           Infrastructure Resolution
                       │
                       ▼
                AmbitenClient
                       │
                       ▼
                    MongoDB
```

The architecture deliberately separates:

```text
process-level infrastructure
```

from:

```text
execution-level state
```

This distinction is central to Ambiten.

## 1. Bootstrap and Runtime Layer

`AmbitenBootstrapFactory` prepares long-lived runtime infrastructure.

Conceptually:

```text
Process Starts
      ↓
AmbitenBootstrapFactory
      ↓
configuration
schema
models
logging
MongoDB infrastructure
multi-tenancy
runtime services
      ↓
AmbitenRuntime
```

Bootstrap is concerned with **application lifetime**.

It is not responsible for identifying the tenant of an individual request.

That distinction is important:

```text
Bootstrap
→ prepares the runtime

Execution boundary
→ identifies the current execution
```

The resulting runtime infrastructure may serve many requests, GraphQL operations, jobs, or Lambda invocations during its lifetime.

## 2. Execution Entry Layer

Runtime-aware work must begin inside an Ambiten execution boundary.

There are two primary entry models.

### Adapter-Managed Execution

Supported environments establish the boundary through framework adapters.

```text
Express
Fastify
NestJS
GraphQL
AWS Lambda
      ↓
Adapter
      ↓
Adapter Runtime
      ↓
AmbitenContext
```

### Explicit Execution

Workers and other non-adapter environments can establish the boundary directly.

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant5",
    requestId: "job-123"
  },

  async () => {
    await UserModel.find({});
  }
);
```

This can be used for:

```text
background workers
queue consumers
scheduled jobs
maintenance processes
custom runtimes
```

The adapter is therefore one way of entering Ambiten.

It is not the only way.

## 3. Adapter Layer

Framework adapters translate host-specific execution semantics into Ambiten's shared runtime model.

Examples include:

```text
Express
→ middleware

Fastify
→ lifecycle integration

NestJS
→ module + interceptor

GraphQL
→ context factory

AWS Lambda
→ wrapped handler
```

An adapter may normalize:

```text
headers
method
URL
parameters
cookies
query values
body
request metadata
```

into the framework-neutral request structure understood by Ambiten's adapter runtime.

Adapters are intentionally thin.

They do not own:

```text
business logic
tenant database configuration
model execution
MongoDB persistence
```

Their primary responsibility is runtime ingress.

## 4. Adapter Runtime

`@ambiten/adapter-runtime` provides the shared execution machinery used by framework adapters.

Conceptually:

```text
Express Adapter ─────┐
Fastify Adapter ─────┤
NestJS Adapter ──────┤
GraphQL Adapter ─────┤
Lambda Adapter ──────┘
                     ↓
            Adapter Runtime
                     ↓
              AmbitenContext
```

This layer centralizes concerns such as:

```text
tenant identity resolution
tenant validation
request ID resolution
execution metadata
transaction-aware execution
context initialization
```

Framework-specific packages therefore do not need to independently implement Ambiten's execution semantics.

## 5. AmbitenContext

`AmbitenContext` is the execution-state layer of the runtime.

It is built around Node.js asynchronous context primitives and provides execution-scoped state across supported asynchronous call chains.

A context may contain:

```text
tenantId
requestId
dbName
collectionName
transaction session
debug state
logger metadata
custom metadata
```

Conceptually:

```text
Request A
→ AmbitenContext A

Request B
→ AmbitenContext B
```

even when both requests use the same application process and reusable MongoDB infrastructure.

This is the key distinction:

```text
Infrastructure may be shared.

Execution state is scoped.
```

Application services do not need to receive `AmbitenContext` explicitly through every function call.

Runtime-aware components resolve it when needed.

## 6. Application Layer

Controllers, resolvers, handlers, and services execute inside the active runtime boundary.

For example:

```ts
await UserModel.find({});
```

Application code does not need to manually know:

```text
which MongoDB client belongs to the tenant
which tenant database should be selected
which transaction session is active
which request ID belongs to the execution
```

Those concerns belong to runtime layers below the application.

This allows services to remain largely independent from the framework that introduced the execution.

The same service may be called from:

```text
Express
Fastify
NestJS
GraphQL
Lambda
worker
```

without changing its persistence logic.

## 7. AmbitenModel

`AmbitenModel` coordinates data operations within the active runtime.

Its responsibilities include operation-level behavior such as:

```text
schema-aware validation
middleware execution
effective context resolution
operation coordination
collection resolution
result processing
```

Conceptually:

```text
Application
      ↓
AmbitenModel
      ↓
effective execution context
      ↓
infrastructure resolution
```

The model does not need to understand whether execution originated from Express, NestJS, GraphQL, Lambda, or a background job.

That distinction has already been normalized by the runtime boundary.

## 8. Effective Context Resolution

Model execution may combine several sources of runtime configuration.

The general precedence model is:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
```

This allows applications to supply supported operation-level overrides while retaining the execution context established by the runtime.

The result is an effective operation context used for downstream infrastructure resolution.

## 9. Multi-Tenancy Layer

Multi-tenancy in Ambiten is an infrastructure-routing concern driven by execution identity.

The architecture separates two questions.

```text
Who is this execution for?
        ↓
TenantResolver
```

and:

```text
What infrastructure belongs to that tenant?
        ↓
MultiTenantManager
```

This gives the full model:

```text
Request
   ↓
TenantResolver
   ↓
tenantId
   ↓
AmbitenContext
   ↓
AmbitenModel
   ↓
MultiTenantManager
   ↓
Tenant MongoDB Client
   ↓
Tenant Database
```

Tenant identity therefore does not need to be translated into database infrastructure by controllers or services.

## 10. MultiTenantManager

`MultiTenantManager` owns runtime tenant infrastructure.

Its responsibilities include:

```text
tenant registry
tenant configuration
dynamic tenant discovery
lazy client activation
MongoDB client lifecycle
tenant runtime statistics
```

Conceptually:

```text
tenantId
   ↓
MultiTenantManager
   ↓
TenantConfig
   ↓
MongoClient
   ↓
database
```

This layer deliberately remains separate from request tenant resolution.

The adapter identifies the tenant.

The manager owns the tenant's infrastructure.

## 11. Dynamic Tenant Resolution

Ambiten does not require every tenant to be known during process startup.

When configured, a `TenantConfigResolver` can discover unknown tenants dynamically.

```text
tenant5
   ↓
MultiTenantManager.resolveTenant()
   ↓
local registry?
   │
   ├── yes
   │    ↓
   │ existing configuration
   │
   └── no
        ↓
   TenantConfigResolver
        ↓
   external tenant source
        ↓
   register tenant5
```

An external source may be:

```text
control database
tenant registry
configuration service
account service
infrastructure API
```

Application model code does not need to know whether the tenant was statically registered or dynamically discovered.

## 12. Lazy Tenant Infrastructure

Tenant registration does not necessarily imply immediate connection establishment.

A tenant may exist in the runtime as:

```text
registered = true
connected = false
lazy = true
```

until persistence requires access.

Then:

```text
Model Operation
      ↓
MultiTenantManager.getClient()
      ↓
connect tenant client
      ↓
database operation
```

This allows infrastructure consumption to follow actual tenant demand rather than requiring every configured tenant connection to remain active at process startup.

## 13. Provider and Infrastructure Resolution

Where provider abstractions participate, they translate the effective operation context into concrete runtime resources.

Conceptually:

```text
Effective Context
      ↓
Provider Resolution
      ↓
client
database
collection
session
```

For tenant-aware execution, provider resolution can cooperate with `MultiTenantManager`.

```text
AmbitenContext
tenantId = tenant5
      ↓
Provider / Model Resolution
      ↓
MultiTenantManager
      ↓
tenant client
      ↓
db_tenant5
```

Provider abstractions therefore consume execution state.

They do not determine request identity.

## 14. Transaction Layer

Transactions are part of the active execution model rather than manually propagated session arguments.

For example:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(...);
    await AuditModel.create(...);
  }
);
```

Conceptually:

```text
Transaction Boundary
      ↓
session S1
      ↓
Service
      ↓
Model A
      ↓
Model B
      ↓
same session S1
```

Participating Ambiten operations can resolve the active session from runtime state.

The application does not need to thread `ClientSession` through every service API.

Transaction completion belongs to the boundary that created the transaction.

```text
callback resolves
→ commit

callback rejects
→ rollback
```

Adapters may also establish request-wide transaction boundaries where configured.

## 15. AmbitenClient

`AmbitenClient` forms the bridge between Ambiten's runtime infrastructure and MongoDB driver behavior.

By the time execution reaches this layer, the runtime has resolved the relevant:

```text
client
database
collection
session
operation options
```

The client layer then participates in translating the finalized operation into MongoDB access.

Ambiten does not attempt to replace MongoDB semantics with an unrelated persistence abstraction.

## 16. Persistence Layer

MongoDB remains the underlying persistence system.

Ambiten's philosophy is:

> We do not mask MongoDB; we provide a structured execution model around it.

MongoDB concepts remain visible and relevant, including:

```text
collections
indexes
queries
aggregations
sessions
transactions
read concerns
write concerns
driver behavior
deployment topology
```

Ambiten adds execution architecture around those capabilities rather than hiding them.

# Process Lifetime vs Execution Lifetime

A useful way to understand the architecture is to separate long-lived resources from execution-specific state.

## Process-Level Infrastructure

```text
AmbitenRuntime
MultiTenantManager
MongoDB clients
runtime configuration
logging infrastructure
providers
```

These resources may serve many operations.

## Execution-Level State

```text
AmbitenContext
tenantId
requestId
transaction session
logger metadata
operation metadata
```

These values belong to one logical execution.

Conceptually:

```text
                 ONE PROCESS
                     │
          ┌──────────┴──────────┐
          │                     │
      Request A             Request B
          │                     │
    Context A               Context B
          │                     │
          └──────────┬──────────┘
                     │
             Shared Runtime
                     │
              MongoDB Clients
```

This separation is what allows resource reuse without execution-state leakage.

# Execution Lifecycle

The architecture can be summarized as:

| Stage | Action | Primary Component |
| --- | --- | --- |
| 1. Ingress | Work enters the application | Framework / Worker / Invocation |
| 2. Boundary | Execution is normalized or explicitly established | Adapter / `AmbitenContext.run()` |
| 3. Resolve | Tenant identity and execution metadata are resolved | Adapter Runtime / Application |
| 4. Scope | Execution state becomes active | `AmbitenContext` |
| 5. Execute | Domain logic runs | Controllers / Services / Resolvers / Workers |
| 6. Model | Data operation is coordinated | `AmbitenModel` |
| 7. Resolve Infrastructure | Tenant, client, database, collection, and session are selected | Provider / `MultiTenantManager` |
| 8. Persist | MongoDB operation executes | `AmbitenClient` / MongoDB |
| 9. Complete | Results return and execution boundary closes | Model / Transaction / Adapter |

The detailed lifecycle is documented in [Runtime Execution Flow](/architecture/runtime-execution-flow).

# Architectural Properties

## Context-Aware Execution

Runtime state belongs to the active execution boundary.

```text
Execution
   ↓
AmbitenContext
   ↓
runtime-aware components
```

This removes the need to manually propagate execution infrastructure through every application API.

## Framework Independence

Ambiten Core does not depend on a particular HTTP framework.

Framework-specific integration remains in adapter packages.

```text
Framework
   ↓
Adapter
   ↓
Adapter Runtime
   ↓
Core
```

The same model and service logic can therefore operate behind different supported execution environments.

Framework migration may still require changes to framework-specific routing and composition, but the Ambiten persistence/runtime contract does not need to be redesigned merely because the ingress framework changes.

## Tenant-Aware Infrastructure

Tenant identity is part of execution state.

Tenant resources belong to runtime infrastructure.

```text
tenantId
   ↓
AmbitenContext
   ↓
MultiTenantManager
   ↓
tenant resources
```

This avoids embedding tenant database selection throughout controllers and services.

## Transaction Continuity

Transaction state can travel through the same execution boundary as tenant and request context.

```text
Transaction
   ↓
Service
   ↓
Model A
   ↓
Model B
```

Participating Ambiten model operations can therefore resolve the active session consistently across application-layer composition.

## Dynamic Infrastructure

Ambiten can resolve runtime infrastructure when it is needed rather than requiring the complete tenant universe to be known at startup.

```text
unknown tenant
      ↓
TenantConfigResolver
      ↓
registration
      ↓
lazy client
      ↓
database operation
```

This makes the runtime suitable for applications where tenant configuration evolves independently of individual application deployments.

## Explicit Runtime Boundaries

Ambiten does not assume asynchronous state should live forever.

Execution state exists inside a defined boundary.

```text
enter
 ↓
execute
 ↓
complete
 ↓
leave
```

Detached jobs, queue consumers, and remote services establish new boundaries rather than relying on old request context to remain valid indefinitely.

# Isolation Model

Ambiten's isolation model is based on execution-scoped identity and runtime-controlled infrastructure resolution.

For example:

```text
Request A
tenantId = tenantA
      ↓
db_tenantA

Request B
tenantId = tenantB
      ↓
db_tenantB
```

Concurrent execution does not require application-global tenant mutation.

However, tenant resolution is not the same as authorization.

```text
Tenant Resolution
→ Which tenant is this execution for?

Authorization
→ May this caller access that tenant?
```

Applications remain responsible for access-control policy.

The exact persistence isolation strategy can also vary by application architecture.

Examples include:

```text
database per tenant
collection-based separation
shared collection strategies
hybrid architectures
```

Ambiten provides the runtime mechanism for tenant-aware execution and resource resolution.

It does not turn every possible tenancy topology into the same physical isolation model.

# Observability Architecture

Because execution state is available through `AmbitenContext`, runtime instrumentation can correlate operations with execution metadata.

For example:

```text
tenantId
requestId
database
collection
operation
duration
outcome
```

This enables context-aware:

```text
logging
metrics
instrumentation
diagnostics
tracing integrations
```

The runtime provides structured execution context for observability.

The behavior and delivery guarantees of a specific telemetry backend remain part of that instrumentation system's contract.

Ambiten therefore enables correlation.

It does not claim that every external telemetry destination provides perfect or lossless audit storage automatically.

# Failure Model

Ambiten's architecture preserves responsibility boundaries when execution fails.

Failures may originate from:

```text
tenant resolution
tenant validation
dynamic tenant discovery
provider resolution
model execution
MongoDB
transactions
application logic
```

Those failures propagate to the enclosing execution boundary.

The host environment then determines its transport-specific handling:

```text
Express
→ HTTP error response

GraphQL
→ GraphQL error

Lambda
→ invocation failure or mapped response

Worker
→ retry / rejection policy
```

Ambiten does not silently change tenant scope or persistence target in order to hide an infrastructure failure.

# Package Architecture

Ambiten's runtime also spans npm package boundaries.

A supported ESM application follows:

```text
ESM Application
      ↓
ESM Framework Adapter
      ↓
ESM adapter-runtime
      ↓
ESM Core
```

A supported CommonJS application follows:

```text
CommonJS Application
      ↓
CommonJS Framework Adapter
      ↓
CommonJS adapter-runtime
      ↓
CommonJS Core
```

Public package exports define those boundaries.

Applications should import from public package entry points instead of internal `dist` paths.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

rather than:

```text
@ambiten/core/dist/...
```

Maintaining a coherent package graph matters because execution context is shared across the adapter/runtime/Core relationship.

# Design Principles

## Separation of Execution and Infrastructure

Execution answers:

```text
Who does this operation belong to?
What state belongs to this execution?
```

Infrastructure answers:

```text
Which resources serve that execution?
```

Ambiten keeps these questions separate.

## Framework-Agnostic Core

Transport integration stays outside Core.

```text
Express specifics
Fastify specifics
NestJS specifics
GraphQL specifics
Lambda specifics
```

belong to their adapters.

Core works with normalized execution state instead.

## Context Instead of Prop-Drilling

Execution state is carried through the runtime rather than appended to every application function signature.

```text
tenantId
requestId
session
metadata
```

remain available to runtime-aware components without dominating domain APIs.

## Infrastructure Ownership

Long-lived resources belong to runtime infrastructure.

```text
MongoDB clients
tenant registry
runtime providers
```

Request-specific state does not.

This prevents accidental mixing of process lifetime and request lifetime.

## MongoDB Fidelity

Ambiten embraces MongoDB rather than trying to disguise it.

Applications can retain an understanding of the underlying database behavior while gaining a higher-level execution architecture around it.

## Explicit Boundaries

Ambiten guarantees behavior inside the runtime boundaries it controls.

It does not claim to transparently coordinate:

```text
separate processes
network calls
external side effects
distributed transactions
authorization policy
infrastructure availability
```

Those responsibilities remain explicit.

# Architectural Comparison

Ambiten should be compared primarily by **runtime architecture**, not simply by CRUD syntax.

Traditional ODMs, ORMs, and database libraries vary significantly in capability, so the table below describes a common application pattern rather than claiming identical behavior across every library.

| Concern | Typical Application-Level Pattern | Ambiten Runtime Pattern |
| --- | --- | --- |
| Execution state | Passed manually or framework-managed | `AmbitenContext` |
| Tenant identity | Application-specific resolution | Adapter/custom resolver → context |
| Tenant infrastructure | Application-managed routing | `MultiTenantManager` |
| Dynamic tenants | Custom application infrastructure | `TenantConfigResolver` |
| Transaction session | Often explicitly propagated | Active runtime transaction context |
| Framework integration | Application-specific | Adapter boundary |
| Model behavior | Library-specific | Runtime-aware model execution |
| Async correlation | Application/framework-specific | Context-aware execution |
| Resource lifetime | Application-managed | Runtime infrastructure ownership |
| MongoDB semantics | Depends on abstraction | Preserved intentionally |

The architectural difference is not that Ambiten is the only system capable of these behaviors.

The difference is that Ambiten makes them explicit parts of one runtime model.

# Complete Mental Model

The architecture can be summarized as:

```text
             PROCESS STARTUP
                   │
                   ▼
        AmbitenBootstrapFactory
                   │
                   ▼
             AmbitenRuntime
                   │
         ┌─────────┴─────────┐
         │                   │
MultiTenantManager       Providers
         │                   │
         └─────────┬─────────┘
                   │
                   │
          EXECUTION ENTERS
                   │
                   ▼
      Adapter / Explicit Boundary
                   │
                   ▼
            AmbitenContext
                   │
                   ▼
          Application Logic
                   │
                   ▼
            AmbitenModel
                   │
                   ▼
      Infrastructure Resolution
                   │
                   ▼
            AmbitenClient
                   │
                   ▼
               MongoDB
```

Another useful formulation is:

```text
Bootstrap prepares infrastructure.

Adapters establish execution.

Context carries execution state.

Models coordinate operations.

MultiTenantManager owns tenant resources.

Providers resolve infrastructure.

AmbitenClient reaches MongoDB.
```

# Summary

Ambiten is a context-aware runtime architecture for MongoDB applications that need execution state, multi-tenancy, transaction continuity, and infrastructure resolution to remain consistent without spreading those concerns throughout application code.

Its architecture separates:

```text
runtime startup
execution ingress
execution context
application logic
model coordination
tenant infrastructure
provider resolution
client access
MongoDB persistence
```

into distinct layers.

That separation allows the same application logic to operate across different supported environments while preserving a coherent execution model.

Ambiten's architectural goal is not to hide infrastructure.

It is to ensure that infrastructure concerns are owned by the layers designed to manage them.

## See Also

- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Execution Guarantees](/architecture/execution-guarantees)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Adapters Overview](/framework-adapters/overview)
- [Adapter Usage Patterns](/framework-adapters/usage-patterns)
- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Provider Contract](/models/provider-contract)
- [AmbitenClient](/reference/api/ambiten-client)