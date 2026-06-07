# Why Ambiten

Most MongoDB libraries solve access. Ambiten solves execution.

Modern teams already know how to create, read, update, and delete documents. The harder problem begins when application code must also carry tenant identity, transaction boundaries, request metadata, middleware rules, and observability context through every service, resolver, handler, and model call.

Ambiten moves those concerns out of repeated application plumbing and into a managed runtime layer.

## The Problem: Contextual Leakage

Enterprise MongoDB applications rarely fail because teams cannot write queries. They become fragile because the operational state around those queries is handled differently in different parts of the system.

Tenant identity has to survive deep asynchronous execution. Transaction sessions must be preserved across nested calls. Request metadata needs to remain available for logs, audit trails, and telemetry. Policies and lifecycle rules must run consistently no matter which framework or handler triggered the operation.

When every service manually carries that state, correctness becomes a matter of discipline rather than runtime design. Over time, the application pays a plumbing tax:

```ts
// Infrastructure leaking into your domain
await createUser(data, tenantId, session, correlationId, dbName);
```

This is not a data model problem. It is an execution model problem.

## The Ambiten Shift: Ambient Execution

Ambiten treats data access as part of a managed runtime system, not as a collection of isolated model calls.

Instead of pushing infrastructure state through your application, Ambiten lets the runtime carry it:

```ts
// Business logic stays focused on intent.
// Ambiten resolves execution context automatically.
await UserModel.create(data);
```

Behind that call, Ambiten resolves tenant scope, joins the active transaction when one exists, attaches telemetry metadata, applies middleware policy, and delegates the final operation through the configured provider.

The model call stays simple, but the execution around it remains governed.

## Strategic Positioning

Most tools stop at the data mapping layer. Ambiten extends into the execution layer.

| Capability            | Traditional ODM / ORM approach         | Ambiten approach                   |
| --------------------- | -------------------------------------- | -------------------------------- |
| Primary focus         | Document mapping and query ergonomics  | Execution integrity              |
| State management      | Manual and imperative                  | Ambient and runtime-carried      |
| Multi-tenancy         | Query-level filters and conventions    | Runtime-level isolation          |
| Transactions          | Explicit session threading             | Context-aware propagation        |
| Observability         | Added around individual calls          | Enriched through runtime context |
| Framework portability | Often coupled to application structure | Adapter-driven runtime flow      |

## Why This Matters at Scale

Transactions should not depend on perfect memory

MongoDB transactions are powerful, but they become fragile when every nested function must remember to pass the active session. One omitted { `session` } can place part of a workflow outside the transaction boundary, creating failures that are difficult to trace.

Ambiten keeps transaction scope attached to the active execution context:

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(userData);
  await ProfileModel.create(profileData);
});
```

Both operations can participate in the same transaction without forcing every model call to receive the session manually.

### Multi-tenancy should be safe by design

Many systems treat multi-tenancy as a query concern:

```ts
await users.find({ tenantId: "acme" });
```

That approach works only when every query remembers the rule. Ambiten treats tenant scope as a runtime boundary instead. The tenant is resolved once at the request or execution boundary, then carried through model operations by the runtime.

This reduces the risk of accidental cross-tenant access and keeps isolation closer to the system architecture rather than individual developer discipline.

### Runtime portability should not require rewriting the data layer

As applications grow, the same data model may need to run behind REST routes, GraphQL resolvers, background jobs, serverless handlers, or framework-specific services.

Ambiten is adapter-driven, so the execution model remains consistent across environments. Express, Fastify, NestJS, GraphQL, and Lambda can have different entry points while sharing the same context-aware model layer.

## What Ambiten Becomes

Ambiten starts as a clean MongoDB runtime layer. As your system grows, it becomes the execution foundation around your data model: carrying context, preserving transactions, enforcing lifecycle rules, supporting tenant isolation, and producing the signals needed for operational governance.

You do not build one data layer for today and another for scale. You build on one runtime model and let Ambiten evolve with the system around it.
