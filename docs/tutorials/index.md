# Tutorials

Build one Workspace API from your first MongoDB connection to a production-oriented Ambiten runtime.

## Core Learning Path — 01–12

### Start Here

1. [First Ambiten Application](/tutorials/01-first-ambiten-app)
2. [Schema and Model](/tutorials/02-schema-and-model)
3. [CRUD With Ambiten](/tutorials/03-crud-with-ambiten)

### Build an Application

4. [Build an Express API](/tutorials/04-express-api)
5. [Execution Context](/tutorials/05-execution-context)
6. [Multi-Tenant API](/tutorials/06-multi-tenant-api)
7. [Tenant Infrastructure Resolution](/tutorials/07-tenant-infrastructure-resolution)
8. [Transaction Continuity](/tutorials/08-transaction-continuity)
9. [Middleware and Lifecycle](/tutorials/09-middleware-and-lifecycle)

### Operate the Runtime

10. [Instrumentation](/tutorials/10-instrumentation)
11. [Background Worker Execution](/tutorials/11-background-worker)
12. [Production Runtime](/tutorials/12-production-runtime)

The 12-part core path is complete. Tutorial 12 consolidates process, execution, and operation lifetimes; the [framework tracks](/tutorials/frameworks/) are separate follow-up work. Deployment hardening and tenant authorization remain application and infrastructure responsibilities.

## Bonus — Agentic Development

[Build an Agent-Ready MCP Server with Ambiten](/tutorials/bonus-mcp-server) exposes the existing application through two tenant-scoped MCP tools. REST requests, background jobs, and agent tool calls reuse the same model policies, instrumentation, and tenant infrastructure.

This is a separate bonus after Tutorial 12, not Tutorial 13.

## Framework Tracks

[Fastify, NestJS, GraphQL, and Lambda](/tutorials/frameworks/) demonstrate different ingress points using the same Ambiten runtime. They complement the primary Express series instead of repeating it.

### Separate complete application tutorial

The existing [Document-to-PDF SaaS tutorial](/tutorials/pdf-saas) remains a separate, standalone tutorial.

Learn Ambiten by building complete systems instead of isolated examples.

Tutorials show how Ambiten behaves across real application workflows: execution boundaries, context propagation, model operations, middleware, transactions, tenant-aware infrastructure, instrumentation, and persistence working together inside one system.

<OneRequestFlowVisual />

## Why tutorials exist

Ambiten is not only a collection of APIs.

It is a runtime system.

Understanding individual methods is useful, but production behavior emerges from how execution boundaries interact across adapters, `AmbitenContext`, application logic, models, middleware, transactions, providers, tenant infrastructure, and MongoDB.

That is why the tutorials focus on complete execution flows rather than disconnected snippets.

The goal is not only to show how to call Ambiten APIs.

The goal is to show how execution remains understandable as an application grows.

A typical runtime path looks like:

```text
Execution Ingress
      ↓
Execution Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

The tutorials make that architecture concrete.

## What you will learn

Each tutorial is built around a real architectural pattern rather than a synthetic API demonstration.

You will see how execution state is established at a boundary and carried through the runtime.

You will learn how:

- adapters establish framework execution boundaries
- `AmbitenContext` carries execution-scoped state
- application handlers remain focused on business behavior
- `AmbitenModel` binds runtime state into an Effective `ModelContext`
- schemas and middleware participate in model execution
- tenant identity remains separate from tenant infrastructure
- providers and `AmbitenClient` resolve database resources
- transaction sessions propagate through participating Ambiten operations
- instrumentation can observe runtime behavior without being scattered through business logic

The tutorials also show where Ambiten's guarantees stop.

External side effects, authorization policy, cross-process coordination, and infrastructure topology remain application or system responsibilities unless explicitly handled by the surrounding architecture.

## Learning structure

Every tutorial follows the same architectural progression.

```text
Product Definition

→ Data Modeling

→ Runtime Setup

→ Execution Boundaries

→ Feature Workflows

→ Runtime Behavior

→ Operational Insight
```

This structure keeps the focus on system behavior rather than only implementation syntax.

You are not only learning how to write a feature.

You are learning how that feature participates in an execution.

## From feature code to runtime behavior

A feature inside Ambiten does not execute in isolation.

For model-driven persistence, the runtime path is typically:

```text
Application Operation
      ↓
AmbitenModel
      ↓
mergeCtx()
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Collection Resolution
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

The Effective `ModelContext` can inherit execution values such as:

```text
tenantId
requestId
dbName
collectionName
session
```

while also carrying operation-specific controls such as:

```text
db
config
withDeleted
onlyDeleted
hardDelete
```

This distinction is important throughout the tutorials.

`AmbitenContext` represents the broader execution.

`ModelContext` represents the persistence-facing state of a model operation.

## Available tutorials

<TutorialGrid />

### Build a Document-to-PDF SaaS

This tutorial builds a complete multi-tenant Document-to-PDF SaaS application.

The system combines tenant-aware execution, transaction-aware workflows, runtime instrumentation, usage controls, and application-level policy decisions inside one architecture.

You will follow the execution path from request ingress through tenant resolution and context binding into model operations and tenant-specific MongoDB infrastructure.

The application includes practical concerns such as:

```text
tenant identification
usage limits
subscription tiers
document creation
PDF generation workflows
transaction participation
instrumentation
upgrade flows
runtime policy checks
```

Instead of treating Ambiten as an isolated database abstraction, the tutorial shows how the runtime coordinates execution state while leaving business behavior inside the application.

→ [Start tutorial](/tutorials/pdf-saas)

## Execution-scoped context

One of the most important ideas throughout the tutorials is that Ambiten context is execution-scoped.

An HTTP request is only one possible execution boundary.

Ambiten can also be used inside:

```text
background jobs
queue consumers
scheduled tasks
workers
CLI processes
custom application workflows
```

Framework adapters normally establish the boundary automatically.

Outside an adapter, an application can establish one explicitly with `AmbitenContext.run(...)`.

Conceptually:

```text
Execution Begins
      ↓
AmbitenContext.run(...)
      ↓
Execution State Becomes Available
      ↓
Application Work
      ↓
Model Operations
      ↓
Execution Completes
```

This is why the tutorials use the term **execution** rather than assuming every operation originates from an HTTP request.

## Tenant-aware execution

The tutorials also distinguish tenant identity from tenant infrastructure.

These are related, but they are not the same responsibility.

```text
Who is this execution for?
        ↓
TenantResolver

Carry tenant identity
        ↓
AmbitenContext

Where does this tenant run?
        ↓
TenantConfigResolver /
MultiTenantManager

Give me the MongoDB client
        ↓
TenantClientResolver /
MultiTenantManager
```

A typical tenant-aware flow therefore looks like:

```text
Request / Invocation
      ↓
Tenant Resolution
      ↓
AmbitenContext.tenantId
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
MultiTenantManager
      ↓
Tenant MongoClient
      ↓
Tenant Database
```

The tutorials show this separation explicitly so tenant routing does not become confused with authentication or authorization.

Tenant resolution answers:

```text
Which tenant is this execution for?
```

Authorization answers:

```text
May this caller act for that tenant?
```

Those are different concerns.

## Transaction behavior

Transactions are taught as execution boundaries rather than as individual model features.

The transaction path is:

```text
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Participating Ambiten Operations
```

The enclosing transaction boundary owns:

```text
start
commit
rollback
completion
```

Individual models participate in the transaction but do not independently commit or roll back the surrounding workflow.

The tutorials demonstrate both supported patterns.

### Explicit transaction boundary

```ts
await AmbitenContext.withTransaction(async () => {
  await DocumentModel.create({
    title: "Quarterly Report"
  });

  await UsageModel.create({
    operation: "pdf-generation"
  });
});
```

### Adapter-managed transaction boundary

Where supported by the framework adapter:

```ts
enableTransactions: true
```

These are alternative transaction strategies.

They are not two transaction layers that every application must combine.

The tutorials also make an important boundary explicit:

```text
Ambiten transaction propagation
≠
automatic participation by every external operation
```

Participating Ambiten operations can inherit the active MongoDB session.

External APIs, file storage, email delivery, queue publishing, and unrelated raw driver operations are not automatically made atomic by that MongoDB transaction.

## Middleware and schema behavior

Tutorials use middleware to demonstrate behavior that belongs close to the persistence boundary.

A typical model flow is:

```text
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Database Operation
```

Schemas remain reusable definitions.

They can describe:

```text
structure
validation
normalization
middleware
soft-delete behavior
persistence policy
lifecycle configuration
```

Execution-specific state does not need to be embedded permanently into the schema.

The model supplies the Effective `ModelContext` for the active operation.

This keeps the distinction clear:

```text
Static definition.
Dynamic execution.
```

## Instrumentation and operational insight

Tutorials also show how runtime metadata can support instrumentation.

`AmbitenContextState` can carry runtime information such as:

```text
requestId
tenantId
loggerMeta
debug
meta
observer
budget
```

This gives instrumentation a consistent execution context.

The runtime provides the metadata boundary.

How logs, traces, metrics, events, or telemetry are transported and stored remains the responsibility of the instrumentation backend being used.

The goal is not to place observability logic inside every business operation.

The goal is to make the execution information needed by instrumentation available at the runtime boundary.

## Direct usage is still first-class

Not every Ambiten application needs the complete runtime stack.

Some tutorials and examples may begin directly with `AmbitenClient`.

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

Additional runtime capabilities can then be introduced progressively:

```text
AmbitenClient
      ↓
AmbitenContext
      ↓
AmbitenSchema + AmbitenModel
      ↓
Framework Adapters
      ↓
Multi-Tenant Runtime
      ↓
Transactions and Advanced Infrastructure
```

This progression is intentional.

Ambiten does not require a small application, script, migration, educational example, or internal tool to adopt every runtime capability before it can perform useful work.

## What makes these tutorials different

Many tutorials focus primarily on calling APIs.

Ambiten tutorials focus on execution architecture.

The emphasis is on understanding:

```text
where execution begins
what state belongs to that execution
how model operations inherit runtime state
where persistence behavior belongs
how tenant infrastructure is resolved
who owns transaction completion
how reusable infrastructure stays separate from execution state
```

That distinction matters because much of the complexity in growing systems comes from coordinating execution rather than from individual database calls.

## Runtime responsibilities

Throughout the tutorials, the same responsibility model is used consistently:

```text
Adapter
→ framework execution ingress

TenantResolver
→ tenant identity

AmbitenContext
→ execution-scoped state

Application
→ business behavior

AmbitenModel
→ operation coordination and context binding

ModelContext
→ persistence-facing operation state

AmbitenSchema
→ structure and persistence behavior

DbProvider
→ database, client, and session contract

MultiTenantManager
→ tenant infrastructure

AmbitenClient
→ MongoDB capability

Transaction Boundary
→ transaction lifecycle

MongoDB
→ persistence
```

Keeping those responsibilities separate makes larger examples easier to understand.

## Process state and execution state

The tutorials also distinguish reusable process infrastructure from short-lived execution state.

```text
PROCESS LIFETIME

AmbitenRuntime
AmbitenClient
MongoClient
MultiTenantManager
providers
runtime configuration
```

```text
EXECUTION LIFETIME

AmbitenContext
tenantId
requestId
dbName
collectionName
session
logger metadata
runtime metadata
```

And during model execution:

```text
OPERATION LIFETIME

Effective ModelContext
explicit overrides
model defaults
soft-delete controls
operation configuration
```

This separation allows infrastructure to be reused while execution state remains isolated to the work that created it.

## When to use tutorials

Tutorials are most useful when you want to understand how multiple Ambiten concepts work together inside a complete system.

They are especially useful when you want to:

- move beyond isolated examples
- understand execution-scoped context
- study tenant-aware runtime behavior
- see how `AmbitenContext` becomes an Effective `ModelContext`
- understand middleware and schema participation
- follow transaction state through participating operations
- see how infrastructure is resolved without entering business logic
- understand runtime instrumentation boundaries
- study complete application execution flows

For individual API contracts and lower-level behavior, use the Core documentation and reference sections.

## Summary

Tutorials are where the Ambiten runtime becomes concrete.

They show how execution boundaries, `AmbitenContext`, application logic, `AmbitenModel`, Effective `ModelContext`, schemas, middleware, tenant infrastructure, transactions, instrumentation, and MongoDB fit together.

The central model is:

```text
Boundary creates execution.

Context carries execution.

Model binds execution to an operation.

ModelContext carries operation state.

Infrastructure resolves resources.

MongoDB performs persistence.
```

The goal is not simply to teach individual methods.

It is to make the behavior of a complete Ambiten application understandable from ingress to persistence.

## Next step

→ [Build a Document-to-PDF SaaS](/tutorials/pdf-saas)
