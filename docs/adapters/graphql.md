---
title: GraphQL Adapter
description: Connect GraphQL operation and resolver execution to AmbitenContext, tenant resolution, transactions, and multi-tenant runtime infrastructure.
---

# GraphQL Adapter

::: warning Adapter 1.0.2 compatibility
The published package is `@ambiten/adapter-graphql`. Its context factories scope context construction, but do not by themselves keep `AmbitenContext` active in later resolvers. The [runnable GraphQL framework track](/tutorials/frameworks/graphql) provides and tests a shared resolver-scope bridge for Apollo and Yoga. It also configures Yoga's native Fetch classes because adapter 1.0.2 does not recognize Yoga's default Headers implementation. Treat the factory-only snippets below as conceptual unless these execution and header boundaries are supplied.
:::

The GraphQL adapter connects GraphQL operation execution to Ambiten's runtime model.

Unlike Express or Fastify, GraphQL does not primarily establish application execution through a middleware or request-hook chain.

Instead, Ambiten resolves runtime state at the GraphQL context creation boundary. With adapter 1.0.2, the resolver execution boundary described above is also required to make that state active during model calls.

Conceptually:

```text
GraphQL Request
      ↓
GraphQL Context Factory
      ↓
Adapter Runtime
      ↓
AmbitenContext
      ↓
Resolvers
      ↓
AmbitenModel
      ↓
Tenant Database
```

This allows resolvers to remain focused on application behavior while tenant identity, request metadata, transaction state, and runtime-aware execution are handled through the surrounding runtime boundary.

## Why GraphQL Integration Is Different

GraphQL execution is resolver-driven.

In Express, request execution naturally passes through middleware.

In Fastify, request execution passes through framework lifecycle hooks.

GraphQL instead creates an execution context associated with the operation and makes that context available throughout resolver execution.

Ambiten therefore uses the GraphQL context factory as the integration boundary.

```text
Express
→ middleware boundary

Fastify
→ lifecycle boundary

GraphQL
→ context creation boundary
```

The framework mechanism changes.

The Ambiten runtime model does not.

## Runtime Responsibility Model

GraphQL integration participates in the same Ambiten architecture as other adapters.

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

GraphQL Adapter
→ establishes GraphQL execution scope

AmbitenContext
→ carries request/operation state

MultiTenantManager
→ manages tenant infrastructure

Resolvers
→ execute application behavior

AmbitenModel
→ performs data operations

MongoDB
→ performs persistence
```

The GraphQL adapter does not manage tenant database infrastructure itself.

It establishes the execution context that allows downstream Ambiten components to resolve those resources.

## Integration Model

Ambiten provides GraphQL context factories for supported GraphQL runtimes.

### Apollo Server

```ts
import {
  createApolloContextFactory
} from "@ambiten/adapter-graphql";

const context =
  createApolloContextFactory({
    tenancy: {
      header: "x-tenant-id"
    }
  });
```

The resulting factory can be supplied to the GraphQL server's context configuration.

Conceptually:

```text
Apollo Request
      ↓
Apollo Context Factory
      ↓
Ambiten Adapter Runtime
      ↓
AmbitenContext
      ↓
Resolver Execution
```

### GraphQL Yoga

```ts
import {
  createYogaContextFactory
} from "@ambiten/adapter-graphql";

const context =
  createYogaContextFactory({
    tenancy: {
      header: "x-tenant-id"
    }
  });
```

The same runtime principles apply:

```text
Yoga Request
      ↓
Yoga Context Factory
      ↓
Ambiten Adapter Runtime
      ↓
AmbitenContext
      ↓
Resolver Execution
```

Once configured, GraphQL operations enter the Ambiten execution boundary before application resolvers perform their work.

## GraphQL Context vs AmbitenContext

GraphQL already has its own application context.

Ambiten does not replace it.

These two concepts serve different purposes.

```text
GraphQL Context
→ values exposed explicitly to GraphQL resolvers

AmbitenContext
→ request-scoped runtime state propagated through execution
```

For example, GraphQL context may contain:

```ts
{
  user,
  dataSources,
  services
}
```

while `AmbitenContext` may contain:

```ts
{
  tenantId: "tenant5",
  requestId: "req_123"
}
```

The two can participate in the same operation without being the same object.

## Extending GraphQL Context

Application-specific values can be added alongside Ambiten's runtime integration.

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

Resolvers can then receive application-specific GraphQL context while Ambiten runtime state remains available through:

```ts
AmbitenContext.get();
```

Conceptually:

```text
GraphQL Request
      ↓
Context Factory
      ├── GraphQL application context
      │     └── user
      │
      └── Ambiten runtime context
            └── tenantId
```

The adapter augments GraphQL execution rather than replacing the application's context model.

## How the Adapter Works

At execution time, the GraphQL adapter:

1. receives the GraphQL request environment,
2. extracts request-like information,
3. normalizes it into `AmbitenRequestLike`,
4. resolves tenant identity when configured,
5. validates the tenant when required,
6. establishes `AmbitenContext`,
7. executes GraphQL resolver work within that runtime boundary.

Conceptually:

```text
GraphQL Request
      ↓
normalize request
      ↓
resolve tenant
      ↓
validate tenant
      ↓
establish AmbitenContext
      ↓
GraphQL execution
      ↓
Resolvers
```

The adapter runtime therefore provides the same context contract used by other Ambiten framework integrations.

## Execution Flow

GraphQL execution follows a context-driven runtime path:

```text
GraphQL Request
      ↓
Context Factory
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Resolver
      ↓
AmbitenModel
      ↓
MultiTenantManager
      ↓
Tenant Database
```

<SignalFlow
  aria-label="GraphQL adapter execution flow"
  :items='[
    "GraphQL Request",
    "Context Factory",
    "Adapter Runtime",
    "AmbitenContext",
    "Resolver",
    "MongoDB"
  ]'
/>

The GraphQL runtime continues to orchestrate parsing, validation, execution, and resolver dispatch.

Ambiten establishes the runtime state that resolver execution can inherit.

## Resolvers Remain Focused

Once the GraphQL adapter is configured, resolvers do not need to establish Ambiten runtime state manually.

For example:

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

Resolvers do not need to manually:

- create `AmbitenContext`,
- read tenant headers,
- create tenant clients,
- select tenant databases,
- propagate request metadata between services.

Those concerns are handled through the runtime boundary surrounding resolver execution.

## Tenant-Aware GraphQL Execution

A GraphQL request may carry:

```http
x-tenant-id: tenant5
```

The GraphQL adapter can resolve that request identity into:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

Conceptually:

```text
GraphQL Request
x-tenant-id: tenant5
        ↓
GraphQL Context Factory
        ↓
TenantResolver
        ↓
tenant5
        ↓
AmbitenContext
tenantId = tenant5
        ↓
Resolvers
```

Resolvers can then perform ordinary model operations:

```ts
await UserModel.find({});
```

without manually selecting tenant infrastructure.

## Tenant Resolution vs Tenant Infrastructure

The GraphQL adapter determines which tenant belongs to the operation.

It does not own the tenant's infrastructure.

```text
GraphQL Adapter
→ Who is this operation for?

AmbitenContext
→ Which tenant belongs to this execution?

MultiTenantManager
→ What resources belong to that tenant?
```

For example, the adapter may resolve:

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

Those values remain under `MultiTenantManager`.

## Tenant Validation

Resolved tenant identities can be validated before resolver execution proceeds.

For example:

```ts
import {
  MultiTenantManager
} from "@ambiten/core";

const context =
  createApolloContextFactory({
    tenancy: {
      header: "x-tenant-id",

      validate: async (
        tenantId
      ) => {
        const tenant =
          await MultiTenantManager
            .resolveTenant(
              tenantId
            );

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

The operation lifecycle becomes:

```text
GraphQL Request
      ↓
Resolve tenant
      ↓
tenant5
      ↓
Validate
      ↓
Valid?
 ┌────┴────┐
yes        no
 ↓          ↓
Context   reject operation
```

Validation may be asynchronous.

This allows validation to work with both statically registered and dynamically discovered tenants.

## Dynamic Tenants

The GraphQL adapter does not need to know whether a tenant was registered during application startup.

Suppose a request resolves:

```text
tenant5
```

and `tenant5` is not currently registered.

Resolver execution may eventually require database access:

```text
Resolver
   ↓
UserModel.find(...)
   ↓
AmbitenContext
tenantId = tenant5
   ↓
MultiTenantManager
```

The runtime can then follow:

```text
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
db_tenant5
```

From the GraphQL adapter's perspective, static and dynamic tenants are identical.

It carries tenant identity.

The runtime manages tenant infrastructure.

## Custom Tenant Resolution

GraphQL tenancy does not need to depend on a fixed HTTP header.

A custom resolver can derive tenant identity from request-specific information.

Conceptually:

```ts
const context =
  createApolloContextFactory({
    resolvers: {
      tenantId: async (req) => {
        return resolveTenantForRequest(
          req
        );
      }
    }
  });
```

Tenant identity may originate from:

- authentication information,
- cookies,
- request headers,
- gateway metadata,
- route or endpoint context,
- token claims,
- application-defined request state.

The result remains:

```text
GraphQL Request
      ↓
TenantResolver
      ↓
tenantId
      ↓
AmbitenContext
```

Resolvers remain independent from how the tenant was originally identified.

## Using the Resolved Tenant

Inside resolver or service code:

```ts
const {
  tenantId
} = AmbitenContext.get();
```

returns the tenant associated with the active operation.

For example:

```ts
const resolvers = {
  Mutation: {
    createUser: async (
      _parent,
      args
    ) => {
      const {
        tenantId
      } = AmbitenContext.get();

      return UserModel.create({
        ...args.input,
        tenantId
      });
    }
  }
};
```

If tenant identity is stored in application data, use the resolved context value rather than re-reading the raw request transport.

## Async Resolver Execution

Resolver execution is frequently asynchronous.

For example:

```ts
const resolvers = {
  Query: {
    users: async () => {
      const before =
        AmbitenContext
          .get()
          .tenantId;

      await Promise.resolve();

      const after =
        AmbitenContext
          .get()
          .tenantId;

      return {
        before,
        after
      };
    }
  }
};
```

For an operation belonging to `tenant5`:

```ts
{
  before: "tenant5",
  after: "tenant5"
}
```

Ambiten's runtime context is designed to remain associated with asynchronous execution belonging to the active operation.

## Nested Resolver and Service Execution

Resolvers often delegate work to services:

```text
Resolver
   ↓
Service
   ↓
Another Service
   ↓
AmbitenModel
```

Those services do not need the GraphQL context object just to determine runtime tenant identity.

For example:

```ts
export async function createUser(
  input
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

This keeps application services independent from the GraphQL runtime.

## Avoid Passing GraphQL Context Only for Tenant Identity

Without runtime context, applications can become coupled like this:

```text
Resolver
   ↓ passes GraphQL context
Service
   ↓ passes context
Repository
   ↓ reads tenant
Model
```

With Ambiten:

```text
GraphQL Context Factory
      ↓
AmbitenContext
      ↓
Resolver
      ↓
Service
      ↓
Repository
      ↓
Model
```

GraphQL context can still carry application values where appropriate.

It simply does not need to become the transport mechanism for every piece of runtime state.

## Transaction-Aware Mutations

GraphQL mutations can use Ambiten transactions exactly like other execution environments.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";

const resolvers = {
  Mutation: {
    createUser: async (
      _parent,
      args
    ) => {
      return AmbitenContext
        .withTransaction(
          async () => {
            const user =
              await UserModel.create(
                args.input
              );

            await AuditModel.create({
              action:
                "USER_CREATED",

              userId:
                user._id
            });

            return user;
          }
        );
    }
  }
};
```

The transaction session remains associated with nested model operations executed inside the transaction boundary.

Conceptually:

```text
Mutation
   ↓
withTransaction()
   ↓
UserModel.create()
   ↓
AuditModel.create()
   ↓
same transaction session
```

No manual session propagation is required between those operations.

## Transaction Scope Should Be Intentional

Not every GraphQL operation should automatically be transactional.

Queries generally do not require request-wide transactions.

Many mutations also perform only one independent write.

Use a transaction when multiple operations need atomic consistency.

```text
Mutation
   ↓
multiple dependent writes?
   │
   ├── yes → transaction may be appropriate
   │
   └── no  → ordinary execution may be sufficient
```

Transaction scope should reflect application consistency requirements rather than the fact that GraphQL is being used.

## GraphQL Context Enrichment

Application-specific context can continue to contain authenticated user information, services, loaders, or other resolver dependencies.

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
      const user =
        await authenticate(
          req
        );

      return {
        user
      };
    }
  );
```

Resolvers can then receive:

```ts
{
  user
}
```

through GraphQL context while Ambiten continues to provide:

```ts
AmbitenContext.get().tenantId
```

through the execution runtime.

This keeps the two context systems complementary.

## Authentication and Tenant Resolution

Tenant identity and authenticated user identity should remain separate concepts.

A request may establish:

```ts
tenantId = "tenant5";
```

while authentication establishes:

```ts
userId = "usr_2481";
```

The application may therefore operate with:

```ts
{
  tenantId: "tenant5",
  userId: "usr_2481"
}
```

GraphQL authentication can remain part of application context while Ambiten maintains tenant execution state.

## Security

A client-controlled tenant identifier should not automatically be treated as authorization.

For example:

```http
x-tenant-id: tenant5
```

may identify a valid tenant while the authenticated caller is not authorized to access it.

A stronger operation lifecycle may be:

```text
GraphQL Request
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
Resolvers
```

Ambiten handles tenant resolution and runtime propagation.

The application remains responsible for defining access-control policy.

## Models Use the Active Runtime Context

Resolver code can remain simple:

```ts
const resolvers = {
  Query: {
    users: async () => {
      return UserModel.find({});
    }
  }
};
```

If the active execution contains:

```ts
{
  tenantId: "tenant5"
}
```

the runtime can resolve:

```text
UserModel.find(...)
      ↓
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
tenant5 MongoClient
      ↓
db_tenant5
```

The model does not need to know anything about Apollo, Yoga, or GraphQL itself.

## GraphQL Does Not Own Database Routing

The GraphQL adapter should not contain tenant-specific database selection logic.

Avoid patterns such as:

```ts
if (
  tenantId === "tenant5"
) {
  return tenant5Db;
}
```

inside GraphQL integration code.

The GraphQL boundary should provide:

```ts
{
  tenantId: "tenant5"
}
```

through `AmbitenContext`.

The runtime then resolves:

```text
tenantId
   ↓
MultiTenantManager
   ↓
tenant configuration
   ↓
client
   ↓
database
```

This keeps GraphQL integration independent from tenant infrastructure.

## Instrumentation

GraphQL operations can participate in Ambiten's runtime-aware instrumentation.

For example:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();

logger.info(
  "GraphQL operation executing",
  {
    tenantId,
    requestId
  }
);
```

This allows logs and diagnostics to remain correlated with the same execution state used by model operations.

In multi-tenant GraphQL services, that correlation can be particularly valuable when many operations share the same server process.

## Error Handling

Tenant resolution, tenant validation, authentication, resolver execution, and database access may fail at different stages.

These failures should remain distinguishable.

Conceptually:

```text
GraphQL Request
      ↓
Tenant Resolution
      ├── unresolved
      ↓
Tenant Validation
      ├── invalid
      ↓
Resolver
      ├── application error
      ↓
Model
      ├── database error
```

GraphQL's error system remains responsible for exposing operation failures according to the application's API policy.

Ambiten does not require those different failure classes to collapse into one generic tenancy error.

## Relationship with AmbitenBootstrapFactory

`AmbitenBootstrapFactory` and the GraphQL adapter operate at different lifecycle stages.

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

GraphQL Adapter
→ connects GraphQL execution to that runtime
```

A typical lifecycle is:

```text
Process Starts
      ↓
AmbitenBootstrapFactory
      ↓
Runtime Ready
      ↓
GraphQL Server Created
      ↓
Ambiten Context Factory Installed
      ↓
Server Accepts Operations
```

The factory prepares process-level resources.

The GraphQL adapter creates operation-level execution boundaries.

## Runtime Shutdown

The GraphQL adapter establishes execution scope.

It does not replace the runtime lifecycle.

When the application terminates:

```ts
await runtime.shutdown();
```

should be called at the application lifecycle boundary.

Conceptually:

```text
Server starts
      ↓
many GraphQL operations
      ↓
shutdown signal
      ↓
GraphQL server stops
      ↓
runtime.shutdown()
```

Do not shut down the Ambiten runtime after an individual GraphQL operation.

## ESM and CommonJS

GraphQL integrations participate in the same Ambiten package-boundary model as other adapters.

The intended relationship is:

```text
ESM Application
      ↓
GraphQL Adapter ESM
      ↓
adapter-runtime ESM
      ↓
Ambiten Core ESM
```

and:

```text
CommonJS Application
      ↓
GraphQL Adapter CJS
      ↓
adapter-runtime CJS
      ↓
Ambiten Core CJS
```

Request-scoped runtime state should remain consistent across the adapter and Core boundary.

Applications should use public package imports rather than internal build paths.

Prefer:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

and the public GraphQL adapter package entry point.

Avoid imports such as:

```text
@ambiten/core/dist/...
@ambiten/adapter-runtime/dist/...
```

Public package exports allow the appropriate module entry to be selected for the consumer environment.

## Testing GraphQL Integration

A meaningful integration test should verify the actual GraphQL execution boundary.

For example, a resolver can inspect runtime context after an asynchronous boundary:

```ts
const resolvers = {
  Query: {
    contextTenant:
      async () => {
        await Promise.resolve();

        return AmbitenContext
          .get()
          .tenantId;
      }
  }
};
```

A GraphQL request containing:

```http
x-tenant-id: tenant5
```

should produce:

```text
tenant5
```

inside resolver execution.

For tenant-aware model tests, also verify the runtime state when appropriate:

```ts
const tenant =
  MultiTenantManager
    .getTenant(
      "tenant5"
    );
```

A tenant used for database access may report:

```ts
{
  tenantId: "tenant5",
  dbName: "db_tenant5",
  connected: true,
  lazy: false
}
```

This validates the full path:

```text
GraphQL Request
      ↓
Context Factory
      ↓
AmbitenContext
      ↓
Resolver
      ↓
Model
      ↓
MultiTenantManager
      ↓
Tenant Database
```

## Why GraphQL Fits Ambiten's Runtime Model

GraphQL and Ambiten both benefit from separating execution context from application logic.

GraphQL provides:

```text
operation orchestration
schema execution
resolver dispatch
GraphQL context
```

Ambiten provides:

```text
runtime execution context
tenant identity
transaction propagation
tenant infrastructure resolution
model routing
```

The GraphQL adapter connects those two systems without requiring Ambiten Core to become GraphQL-specific.

## When to Use the GraphQL Adapter

The GraphQL adapter is appropriate for resolver-driven applications that need:

- tenant-aware execution,
- runtime context propagation,
- transaction-capable mutations,
- dynamic tenant resolution,
- structured instrumentation,
- GraphQL context enrichment,
- framework-independent services,
- consistent behavior with other Ambiten execution environments.

It is especially useful when a platform exposes both GraphQL and other APIs but wants them to share the same underlying runtime model.

## Recommended Mental Model

Think of the GraphQL adapter as an execution-scope initializer for GraphQL operations.

```text
GraphQL Runtime
→ owns GraphQL execution

GraphQL Context Factory
→ enters Ambiten runtime

TenantResolver
→ identifies tenant

AmbitenContext
→ carries execution state

Resolvers
→ implement application behavior

MultiTenantManager
→ resolves tenant resources

AmbitenModel
→ performs data operations

MongoDB
→ persists data
```

The important distinction is:

```text
GraphQL Context
→ resolver application dependencies

AmbitenContext
→ runtime execution state
```

Both can coexist within the same operation.

## Summary

The GraphQL adapter connects GraphQL operation execution to Ambiten's runtime system.

It:

- establishes Ambiten execution through GraphQL context creation,
- normalizes request information,
- resolves tenant identity,
- validates tenancy when configured,
- preserves runtime context across asynchronous resolver execution,
- supports transaction-aware mutations,
- allows GraphQL application context to remain extensible,
- keeps resolvers independent from tenant infrastructure,
- allows dynamic tenant discovery downstream.

The complete runtime flow is:

```text
GraphQL Request
      ↓
GraphQL Context Factory
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Resolver / Service
      ↓
AmbitenModel
      ↓
MultiTenantManager
      ↓
Tenant Database
```

## Related Pages

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
