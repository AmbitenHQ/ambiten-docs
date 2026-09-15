---
title: Advanced Usage
description: Design advanced Ambiten systems around execution context, transactions, multi-tenancy, workers, observability, scaling, and distributed runtime boundaries.
---

# Advanced Usage

Advanced usage in Ambiten begins when the runtime becomes part of the broader application architecture rather than remaining a simple database dependency.

At this stage, the system is no longer concerned only with CRUD operations or isolated request handling.

The focus shifts toward:

- transaction orchestration,
- tenant isolation,
- dynamic tenant discovery,
- background execution,
- context propagation,
- infrastructure lifecycle,
- observability,
- framework boundaries,
- package/runtime consistency,
- and operational behavior under concurrency.

These concerns are especially important for:

- multi-tenant SaaS platforms,
- high-throughput APIs,
- queue-driven systems,
- background workers,
- distributed services,
- long-running applications,
- and operationally sensitive production environments.

<AdvancedUsageOverview />

## What "Advanced" Means in Ambiten

Advanced Ambiten usage is not about using obscure APIs.

It is about understanding how the runtime behaves when execution becomes more concurrent, distributed, and operationally sensitive.

At that point, architectural decisions around:

```text
context propagation
transaction boundaries
tenant resolution
tenant infrastructure
connection lifecycle
framework integration
background execution
observability
package boundaries
```

become more important than individual method calls.

The runtime itself becomes part of the system architecture.

A useful high-level model is:

```text
Execution Entry Point
        ↓
Framework Adapter / Explicit Context
        ↓
AmbitenContext
        ↓
Application Logic
        ↓
AmbitenModel
        ↓
MultiTenantManager / Providers
        ↓
MongoDB
```

Each layer has a different responsibility.

## Runtime Boundaries

Ambiten distinguishes between long-lived runtime infrastructure and short-lived execution state.

```text
PROCESS LIFETIME
────────────────────────────
AmbitenBootstrapFactory
AmbitenRuntime
MultiTenantManager
MongoDB clients
Redis
Logging
Schedulers
GC


EXECUTION LIFETIME
────────────────────────────
AmbitenContext
tenantId
requestId
transaction session
logger metadata
operation metadata
```

This distinction becomes increasingly important as systems grow.

Process-level resources should generally remain long-lived.

Execution state should remain scoped to the request, job, worker task, or invocation that owns it.

## Transaction Orchestration

Ambiten provides transaction propagation through:

```ts
AmbitenContext.withTransaction(...)
```

A standard transaction flow remains intentionally simple:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create({
      name: "Alice"
    });

    await OrderModel.create({
      user: "Alice"
    });
  }
);
```

The important behavior is not only the transaction itself.

It is the runtime boundary surrounding it.

```text
AmbitenContext
      ↓
transaction session
      ↓
service
      ↓
model
      ↓
another service
      ↓
another model
```

Operations executed within the transaction boundary can reuse the same transaction session rather than independently constructing competing transaction scopes.

This makes deeper service chains easier to reason about.

## Nested Transactional Execution

In complex applications, one service may call another service that also performs transactional work.

Conceptually:

```text
Request
   ↓
withTransaction()
   ↓
Service A
   ↓
Service B
   ↓
Model A
   ↓
Model B
```

The intended model is one coherent transaction boundary for the active execution rather than independent transactions appearing unpredictably at different service layers.

Application code should therefore treat transaction scope as part of the runtime execution model.

## Manual Transaction Control

Some infrastructure-level workflows may require explicit transaction orchestration.

For example:

```ts
await runManualTransaction(
  async (session) => {
    await UserModel.create(
      {
        name: "Alice"
      },
      {
        session
      }
    );
  }
);
```

This style can be appropriate for:

- workflow engines,
- migration tooling,
- specialized infrastructure integrations,
- controlled commit sequencing,
- low-level orchestration.

For normal application request execution, runtime-managed transaction boundaries are usually simpler.

## Avoid Over-Transactional Design

Transactions should be intentional.

Do not automatically wrap every request in a transaction merely because the runtime supports it.

Transactions have operational cost.

Use them when multiple operations must succeed or fail as one logical unit.

```text
Need atomic consistency?
      ↓
yes → transaction

Independent operations?
      ↓
often no transaction required
```

The transaction boundary should reflect the application's consistency requirements.

## Multi-Tenancy as Runtime Architecture

Multi-tenancy is one of the most consequential architectural decisions in an Ambiten-based system.

It affects:

- isolation,
- scalability,
- connection management,
- observability,
- recovery,
- infrastructure cost,
- operational governance.

Ambiten separates tenant identity from tenant infrastructure.

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

This separation is important in advanced systems because these responsibilities often originate from different infrastructure layers.

## Request Identity vs Tenant Infrastructure

Consider a request carrying:

```http
x-tenant-id: tenant5
```

The framework adapter may resolve:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

The request only needs to know:

```text
tenant5
```

It does not need to carry:

```text
MongoDB URI
database name
connection client
lazy state
deployment metadata
```

Those belong to `MultiTenantManager`.

Conceptually:

```text
REQUEST
   ↓
tenantId = tenant5


PROCESS RUNTIME
   ↓
tenant5
├── uri
├── dbName
├── client
├── lazy
└── metadata
```

Keeping these layers separate reduces infrastructure leakage into application code.

## Tenant Isolation Strategies

Different applications require different isolation models.

### Database-per-Tenant

A database-per-tenant strategy may look like:

```text
tenantA → dbA
tenantB → dbB
tenantC → dbC
```

This provides strong operational separation and can simplify:

- backup boundaries,
- restoration,
- tenant-specific maintenance,
- auditing,
- infrastructure migration,
- regulatory separation.

It also introduces connection and resource-management considerations as the tenant population grows.

### Collection-Based Segmentation

Some systems use tenant-specific collections:

```text
users_tenantA
users_tenantB
```

This reduces some infrastructure overhead but requires stricter discipline around:

- collection naming,
- indexing,
- isolation enforcement,
- migration strategy,
- operational tooling.

### Shared Collections

Other systems may use shared collections with explicit tenant fields.

For example:

```ts
{
  tenantId: "tenantA",
  ...
}
```

This can reduce infrastructure overhead further but places more isolation responsibility on application and query discipline.

### Hybrid Isolation

Larger platforms may use different strategies for different tenant groups.

For example:

```text
standard tenants
→ shared infrastructure

enterprise tenants
→ isolated database

regulated tenants
→ dedicated infrastructure
```

The important principle is intentionality.

Tenant isolation should be treated as architecture rather than a late implementation detail.

## Dynamic Tenants

Advanced multi-tenant systems often cannot preload every tenant during startup.

Ambiten supports dynamic tenant discovery through `TenantConfigResolver`.

For example:

```ts
MultiTenantManager.setTenantConfigResolver({
  async resolve(tenantId) {
    const config =
      await lookupTenant(tenantId);

    if (!config) {
      return undefined;
    }

    return {
      tenantId,
      uri: config.uri,
      dbName: config.dbName,
      lazy: true,
      metadata: config.metadata
    };
  }
});
```

The runtime flow becomes:

```text
Request
   ↓
tenant5
   ↓
tenant5 registered?
   │
   ├── yes
   │    ↓
   │ use existing configuration
   │
   └── no
        ↓
   TenantConfigResolver
        ↓
   external lookup
        ↓
   register tenant5
```

This allows tenant infrastructure to live outside the application process.

For example:

```text
control database
tenant registry
configuration service
account service
infrastructure API
```

## Dynamic Discovery and Lazy Connections

Tenant discovery does not need to imply immediate database connection.

A dynamically discovered tenant can move through:

```text
unknown
   ↓
resolved
   ↓
registered
   ↓
lazy
   ↓
first database operation
   ↓
connected
```

For example, a runtime may begin with:

```ts
{
  registeredTenants: 3,
  connectedTenants: 0,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

After a request uses a dynamically discovered tenant:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

Only the tenant actually requiring database access becomes connected.

This becomes increasingly valuable as tenant populations grow.

## Tenant Resolution in Application Code

Normal application code should usually not manually coordinate tenant discovery and client creation.

Avoid patterns such as:

```ts
const tenant =
  await MultiTenantManager
    .resolveTenant(tenantId);

const client =
  await MultiTenantManager
    .getClient(tenantId);

await UserModel.create(...);
```

inside every route.

When the execution already has:

```ts
AmbitenContext.get().tenantId
```

the runtime can resolve the required tenant infrastructure when the model operation requires it.

Prefer:

```ts
await UserModel.create({
  username: "Alice"
});
```

inside the established execution context.

Direct manager access remains useful for:

- administration,
- diagnostics,
- preloading,
- infrastructure services,
- runtime inspection,
- specialized operational flows.

## Explicit Context Management

Inside adapter-managed HTTP requests, Ambiten establishes the execution boundary automatically.

Outside those flows, context becomes an explicit responsibility.

For example:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "manual-ctx"
  },

  async () => {
    await UserModel.find({});
  }
);
```

This pattern is appropriate for execution that does not originate from a framework adapter.

Examples include:

- queue workers,
- scheduled jobs,
- CLI commands,
- migrations,
- maintenance tooling,
- background processors,
- custom invocation systems.

The principle is:

```text
Adapter-managed execution
→ context established by adapter

Non-adapter execution
→ establish context explicitly
```

## Background Workers

Background workers are one of the most common places where context assumptions become unsafe.

A worker should establish the execution scope associated with the job it is processing.

For example:

```ts
async function processJob(job) {
  await AmbitenContext.run(
    {
      tenantId: job.tenantId,
      requestId: `job-${job.id}`
    },

    async () => {
      await UserModel.updateMany(
        {},
        {
          $set: {
            processed: true
          }
        }
      );
    }
  );
}
```

The worker now has an explicit runtime boundary:

```text
Job
 ↓
tenantId
 ↓
AmbitenContext
 ↓
Worker Logic
 ↓
Model
 ↓
Tenant Database
```

This preserves tenant-aware execution outside HTTP request lifecycles.

## Detached Execution

Detached asynchronous work should be treated carefully.

For example:

```ts
setTimeout(
  async () => {
    await UserModel.find({});
  },
  10_000
);
```

should not automatically be assumed to represent the same logical execution as the request that scheduled it.

For long-lived or detached work, preserve the information required to create a new execution boundary later.

For example:

```ts
const job = {
  tenantId:
    AmbitenContext.get().tenantId,

  requestId:
    AmbitenContext.get().requestId
};
```

Then the future worker can establish:

```ts
await AmbitenContext.run(
  {
    tenantId: job.tenantId,
    requestId: job.requestId
  },

  async () => {
    // detached work
  }
);
```

The larger principle is:

```text
capture identity
      ↓
cross boundary
      ↓
create new runtime context
```

rather than assuming one execution context remains valid indefinitely.

## Scheduled Tasks

Scheduled tasks usually begin outside an HTTP request.

They should therefore establish their own execution state when tenant-aware behavior is required.

For example:

```ts
async function runTenantCleanup(
  tenantId: string
) {
  await AmbitenContext.run(
    {
      tenantId,
      requestId:
        `cleanup-${Date.now()}`
    },

    async () => {
      await CleanupModel.run();
    }
  );
}
```

For multi-tenant scheduled work:

```text
scheduler
   ↓
tenant1 context
   ↓
execute
   ↓
tenant2 context
   ↓
execute
   ↓
tenant3 context
```

Each tenant execution remains independently scoped.

## Queue Consumers

Queue systems naturally cross process boundaries.

Do not depend on in-memory AsyncLocalStorage state surviving queue publication.

Instead propagate the identity required by the consumer.

Producer:

```ts
const context =
  AmbitenContext.get();

await queue.publish({
  type: "user.process",

  tenantId:
    context.tenantId,

  requestId:
    context.requestId,

  payload
});
```

Consumer:

```ts
await AmbitenContext.run(
  {
    tenantId: message.tenantId,
    requestId: message.requestId
  },

  async () => {
    await processMessage(
      message.payload
    );
  }
);
```

The queue message becomes the explicit distributed context carrier.

## Cross-Service Execution Boundaries

AsyncLocalStorage does not cross process or network boundaries.

Distributed systems must propagate required execution identity explicitly.

For example:

```ts
const context =
  AmbitenContext.get();

await fetch(
  "https://users.internal/api/users",
  {
    headers: {
      "x-tenant-id":
        context.tenantId ?? "",

      "x-request-id":
        context.requestId ?? ""
    }
  }
);
```

The receiving service can then establish its own Ambiten context through its framework adapter.

```text
Service A
AmbitenContext
      ↓
HTTP headers
      ↓
Service B adapter
      ↓
Service B AmbitenContext
```

Each process owns its own execution context.

The distributed system propagates the identity needed to reconstruct that context.

## Do Not Propagate Infrastructure Secrets

Cross-service propagation should normally carry identity and correlation information.

For example:

```text
tenantId
requestId
trace identifier
authenticated identity reference
```

Avoid propagating:

```text
MongoDB URI
database credentials
MongoClient instances
tenant secrets
internal connection state
```

Tenant infrastructure should remain under the authority of the receiving service's own runtime.

## Framework Adapter Boundaries

Framework adapters are the preferred execution boundary for supported HTTP frameworks.

Conceptually:

```text
Express
Fastify
NestJS
   ↓
Ambiten Adapter
   ↓
adapter-runtime
   ↓
AmbitenContext
```

Application code should not manually recreate the same request context after the adapter has already established it.

Avoid:

```ts
app.post(
  "/users",
  async (req, res) => {
    await AmbitenContext.run(
      {
        tenantId:
          req.headers["x-tenant-id"]
      },

      async () => {
        // ...
      }
    );
  }
);
```

when the adapter is already responsible for that request boundary.

Prefer one authoritative entry point.

```text
Framework Request
      ↓
Adapter
      ↓
AmbitenContext
      ↓
Application
```

## Adapter Context and Domain Services

One benefit of adapter-managed context is that downstream services do not need framework request objects merely to access runtime identity.

Avoid:

```text
Express Request
      ↓
Service
      ↓
Repository
      ↓
Model
```

when the only reason to pass the request is tenant identity.

Prefer:

```text
Adapter
   ↓
AmbitenContext
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
Model
```

Then domain code can read:

```ts
const { tenantId } =
  AmbitenContext.get();
```

without depending on Express, Fastify, or NestJS.

## Package Boundaries Matter

Context-aware runtimes are sensitive to module identity.

A framework adapter, adapter runtime, and Core must participate in the same compatible module graph for the active application format.

For an ESM application:

```text
ESM application
    ↓
ESM adapter
    ↓
ESM adapter-runtime
    ↓
ESM Core
```

For a CommonJS application:

```text
CommonJS application
    ↓
CommonJS adapter
    ↓
CommonJS adapter-runtime
    ↓
CommonJS Core
```

This matters because request-scoped runtime state is owned by Core.

Applications should use public package entry points:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

and:

```ts
import {
  createExpressAdapter
} from "@ambiten/adapter-express";
```

Avoid internal package paths such as:

```text
@ambiten/core/dist/...
@ambiten/adapter-runtime/dist/...
```

Public package exports allow the package manager and Node runtime to select the correct ESM or CommonJS entry.

## Why Package-Level Integration Testing Matters

Unit tests executed entirely inside a monorepo cannot verify every behavior that an external consumer encounters.

Advanced Ambiten releases should also validate built artifacts through external package boundaries.

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
run actual request
```

Both consumer formats should be tested:

```text
ESM fixture
→ adapter
→ runtime
→ Core
→ context preserved
```

and:

```text
CommonJS fixture
→ adapter
→ runtime
→ Core
→ context preserved
```

This type of test protects runtime behavior that depends on package exports and module resolution rather than only source code.

## Performance and Scaling Discipline

Runtime coherence does not remove the need for good MongoDB operational practices.

Connection reuse remains important.

Long-lived runtime resources should generally remain long-lived rather than being recreated per request.

Avoid:

```text
request
 ↓
new MongoClient
 ↓
operation
 ↓
disconnect
```

for ordinary application traffic.

Prefer managed runtime clients:

```text
application process
      ↓
managed MongoClient
      ↓
many operations
```

The same principle applies to tenant connections.

## Query Discipline

Query efficiency remains an application responsibility.

For example:

```ts
await UserModel.find(
  {},
  {
    projection: {
      name: 1
    }
  }
);
```

Advanced systems should consider:

- projections,
- indexes,
- pagination,
- aggregation complexity,
- document shape,
- tenant workload distribution,
- query frequency,
- connection pressure.

Ambiten provides runtime consistency.

It does not eliminate database performance fundamentals.

## Tenant-Aware Capacity Planning

Multi-tenant systems should avoid assuming all tenants behave similarly.

A single tenant may generate significantly more workload than others.

Useful operational dimensions include:

```text
queries per tenant
latency per tenant
connected clients
tenant connection churn
error rate
storage growth
aggregation cost
```

Tenant metadata can also support operational classification:

```ts
{
  region: "de-west-1",
  tier: "enterprise"
}
```

This information can help observability systems reason about infrastructure behavior without placing infrastructure logic into application controllers.

## Observability and Diagnostics

Production systems must remain inspectable under operational pressure.

Instrumentation becomes more useful when correlated with runtime context.

For example:

```ts
await measureQuery(
  "UserModel.find",

  async () => {
    return UserModel.find({});
  }
);
```

Runtime-aware logging can also include:

```ts
const ctx =
  AmbitenContext.get();

console.log({
  tenantId:
    ctx.tenantId,

  requestId:
    ctx.requestId
});
```

This makes logs easier to correlate across service and tenant boundaries.

## Runtime Statistics

`MultiTenantManager` also exposes useful runtime information.

For example:

```ts
const stats =
  MultiTenantManager.getStats();
```

may return:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

These values can contribute to:

- health endpoints,
- dashboards,
- diagnostics,
- operational telemetry,
- connection planning.

They should be interpreted as runtime infrastructure state rather than request state.

## Context-Aware Logging

Logs become substantially more useful when they can answer:

```text
Which request?
Which tenant?
Which operation?
Which service?
```

For example:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();

logger.info(
  "User created",
  {
    tenantId,
    requestId
  }
);
```

This becomes especially important when many tenants share the same process.

## Avoid Logging Sensitive Data

Operational visibility should not expose secrets.

Avoid logging:

```text
passwords
MongoDB URIs with credentials
tokens
cookies
authorization headers
tenant secrets
```

Prefer stable identifiers and sanitized metadata.

For example:

```ts
logger.info(
  "Tenant operation completed",
  {
    tenantId,
    requestId,
    operation:
      "UserModel.create"
  }
);
```

## Middleware as Operational Control

In advanced systems, middleware becomes more than convenience.

It can act as a centralized policy boundary around model operations.

Examples include:

- auditing,
- normalization,
- soft-delete behavior,
- execution validation,
- instrumentation,
- policy checks.

For example:

```ts
userSchema.pre(
  "find",
  async (ctx) => {
    if (!ctx.tenantId) {
      throw new Error(
        "Missing tenant context"
      );
    }
  }
);
```

Centralizing these concerns reduces duplication across controllers and services.

## Policy Belongs at the Correct Layer

Not every rule belongs in model middleware.

For example:

```text
HTTP authentication
→ framework/security layer

tenant request resolution
→ adapter layer

tenant infrastructure
→ MultiTenantManager

model operation policy
→ model/schema middleware

database lifecycle
→ runtime infrastructure
```

Advanced architecture depends on keeping policy close to the layer that owns the concern.

## Security and Tenant Isolation

Tenant resolution is not the same as authorization.

A request containing:

```http
x-tenant-id: tenant5
```

may correctly identify:

```text
tenant5
```

while still being unauthorized.

A secure application may require:

```text
Request
   ↓
Authentication
   ↓
Identity
   ↓
Tenant Resolution
   ↓
Authorization
   ↓
AmbitenContext
```

Do not treat a client-controlled tenant identifier as proof of access rights.

Ambiten handles execution and tenant routing.

Application security policy remains an application responsibility.

## Failure Semantics

Advanced systems should distinguish between different classes of tenant failure.

For example:

```text
tenant not found
```

is different from:

```text
tenant registry unavailable
```

which is different from:

```text
MongoDB connection failed
```

These should not automatically collapse into the same error.

A dynamic resolver can express:

```ts
return undefined;
```

for:

```text
tenant not found
```

and throw for:

```text
tenant resolution infrastructure failed
```

Clear failure semantics improve diagnostics and operational response.

## Graceful Shutdown

Long-lived applications should shut down Ambiten at the process lifecycle boundary.

For example:

```ts
process.on(
  "SIGTERM",
  async () => {
    await runtime.shutdown();
    process.exit(0);
  }
);
```

Shutdown may coordinate managed infrastructure such as:

```text
MongoDB
tenant clients
Redis
logging transports
schedulers
garbage collection
runtime services
```

Do not shut down the runtime at the end of an individual request.

## Production Readiness

Production readiness in Ambiten is primarily about execution discipline.

A production-oriented system should verify that:

- runtime infrastructure initializes before traffic is accepted,
- framework adapters establish execution boundaries correctly,
- tenant identity remains available through async execution,
- dynamic tenants resolve correctly,
- unresolved tenants do not silently fall back to unrelated databases,
- transaction boundaries are intentional,
- workers establish explicit execution context,
- distributed boundaries propagate required identity,
- tenant authorization is handled separately from tenant resolution,
- managed clients are reused,
- runtime shutdown is graceful,
- ESM/CommonJS package boundaries resolve correctly,
- packed package integration is tested,
- logs and metrics include useful execution correlation,
- secrets are not exposed through diagnostics.

The runtime model is strongest when operational discipline matches architectural intent.

## Advanced Runtime Mental Model

A useful mental model is:

```text
Context defines execution.

Adapters establish execution boundaries.

Transactions protect consistency.

TenantResolvers identify execution ownership.

MultiTenantManager resolves tenant resources.

Providers resolve infrastructure.

Middleware enforces operation policy.

Instrumentation exposes behavior.

Bootstrap owns process lifecycle.
```

These layers should work together without collapsing into one another.

## Full Advanced Execution Flow

A multi-tenant request may look like:

```text
HTTP Request
      ↓
Authentication
      ↓
Framework Adapter
      ↓
TenantResolver
      ↓
tenantId
      ↓
Validation
      ↓
AmbitenContext
      ↓
Application Service
      ↓
Transaction Boundary
      ↓
AmbitenModel
      ↓
MultiTenantManager
      ↓
TenantConfigResolver
      │
      └── only if tenant unknown
      ↓
Tenant MongoClient
      ↓
Tenant Database
      ↓
Instrumentation
      ↓
Response
```

A worker may instead look like:

```text
Queue Message
      ↓
tenantId + requestId
      ↓
AmbitenContext.run(...)
      ↓
Worker Logic
      ↓
AmbitenModel
      ↓
Tenant Resource
```

The entry point changes.

The runtime principles remain the same.

## Summary

Advanced Ambiten usage is ultimately about runtime architecture.

As systems scale across:

```text
tenants
requests
workers
services
transactions
frameworks
processes
packages
infrastructure
```

execution correctness increasingly depends on clear boundaries rather than isolated application code.

Ambiten's architecture separates:

```text
startup infrastructure
execution state
tenant identity
tenant resources
transactions
model operations
framework integration
observability
```

while allowing those concerns to participate in one coherent runtime.

The larger the system becomes, the more important those boundaries become.

## Related Pages

- [Context](/core/context)
- [Transactions](/core/transactions)
- [Instrumentation](/core/instrumentation)
- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [CLI Init](/advanced/cli-init)
- [Multi-Tenancy Overview](/architecture/multi-tenancy/overview)
- [Tenant Resolution](/architecture/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/architecture/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/architecture/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/architecture/multi-tenancy/framework-adapters)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Architecture](/architecture/whitepaper)
