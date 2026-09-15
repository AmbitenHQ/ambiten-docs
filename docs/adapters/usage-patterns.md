---
title: Adapter Usage Patterns
description: Practical patterns for using Ambiten adapters across HTTP frameworks, GraphQL, AWS Lambda, workers, transactions, and multi-tenant applications.
---

# Adapter Usage Patterns

This page shows how Ambiten's adapter model applies across common application and execution environments.

The central principle is:

> **The framework changes. The runtime contract does not.**

Whether execution begins in Express, Fastify, NestJS, GraphQL, AWS Lambda, or an explicit background job, Ambiten follows the same runtime model:

```text
Execution Entry
      ↓
Runtime Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
Tenant Infrastructure
```

What changes between environments is how execution enters Ambiten.

What happens after that boundary remains consistent.

## Core Principle

All framework adapters converge into the same shared runtime path:

<SignalFlow
  aria-label="Shared adapter usage flow"
  :items='[
    "Ingress",
    "Adapter",
    "Adapter Runtime",
    "AmbitenContext",
    "Model",
    "MongoDB"
  ]'
/>

Conceptually:

```text
Ingress
   ↓
Framework Adapter
   ↓
Adapter Runtime
   ↓
Tenant Resolution
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

The adapter normalizes the host environment.

The adapter runtime establishes execution scope.

`AmbitenContext` carries execution state.

`MultiTenantManager` resolves tenant infrastructure.

Models execute against the active runtime boundary.

This allows application logic to remain portable without reimplementing tenant resolution, context propagation, transaction wiring, or resource selection for every framework.

## Pattern 1: Multi-Tenant REST API with Express

A common SaaS pattern is resolving tenant identity from an incoming request header.

```ts
import express from "express";

import {
  AmbitenBootstrapFactory,
  MultiTenantManager
} from "@ambiten/core";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

const runtime =
  await AmbitenBootstrapFactory.create();

const app =
  express();

app.use(
  express.json()
);

const adapter =
  createExpressAdapter();

await adapter.install(app, {
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
});
```

A request:

```http
GET /users
x-tenant-id: tenant5
```

enters:

```text
Express
   ↓
TenantResolver
   ↓
tenant5
   ↓
AmbitenContext
```

The route remains focused on application behavior:

```ts
app.get(
  "/users",
  async (_req, res) => {
    const users =
      await UserModel.find({});

    res.json(users);
  }
);
```

The route does not need to manually:

```text
read x-tenant-id
resolve tenant configuration
select a database
create a MongoClient
propagate tenant identity
```

The runtime handles those concerns through the active execution context.

## Pattern 2: Using the Resolved Tenant Identity

If application data should record tenant ownership, use the identity already resolved into `AmbitenContext`.

```ts
import {
  AmbitenContext
} from "@ambiten/core";

app.post(
  "/users",
  async (req, res) => {
    const {
      tenantId
    } = AmbitenContext.get();

    const user =
      await UserModel.create({
        ...req.body,
        tenantId
      });

    res
      .status(201)
      .json(user);
  }
);
```

Prefer:

```ts
AmbitenContext.get().tenantId
```

over repeatedly doing:

```ts
req.headers["x-tenant-id"];
```

The raw request header is a transport detail.

The context value is the resolved runtime identity.

This becomes especially important if tenant resolution later changes from:

```text
HTTP header
```

to:

```text
JWT claim
subdomain
cookie
gateway metadata
custom resolver
```

Downstream application code does not need to change.

## Pattern 3: Dynamic Tenant Discovery

Not every tenant needs to be known during application startup.

A dynamic application can configure `MultiTenantManager` with a tenant configuration resolver:

```ts
import {
  MultiTenantManager
} from "@ambiten/core";

MultiTenantManager
  .setTenantConfigResolver({
    async resolve(tenantId) {
      const config =
        await lookupTenant(
          tenantId
        );

      if (!config) {
        return undefined;
      }

      return {
        tenantId,
        uri: config.uri,
        dbName: config.dbName,
        lazy: true,
        metadata:
          config.metadata
      };
    }
  });
```

A request can then arrive for a previously unknown tenant:

```http
x-tenant-id: tenant5
```

The runtime may follow:

```text
tenant5
   ↓
MultiTenantManager
   ↓
not registered
   ↓
TenantConfigResolver
   ↓
external lookup
   ↓
register tenant5
   ↓
getClient()
   ↓
db_tenant5
```

Application code remains unchanged:

```ts
await UserModel.find({});
```

The model does not need to know whether the tenant was:

```text
registered during startup
```

or:

```text
discovered during this request
```

That distinction belongs to the runtime.

## Pattern 4: Transactional Request with Fastify

Fastify uses a different framework lifecycle from Express, but the runtime contract remains the same.

```ts
import Fastify from "fastify";

import {
  createFastifyAdapter
} from "@ambiten/adapter-fastify";

const app =
  Fastify();

const adapter =
  createFastifyAdapter();

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id"
  },

  enableTransactions: true
});
```

With request-wide transactions enabled:

```ts
app.post(
  "/transfer",
  async () => {
    await AccountModel.updateOne(
      {
        _id: "A"
      },
      {
        $inc: {
          balance: -100
        }
      }
    );

    await AccountModel.updateOne(
      {
        _id: "B"
      },
      {
        $inc: {
          balance: 100
        }
      }
    );

    return {
      success: true
    };
  }
);
```

The request follows:

```text
Fastify Request
      ↓
Fastify Adapter
      ↓
AmbitenContext
      ↓
Transaction Boundary
      ↓
Handler
      ↓
Model A
      ↓
Model B
```

Both model operations participate in the same request-aware execution boundary.

## Pattern 5: Explicit Transaction Scope

Not every request should automatically be transactional.

When only one workflow requires atomic consistency, use an explicit transaction boundary instead.

```ts
import {
  AmbitenContext
} from "@ambiten/core";

app.post(
  "/transfer",
  async () => {
    return AmbitenContext
      .withTransaction(
        async () => {
          await AccountModel
            .updateOne(
              {
                _id: "A"
              },
              {
                $inc: {
                  balance: -100
                }
              }
            );

          await AccountModel
            .updateOne(
              {
                _id: "B"
              },
              {
                $inc: {
                  balance: 100
                }
              }
            );

          return {
            success: true
          };
        }
      );
  }
);
```

The distinction is:

```text
enableTransactions: true
→ execution-wide transaction

AmbitenContext.withTransaction(...)
→ operation-specific transaction
```

Use the boundary that matches the application's consistency requirements.

## Pattern 6: GraphQL Resolver Execution

GraphQL enters Ambiten through context creation rather than HTTP middleware.

```ts
import {
  createApolloContextFactory
} from "@ambiten/graphql";

const context =
  createApolloContextFactory({
    tenancy: {
      header: "x-tenant-id"
    }
  });
```

Resolvers remain focused on application behavior:

```ts
const resolvers = {
  Query: {
    users: async () => {
      return UserModel.find({});
    }
  },

  Mutation: {
    createUser: async (
      _parent,
      args
    ) => {
      return UserModel.create(
        args.input
      );
    }
  }
};
```

The execution flow is:

```text
GraphQL Operation
      ↓
Context Factory
      ↓
AmbitenContext
      ↓
Resolver
      ↓
Service
      ↓
Model
```

Resolver code does not need to perform tenant database selection.

## Pattern 7: GraphQL Context Enrichment

GraphQL's own context and `AmbitenContext` can coexist.

For example:

```ts
const context =
  createApolloContextFactory(
    {
      tenancy: {
        header: "x-tenant-id"
      }
    },

    async ({ req }) => {
      return {
        user: req.user
      };
    }
  );
```

This creates two complementary context layers:

```text
GraphQL Context
→ user
→ services
→ loaders

AmbitenContext
→ tenantId
→ requestId
→ transaction state
→ runtime metadata
```

Do not force all runtime state into GraphQL context simply because GraphQL exposes one.

The two contexts solve different problems.

## Pattern 8: NestJS Service-Layer Execution

NestJS integrates through its module and interceptor system.

```ts
import {
  Module
} from "@nestjs/common";

import {
  AmbitenNestAdapterModule
} from "@ambiten/nestjs";

@Module({
  imports: [
    AmbitenNestAdapterModule
      .forRoot({
        tenancy: {
          header:
            "x-tenant-id"
        }
      })
  ]
})
export class AppModule {}
```

Services can remain ordinary NestJS providers:

```ts
import {
  Injectable
} from "@nestjs/common";

@Injectable()
export class UserService {
  async getUsers() {
    return UserModel.find({});
  }
}
```

The service does not need:

```text
Request injection
HTTP header access
manual tenant propagation
manual database selection
```

The interceptor establishes the runtime boundary before controller and service execution.

## Pattern 9: Singleton NestJS Service with Request Context

A service does not need to become request-scoped simply because it needs the current tenant.

```ts
import {
  Injectable
} from "@nestjs/common";

import {
  AmbitenContext
} from "@ambiten/core";

@Injectable()
export class AuditService {
  async record() {
    const {
      tenantId,
      requestId
    } = AmbitenContext.get();

    console.log({
      tenantId,
      requestId
    });
  }
}
```

The provider may remain a singleton.

Request-specific state belongs to:

```text
AmbitenContext
```

not to mutable fields on the singleton service.

Avoid:

```ts
@Injectable()
export class UserService {
  currentTenantId:
    string | undefined;
}
```

Shared provider instances should not store per-request tenant identity.

## Pattern 10: AWS Lambda Execution

In Lambda, the handler itself is the execution boundary.

Runtime infrastructure can be initialized outside the invocation path:

```ts
import {
  AmbitenBootstrapFactory
} from "@ambiten/core";

import {
  createLambdaAdapter
} from "@ambiten/lambda";

const runtime =
  await AmbitenBootstrapFactory
    .create();

export const handler =
  createLambdaAdapter(
    async () => {
      const users =
        await UserModel.find({});

      return {
        statusCode: 200,
        body: JSON.stringify(
          users
        )
      };
    },

    {
      tenancy: {
        header:
          "x-tenant-id"
      }
    }
  );
```

This gives Lambda two distinct lifetimes:

```text
EXECUTION ENVIRONMENT
─────────────────────
Ambiten runtime
MongoDB clients
MultiTenantManager


INVOCATION
──────────
AmbitenContext
tenantId
requestId
transaction state
```

A warm Lambda environment may reuse runtime infrastructure.

Every invocation still receives a fresh execution context.

## Pattern 11: Background Jobs with Explicit Context

Background jobs do not have an adapter-managed request lifecycle.

They should establish their own runtime boundary explicitly.

```ts
import {
  AmbitenContext
} from "@ambiten/core";

async function processJob(
  job: {
    id: string;
    tenantId: string;
  }
) {
  await AmbitenContext.run(
    {
      tenantId:
        job.tenantId,

      requestId:
        `job-${job.id}`
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

The worker flow becomes:

```text
Queue Message
      ↓
tenantId
      ↓
AmbitenContext.run(...)
      ↓
Worker Logic
      ↓
Model
      ↓
Tenant Database
```

The principle is:

```text
Adapter-managed execution
→ adapter establishes context

Non-adapter execution
→ application establishes context
```

## Pattern 12: Scheduled Multi-Tenant Work

A scheduled process may need to execute separately for several tenants.

```ts
async function runCleanup(
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

A scheduler can then establish an independent execution scope for each tenant:

```text
Scheduler
   ↓
tenant1 context
   ↓
cleanup
   ↓
tenant2 context
   ↓
cleanup
   ↓
tenant3 context
   ↓
cleanup
```

Do not place one tenant ID in process-global mutable state and reuse it across jobs.

Each execution should own its own context.

## Pattern 13: Queue Message Context Propagation

AsyncLocalStorage does not cross process or queue boundaries.

When publishing work for another process, explicitly propagate the identity needed to reconstruct execution.

Producer:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();

await queue.publish({
  type: "user.process",
  tenantId,
  requestId,
  payload
});
```

Consumer:

```ts
await AmbitenContext.run(
  {
    tenantId:
      message.tenantId,

    requestId:
      message.requestId
  },

  async () => {
    await processMessage(
      message.payload
    );
  }
);
```

The distributed flow becomes:

```text
Execution A
      ↓
AmbitenContext
      ↓
Message
tenantId + requestId
      ↓
Worker
      ↓
new AmbitenContext
      ↓
Execution B
```

The context itself does not cross the boundary.

The identity required to reconstruct it does.

## Pattern 14: Cross-Service Propagation

The same rule applies across HTTP services.

Service A:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();

await fetch(
  "https://users.internal/api/users",
  {
    headers: {
      "x-tenant-id":
        tenantId ?? "",

      "x-request-id":
        requestId ?? ""
    }
  }
);
```

Service B's Ambiten adapter resolves those values into a new local execution context.

```text
Service A
AmbitenContext
      ↓
HTTP metadata
      ↓
Service B
Adapter
      ↓
AmbitenContext
```

Each service owns its own runtime state.

Only the required correlation identity crosses the network boundary.

## Pattern 15: Do Not Propagate Tenant Infrastructure

Cross-service or queue metadata should normally contain execution identity:

```text
tenantId
requestId
trace identifier
user identity reference
```

Do not propagate runtime infrastructure such as:

```text
MongoDB credentials
MongoClient instances
tenant connection state
internal database handles
```

The receiving application's `MultiTenantManager` should resolve its own tenant infrastructure.

The distributed contract should describe identity, not database internals.

## Pattern 16: Runtime-Level Policy Enforcement

Policies that apply consistently to model operations are often better placed near the model/runtime layer than repeated across every adapter entry point.

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

Or a policy can shape query behavior consistently before execution.

The important architectural property is:

```text
Express Route ──────┐
Fastify Handler ────┤
NestJS Service ─────┤
GraphQL Resolver ───┤
Lambda Handler ─────┤
Worker ──────────────┘
                    ↓
               Model Policy
```

The policy executes around the model operation regardless of which adapter introduced the execution.

## Pattern 17: Runtime Instrumentation

Instrumentation should observe runtime execution rather than being tied to one framework.

For example:

```ts
await measureQuery(
  "UserModel.find",

  async () => {
    return UserModel.find({});
  }
);
```

Runtime context can provide correlation information:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();

logger.info(
  "User query completed",
  {
    tenantId,
    requestId
  }
);
```

This allows telemetry to remain consistent across:

```text
Express
Fastify
NestJS
GraphQL
Lambda
workers
scheduled tasks
```

## Pattern 18: Runtime Diagnostics

Infrastructure diagnostics belong to the runtime layer rather than individual controllers.

For example:

```ts
const stats =
  MultiTenantManager
    .getStats();
```

may provide:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

This can support:

```text
health endpoints
operational dashboards
diagnostics
telemetry
runtime inspection
```

A route may expose selected diagnostics, but it should not become responsible for managing the tenant registry itself.

## Pattern 19: Authentication Before Tenant Authorization

Tenant identity should not automatically be treated as authorization.

A secure execution path may look like:

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
Application Logic
```

For example:

```http
x-tenant-id: tenant5
```

may identify a valid tenant.

It does not prove that the caller may access that tenant.

Ambiten provides execution and tenant routing.

The application defines access-control policy.

## Pattern 20: Avoid Rebuilding Context Inside an Adapter Boundary

When an adapter already owns the request boundary, application code should not recreate the same Ambiten scope manually.

Avoid:

```ts
app.get(
  "/users",
  async (req, res) => {
    await AmbitenContext.run(
      {
        tenantId:
          req.headers[
            "x-tenant-id"
          ] as string
      },

      async () => {
        const users =
          await UserModel.find({});

        res.json(users);
      }
    );
  }
);
```

Prefer:

```ts
app.get(
  "/users",
  async (_req, res) => {
    const users =
      await UserModel.find({});

    res.json(users);
  }
);
```

The adapter should remain the authoritative request execution boundary.

## Pattern 21: Keep Domain Services Framework-Independent

The same service should be able to execute regardless of which adapter introduced the runtime scope.

For example:

```ts
export async function createUser(
  input: CreateUserInput
) {
  const {
    tenantId
  } = AmbitenContext.get();

  return UserModel.create({
    ...input,
    tenantId
  });
}
```

That service can be called from:

```text
Express
Fastify
NestJS
GraphQL
Lambda
Worker
```

without depending directly on any of them.

Only the entry boundary changes.

The service contract does not.

## Pattern 22: Use Public Package Entry Points

Adapter/runtime behavior crosses npm package boundaries.

Applications should import through public package exports.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

import {
  createFastifyAdapter
} from "@ambiten/adapter-fastify";
```

Avoid:

```text
@ambiten/core/dist/...
@ambiten/adapter-runtime/dist/...
@ambiten/adapter-express/dist/...
```

Public package exports allow the correct ESM or CommonJS entry to be selected.

## ESM and CommonJS Usage

The runtime contract should remain the same regardless of the application's supported module format.

```text
ESM Consumer
      ↓
ESM Adapter
      ↓
ESM Adapter Runtime
      ↓
ESM Core
```

and:

```text
CommonJS Consumer
      ↓
CommonJS Adapter
      ↓
CommonJS Adapter Runtime
      ↓
CommonJS Core
```

The application-level behavior remains:

```ts
AmbitenContext.get().tenantId;
```

and:

```ts
await UserModel.find({});
```

regardless of the module format through which the packages were loaded.

## Cross-Runtime Consistency

This is the core adapter promise.

The same application operation:

```ts
await UserModel.find({});
```

or:

```ts
await UserModel.create({
  name: "Alice"
});
```

can execute behind:

```text
Express routes
Fastify handlers
NestJS services
GraphQL resolvers
Lambda invocations
background workers
scheduled jobs
```

Only the execution entry point changes.

The runtime contract remains stable.

## Choosing the Right Pattern

A useful decision model is:

```text
Is execution entering through
a supported framework?
        │
        ├── yes
        │    ↓
        │ use the framework adapter
        │
        └── no
             ↓
        establish AmbitenContext
        explicitly
```

Then:

```text
Does the whole execution
require one transaction?
        │
        ├── yes
        │    ↓
        │ adapter transaction boundary
        │
        └── no
             ↓
        use explicit transaction
        only where required
```

For tenant infrastructure:

```text
Tenant already registered?
        │
        ├── yes
        │    ↓
        │ reuse runtime configuration
        │
        └── no
             ↓
        TenantConfigResolver
        can discover it dynamically
```

## Recommended Mental Model

Think of adapter usage as a series of boundaries:

```text
                   ENTRY
                     │
      Express / Fastify / NestJS
       GraphQL / Lambda / Worker
                     │
                     ▼
              Execution Scope
                     │
                     ▼
               AmbitenContext
                     │
                     ▼
              Application Code
                     │
                     ▼
                AmbitenModel
                     │
                     ▼
            MultiTenantManager
                     │
                     ▼
                MongoDB
```

Framework adapters create the boundary automatically.

Workers and other detached execution create it explicitly.

Everything downstream can use the same Ambiten runtime model.

## Summary

Ambiten adapters make application execution portable without weakening runtime structure.

The practical patterns remain consistent across environments:

```text
supported framework
→ use its adapter

detached execution
→ establish context explicitly

tenant identity
→ AmbitenContext

tenant infrastructure
→ MultiTenantManager

dynamic tenant discovery
→ TenantConfigResolver

request-wide consistency
→ adapter transaction boundary

operation-specific consistency
→ AmbitenContext.withTransaction(...)

model execution
→ remains framework-independent
```

The framework determines **how execution enters Ambiten**.

It does not determine how Ambiten behaves after execution begins.

That consistency allows the same services, models, tenant infrastructure, transaction behavior, and observability patterns to operate across HTTP APIs, GraphQL services, serverless functions, workers, and scheduled execution.

## Related Pages

- [Adapters Overview](/adapters/overview)
- [Express](/adapters/express)
- [Fastify](/adapters/fastify)
- [NestJS](/adapters/nestjs)
- [GraphQL](/adapters/graphql)
- [Lambda](/adapters/lambda)
- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolution)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/multi-tenancy/framework-adapters)