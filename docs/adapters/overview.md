---
title: Adapters Overview
description: Connect framework and invocation lifecycles to Ambiten's shared context-aware execution runtime.
---

# Adapters Overview

Adapters are the ingress layer of Ambiten's execution runtime.

They connect external frameworks and invocation environments to Ambiten's context-driven execution model by establishing a consistent execution boundary before application logic begins.

Adapters do not replace frameworks.

They normalize framework-specific execution into the same Ambiten runtime contract.

Whether execution begins in:

- Express,
- Fastify,
- NestJS,
- GraphQL,
- or AWS Lambda,

the underlying Ambiten execution model remains consistent once the operation enters the adapter boundary.

```text
External Execution
        ↓
Framework Adapter
        ↓
Adapter Runtime
        ↓
AmbitenContext
        ↓
Application Logic
        ↓
AmbitenModel
        ↓
Runtime Infrastructure
```

## Why Adapters Exist

Modern applications execute across very different environments.

An Express request follows middleware.

Fastify uses lifecycle hooks.

NestJS coordinates execution through modules and interceptors.

GraphQL is resolver-driven.

AWS Lambda uses invocation handlers.

Without a shared runtime boundary, each environment would need to independently solve concerns such as:

```text
tenant resolution
request metadata
execution context
transaction propagation
async continuity
runtime correlation
```

Over time, this creates duplicated infrastructure logic and inconsistent application behavior.

Ambiten adapters remove that fragmentation.

Each adapter translates its host environment into the same execution model.

```text
Different frameworks
        ↓
different integration mechanisms
        ↓
same Ambiten runtime contract
```

## Adapters Do Not Initialize the Runtime

Runtime initialization and request execution are separate lifecycle concerns.

`AmbitenBootstrapFactory` prepares long-lived application infrastructure.

Adapters establish execution scope when work enters the application.

```text
AmbitenBootstrapFactory
→ initializes runtime infrastructure

Framework Adapter
→ establishes execution boundary

AmbitenContext
→ carries execution state

MultiTenantManager
→ manages tenant infrastructure

AmbitenModel
→ performs data operations
```

This distinction is important.

The adapter should be understood as an **execution boundary initializer**, not as the component that bootstraps the Ambiten runtime itself.

## Adapter Responsibility

Adapters are intentionally narrow.

They do not perform business logic or persistence operations.

Their responsibility is to establish the correct Ambiten execution scope before downstream application code executes.

Depending on configuration, an adapter may:

- normalize an incoming request, operation, or invocation,
- resolve tenant identity,
- validate resolved tenancy,
- resolve request-scoped metadata,
- establish `AmbitenContext`,
- enter transaction-aware execution,
- preserve context through asynchronous execution,
- and then return control to the host framework lifecycle.

Conceptually:

```text
Incoming Execution
        ↓
Normalize
        ↓
Resolve Context
        ↓
Validate Tenant
        ↓
AmbitenContext
        ↓
Optional Transaction Boundary
        ↓
Application Execution
```

Once the boundary exists, models, middleware, instrumentation, transactions, and tenant-aware database routing can operate against the same execution state.

## The Shared Execution Model

Regardless of framework, execution follows the same conceptual path:

```text
Framework / Invocation
        ↓
Adapter
        ↓
Adapter Runtime
        ↓
AmbitenContext
        ↓
Application Logic
        ↓
AmbitenModel
        ↓
MultiTenantManager
        ↓
MongoDB
```

<SignalFlow
  aria-label="Shared adapter runtime flow"
  :items='[
    "Framework",
    "Adapter",
    "Adapter Runtime",
    "AmbitenContext",
    "Core",
    "MongoDB"
  ]'
/>

Each layer has a distinct responsibility.

```text
Framework
→ transport and lifecycle

Adapter
→ execution boundary

Adapter Runtime
→ shared request/invocation orchestration

AmbitenContext
→ execution-scoped state

MultiTenantManager
→ tenant infrastructure

AmbitenModel
→ data operations

MongoDB
→ persistence
```

This separation is what allows application logic to remain portable across supported environments.

## Supported Adapters

Ambiten currently supports:

| Runtime | Integration Style |
| --- | --- |
| Express | Middleware |
| Fastify | Lifecycle hooks |
| NestJS | Module + global interceptor |
| GraphQL | Context factory |
| AWS Lambda | Wrapped handler |

The integration mechanism changes because each host environment has a different execution lifecycle.

The runtime contract does not.

## Framework-Specific Entry Boundaries

### Express

Express enters Ambiten through middleware.

```text
Express Request
      ↓
Middleware
      ↓
Ambiten Adapter
      ↓
AmbitenContext
```

### Fastify

Fastify enters through its request lifecycle.

```text
Fastify Request
      ↓
Lifecycle Hook
      ↓
Ambiten Adapter
      ↓
AmbitenContext
```

### NestJS

NestJS enters through a framework-level interceptor.

```text
NestJS Request
      ↓
Global Interceptor
      ↓
Ambiten Adapter
      ↓
AmbitenContext
```

The interceptor keeps the actual downstream Observable execution inside the active Ambiten context boundary.

### GraphQL

GraphQL enters through context creation.

```text
GraphQL Operation
      ↓
Context Factory
      ↓
Ambiten Adapter
      ↓
AmbitenContext
```

### AWS Lambda

Lambda enters through the wrapped handler.

```text
Lambda Invocation
      ↓
Adapter Wrapper
      ↓
Ambiten Adapter
      ↓
AmbitenContext
```

The hosting mechanism changes.

The runtime behavior downstream remains consistent.

## The Shared Adapter Runtime

Framework-specific adapters delegate common execution behavior to `@ambiten/adapter-runtime`.

Conceptually:

```text
Express Adapter ───┐
Fastify Adapter ───┤
NestJS Adapter ────┤
GraphQL Adapter ───┤
Lambda Adapter ────┘
                   ↓
          @ambiten/adapter-runtime
                   ↓
             AmbitenContext
```

This shared layer centralizes behavior such as:

- tenant resolution,
- tenant validation,
- request ID resolution,
- database and collection context,
- debug metadata,
- logger metadata,
- custom execution metadata,
- transaction-aware execution,
- async context propagation.

Framework packages therefore remain focused on adapting framework lifecycle semantics rather than independently reimplementing Ambiten runtime behavior.

## Tenant Resolution

Adapters operate at the request or invocation boundary, which makes them the natural place to determine tenant identity.

For example:

```http
x-tenant-id: tenant5
```

may become:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

The conceptual flow is:

```text
Incoming Request
      ↓
TenantResolver
      ↓
tenant5
      ↓
AmbitenContext
```

Once resolved, downstream application code should normally use:

```ts
AmbitenContext.get().tenantId
```

rather than repeatedly inspecting the original transport-specific value.

## Request Identity Is Not Tenant Infrastructure

Adapters identify the tenant associated with an execution.

They do not own tenant infrastructure.

```text
TenantResolver
→ Who is this execution for?

AmbitenContext
→ Which tenant belongs to this execution?

MultiTenantManager
→ What resources belong to that tenant?

TenantConfigResolver
→ Where can an unknown tenant be found?
```

For example, an adapter may resolve:

```text
tenant5
```

without knowing:

```text
MongoDB URI
database name
connection state
deployment region
tenant metadata
```

Those concerns remain under `MultiTenantManager`.

This separation prevents transport-specific code from becoming coupled to database infrastructure.

## Tenant Validation

Adapters can validate resolved tenant identity before application execution begins.

Conceptually:

```text
Request
   ↓
Resolve tenant
   ↓
tenant5
   ↓
Validate
   ↓
Valid?
 ┌──┴──┐
yes    no
 ↓      ↓
Context reject
```

Validation may be asynchronous.

For example:

```ts
{
  tenancy: {
    header: "x-tenant-id",

    validate: async (tenantId) => {
      const tenant =
        await MultiTenantManager
          .resolveTenant(tenantId);

      if (!tenant) {
        throw new Error(
          `Tenant with ID "${tenantId}" not found.`
        );
      }

      return true;
    }
  }
}
```

This allows validation to work with both statically registered and dynamically discovered tenants.

## Dynamic Tenants

Adapters do not need to know whether a tenant existed when the application started.

Suppose an adapter resolves:

```text
tenant5
```

but `tenant5` is not yet registered.

A model operation can trigger:

```text
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
tenant5 registered?
      ↓ no
TenantConfigResolver
      ↓
external lookup
      ↓
register tenant5
      ↓
getClient()
      ↓
tenant database
```

From the adapter's perspective:

```text
static tenant
```

and:

```text
dynamic tenant
```

are the same identity problem.

Tenant discovery belongs to the runtime infrastructure layer.

## Custom Tenant Resolution

Adapters are not restricted to a fixed tenant header.

Custom resolvers can derive tenant identity from framework or application-specific information.

Conceptually:

```ts
{
  resolvers: {
    tenantId: async (req) => {
      return resolveTenantForRequest(
        req
      );
    }
  }
}
```

Tenant identity may originate from:

- headers,
- authenticated identity,
- token claims,
- cookies,
- subdomains,
- route information,
- gateway metadata,
- invocation metadata,
- application-defined request state.

The downstream runtime only needs the resolved identity:

```text
External Input
      ↓
TenantResolver
      ↓
tenantId
      ↓
AmbitenContext
```

## Request Metadata

The shared adapter runtime can carry more than tenant identity.

Execution context may include:

```text
tenantId
requestId
dbName
collectionName
debug state
logger metadata
custom metadata
transaction session
```

For example:

```ts
AmbitenContext.get();
```

may expose:

```ts
{
  tenantId: "tenant5",
  requestId: "req_123",
  dbName: undefined,
  collectionName: undefined
}
```

These values describe the current execution.

They should not be confused with long-lived tenant configuration or process infrastructure.

## Execution Scope

Every adapter establishes a scope appropriate to its host environment.

```text
Express
→ request scope

Fastify
→ request scope

NestJS
→ request scope

GraphQL
→ operation scope

Lambda
→ invocation scope
```

Each execution receives its own `AmbitenContext`.

```text
Execution A
→ Context A

Execution B
→ Context B

Execution C
→ Context C
```

Long-lived infrastructure may be shared.

Execution state must remain isolated.

## Async Context Propagation

Adapters preserve Ambiten's execution context across asynchronous work associated with the active scope.

For example:

```ts
const before =
  AmbitenContext
    .get()
    .tenantId;

await someAsyncOperation();

const after =
  AmbitenContext
    .get()
    .tenantId;
```

For the same execution:

```ts
before === after;
```

This allows tenant identity and other runtime metadata to remain available through:

```text
controller
   ↓
service
   ↓
await
   ↓
repository
   ↓
model
```

without manually passing execution state through every function.

## Transaction-Aware Execution

Adapters can optionally establish transaction-aware execution boundaries.

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
Application Logic
```

For adapters supporting:

```ts
enableTransactions: true
```

the entire execution can run inside Ambiten's transaction-aware boundary.

Applications may also use explicit:

```ts
AmbitenContext.withTransaction(...)
```

when only a particular operation needs atomic consistency.

The distinction is:

```text
Adapter transaction option
→ execution-wide transaction

withTransaction(...)
→ explicit operation transaction
```

Transaction policy should reflect consistency requirements rather than being enabled indiscriminately.

## Runtime Portability

One of the main goals of the adapter system is portability.

The same model operation:

```ts
await UserModel.find({});
```

should participate in the same Ambiten runtime model whether it executes inside:

```text
Express middleware
Fastify lifecycle
NestJS controller/service execution
GraphQL resolver execution
Lambda handler execution
```

The framework determines how execution reaches Ambiten.

It does not change how Ambiten models behave once execution is inside the runtime.

## Application Services Remain Framework-Independent

Adapter-managed context means domain services do not need framework request objects merely to determine execution identity.

Without this boundary, applications may evolve toward:

```text
Framework Request
      ↓
Controller
      ↓ passes request
Service
      ↓ passes request
Repository
```

With Ambiten:

```text
Framework
      ↓
Adapter
      ↓
AmbitenContext
      ↓
Controller / Resolver / Handler
      ↓
Service
      ↓
Repository
```

A service can access:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();
```

without depending directly on Express, Fastify, NestJS, GraphQL, or AWS Lambda APIs.

## Adapters and AmbitenBootstrapFactory

Adapters and bootstrap solve different lifecycle problems.

```text
BOOTSTRAP
─────────
AmbitenBootstrapFactory
        ↓
runtime infrastructure ready


EXECUTION
─────────
Framework / Invocation
        ↓
Adapter
        ↓
AmbitenContext
```

The factory runs during application startup.

Adapters operate when requests, operations, or invocations arrive.

This separation keeps startup orchestration out of application request paths.

## Adapters and MultiTenantManager

Adapters carry tenant identity.

`MultiTenantManager` owns tenant infrastructure.

```text
Adapter
→ tenantId

MultiTenantManager
→ tenant configuration
→ dynamic resolution
→ client lifecycle
→ runtime tenant state
```

This allows the same adapter configuration to work whether tenants are:

- registered during startup,
- registered programmatically,
- dynamically discovered,
- lazily connected.

The adapter does not need to know which strategy is being used.

## Authentication and Authorization

Tenant resolution is not authentication or authorization.

A request containing:

```http
x-tenant-id: tenant5
```

may correctly identify a tenant without proving the caller has permission to access it.

A secure application may use:

```text
Request
   ↓
Authentication
   ↓
Authenticated Identity
   ↓
Tenant Resolution
   ↓
Authorization
   ↓
AmbitenContext
   ↓
Application
```

The exact ordering may depend on the host framework and resolver design.

Ambiten provides runtime identity and propagation.

Application security policy remains an application responsibility.

## Infrastructure Reuse vs Execution Isolation

Adapters establish short-lived execution context around application work.

Runtime infrastructure may be much longer lived.

```text
LONG-LIVED
──────────
AmbitenRuntime
MultiTenantManager
MongoDB clients
Redis clients
logging infrastructure


EXECUTION-SCOPED
────────────────
AmbitenContext
tenantId
requestId
transaction session
operation metadata
```

This distinction is especially visible in AWS Lambda, where warm execution environments may reuse runtime infrastructure while every invocation still receives a fresh execution context.

The same principle applies conceptually to long-running HTTP servers.

## Package Boundaries

Context-aware execution depends on a compatible package graph.

For ESM applications:

```text
ESM Application
      ↓
ESM Framework Adapter
      ↓
ESM adapter-runtime
      ↓
ESM Core
```

For CommonJS applications:

```text
CommonJS Application
      ↓
CommonJS Framework Adapter
      ↓
CommonJS adapter-runtime
      ↓
CommonJS Core
```

Applications should import Ambiten packages through public package entry points rather than internal build paths.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

and the public entry point for the selected adapter.

Avoid:

```text
@ambiten/core/dist/...
@ambiten/adapter-runtime/dist/...
```

Public package exports select the appropriate module format.

## Why Package-Boundary Testing Matters

Adapters operate across npm package boundaries, not only source-code boundaries.

Production-like integration testing should therefore verify built packages from an external consumer environment.

Conceptually:

```text
pack Core
   ↓
pack adapter-runtime
   ↓
pack framework adapter
   ↓
install into isolated consumer
   ↓
run real execution
```

Ambiten's adapter/runtime boundary should preserve context through both:

```text
ESM consumer
```

and:

```text
CommonJS consumer
```

This protects runtime behavior that cannot be fully validated through monorepo unit tests alone.

## Choosing an Adapter

Adapter choice should follow the host execution environment.

### Express

Use Express when the application already uses middleware-oriented HTTP architecture.

### Fastify

Use Fastify for hook-driven services and applications built around Fastify's lifecycle and plugin system.

### NestJS

Use NestJS when the application relies on modules, dependency injection, controllers, providers, and framework-managed execution pipelines.

### GraphQL

Use GraphQL integration when execution is resolver-driven and context creation is the natural operation boundary.

### AWS Lambda

Use Lambda integration for serverless invocation-driven workloads.

The adapter changes **how execution enters Ambiten**.

It does not change the Ambiten runtime model after execution begins.

## Architectural Boundary

Adapters define the separation between transport and runtime execution.

```text
Framework / Platform
→ transport and lifecycle

Adapter
→ runtime ingress

Adapter Runtime
→ shared execution setup

AmbitenContext
→ execution state

MultiTenantManager
→ tenant infrastructure

AmbitenModel
→ data operations

MongoDB
→ persistence
```

Without this separation, transport-specific concerns tend to spread into services, models, and infrastructure code.

Adapters preserve that boundary.

## Recommended Mental Model

A useful way to understand the complete adapter system is:

```text
                    STARTUP
                       │
           AmbitenBootstrapFactory
                       │
                Runtime Ready
                       │
                       ▼
                   EXECUTION
                       │
      Express / Fastify / NestJS
       GraphQL / AWS Lambda
                       │
                       ▼
                    Adapter
                       │
                       ▼
                Adapter Runtime
                       │
                       ▼
              Tenant Resolution
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
              MultiTenantManager
                       │
                       ▼
               Tenant Database
```

The framework determines the entry mechanism.

Ambiten determines the execution model.

## Summary

Adapters are the ingress boundary into Ambiten's execution runtime.

They normalize framework-specific requests, operations, and invocations into one shared context-aware model.

Adapters:

- establish execution scope,
- resolve tenant identity,
- validate tenancy when configured,
- propagate request metadata,
- preserve context through asynchronous execution,
- optionally establish transaction-aware boundaries,
- keep framework-specific concerns outside Core,
- allow dynamic tenant infrastructure to be resolved downstream.

The shared architecture is:

```text
Framework / Invocation
        ↓
Adapter
        ↓
Adapter Runtime
        ↓
AmbitenContext
        ↓
Application
        ↓
AmbitenModel
        ↓
MultiTenantManager
        ↓
Tenant Database
```

This is what allows Ambiten applications to remain portable, predictable, tenant-aware, and operationally consistent across multiple execution environments.

## Related Pages

- [Express](/adapters/express)
- [Fastify](/adapters/fastify)
- [NestJS](/adapters/nestjs)
- [GraphQL](/adapters/graphql)
- [Lambda](/adapters/lambda)
- [Adapters Overview](/adapters/overview)
- [Usage Patterns](/adapters/usage-patterns)
- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/multi-tenancy/framework-adapters)