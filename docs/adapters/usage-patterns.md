# Adapter Usage Patterns

This page shows how Tenra’s adapter model applies across common runtime environments.

The central idea is simple:

>**The framework changes. The runtime contract does not.**

Whether execution starts in Express, Fastify, NestJS, GraphQL, AWS Lambda, or an explicit background job, Tenra keeps the same runtime behavior: context is established, tenant scope is resolved, model execution remains consistent, and infrastructure concerns stay out of business logic.

## Core principle

All adapters converge into the same execution path:

<SignalFlow 
   aria-label="Shared adapter usage flow" 
   :items='["Ingress", "Adapter", "Adapter Runtime", "TenraContext", "Model", "MongoDB"]' 
/>

The adapter normalizes the host environment. The adapter runtime establishes execution scope. TenraContext carries runtime state, and models execute against that active boundary.

This is what makes Tenra portable across runtimes without forcing each application to reinvent context handling, tenant resolution, or transaction wiring.

## Multi-tenant REST API with Express

A common SaaS pattern is resolving tenant identity at the edge through request headers.

```ts
import express from "express";
import { createExpressAdapter } from "@tenra/express";

const app = express();

createExpressAdapter().install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  },
  enableTransactions: true
});
```

A route handler can then remain focused on application behavior:

```ts
app.get("/users", async (_req, res) => {
  const users = await UserModel.find({});
  res.json(users);
});
```

Request metadata such as:

```http
GET /users
x-tenant-id: tenant-a
```

is resolved by the adapter before the route executes. The handler does not need tenant-specific branching, session setup, or manual context propagation.

## Transactional workflow with Fastify

Fastify uses lifecycle hooks rather than Express-style middleware, but the Tenra runtime behavior remains the same.

```ts
import Fastify from "fastify";
import { createFastifyAdapter } from "@tenra/fastify";

const app = Fastify();

createFastifyAdapter().install(app, {
  tenancy: {
    header: "x-tenant-id"
  },
  enableTransactions: true
});
```

Application code remains unchanged:

```ts
app.post("/transfer", async () => {
  await AccountModel.updateOne(
    { _id: "A" },
    { $inc: { balance: -100 } }
  );

  await AccountModel.updateOne(
    { _id: "B" },
    { $inc: { balance: 100 } }
  );

  return { success: true };
});
```

The adapter establishes context through Fastify’s lifecycle before the handler executes, allowing both operations to share the same execution scope when transaction boundaries are applied.

## GraphQL resolver pattern

GraphQL integrates through context factories because resolver execution is context-driven rather than middleware-driven.

```ts
const context = createApolloContextFactory({
  tenancy: {
    header: "x-tenant-id"
  }
});
```

Resolvers stay clean:

```ts
const resolvers = {
  Query: {
    users: () => UserModel.find({})
  },
  Mutation: {
    createUser: (_p, args) => UserModel.create(args.input)
  }
};
```

## NestJS service-layer pattern

NestJS integrates through modules and interceptors so runtime scope is established before controller and service execution.

```ts
import { Module } from "@nestjs/common";
import { TenraNestAdapterModule } from "@tenra/nestjs";

@Module({
  imports: [
    TenraNestAdapterModule.forRoot({
      tenancy: {
        header: "x-tenant-id"
      },
      enableTransactions: true
    })
  ]
})
export class AppModule {}
```

Services can remain focused on application workflows:

```ts
@Injectable()
export class UserService {
  async getUsers() {
    return UserModel.find({});
  }
}
```

The interceptor creates the runtime boundary above the service layer, so dependency injection and application structure remain untouched while Tenra handles execution context underneath.

## Serverless execution with AWS Lambda

In Lambda, the handler itself is the execution boundary.

```ts
import { createLambdaAdapter } from "@tenra/lambda";

export const handler = createLambdaAdapter(async () => {
  const users = await UserModel.find({});

  return {
    statusCode: 200,
    body: JSON.stringify(users)
  };
});
```

The adapter creates a fresh runtime scope per invocation. This prevents cross-request state leakage while preserving the same tenant-aware and context-aware model behavior used in server-based runtimes.

## Background jobs with explicit context

Background jobs do not have an adapter-managed request lifecycle, so context must be established explicitly.

```ts
import { TenraContext } from "@tenra/core";

async function processJob(job: { tenantId: string }) {
  await TenraContext.run(
    {
      tenantId: job.tenantId,
      requestId: `job-${Date.now()}`
    },
    async () => {
      await UserModel.updateMany(
        {},
        { $set: { processed: true } }
      );
    }
  );
}
```

This keeps worker execution tenant-aware and observable even when no HTTP request, GraphQL context, or Lambda event wrapper is present.

## Middleware-driven policies

Centralized policy behavior is one of the main advantages of Tenra’s runtime model.

### Example

```ts
UserModel.beforeFind((ctx) => {
  ctx.filter = {
    ...ctx.filter,
    isDeleted: { $ne: true }
  };
});
```

The policy runs around model execution instead of being repeated across route handlers, services, resolvers, or worker code.

That makes behavior consistent regardless of which adapter introduced the execution boundary.

## Runtime instrumentation

Instrumentation follows the same pattern. It observes execution at the runtime level rather than depending on framework-specific logging.

```ts
await measureQuery("UserModel.find", async () => {
  return UserModel.find({});
});
```

Because execution occurs inside TenraContext, telemetry can be enriched with tenant identity, request metadata, collection names, operation duration, and runtime outcome consistently across environments.

## Cross-runtime consistency

This is the core adapter promise:

```ts
await UserModel.find({});
await UserModel.create({ name: "Alice" });
```

The same model code can execute behind Express routes, Fastify handlers, NestJS services, GraphQL resolvers, Lambda invocations, or explicit worker scopes.

Only the runtime entry point changes.

The execution contract remains stable.

## Summary

Adapters make Tenra portable without weakening its runtime structure.

They allow different frameworks and execution environments to enter the same context-aware model, preserving tenant resolution, transaction participation, middleware behavior, instrumentation, and clean application code across runtimes.
