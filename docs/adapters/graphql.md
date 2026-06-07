# GraphQL Adapter

The GraphQL adapter integrates Ambiten through context factories rather than middleware or lifecycle hooks.

Instead of attaching to an HTTP middleware chain, it establishes runtime scope directly inside GraphQL execution so every resolver runs within a fully initialized `AmbitenContext`.

This allows GraphQL resolvers to remain focused on application behavior while tenant resolution, transaction state, instrumentation, and execution metadata are handled by the runtime automatically.

## Integration model

Ambiten provides context factories for GraphQL runtimes such as Apollo Server and GraphQL Yoga.

### Apollo Server

```ts
import { createApolloContextFactory } from "@ambiten/graphql";

const context = createApolloContextFactory({
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  }
});
```

### GraphQL Yoga

```ts
import { createYogaContextFactory } from "@ambiten/graphql";

const context = createYogaContextFactory({
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  }
});
```

Once configured, every GraphQL operation enters the Ambiten runtime before resolver execution begins.

## Extending GraphQL context

Application-specific values can still be added cleanly alongside Ambiten’s runtime context.

```ts
const context = createApolloContextFactory(
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

The GraphQL adapter merges application context with runtime-aware execution rather than replacing it.

## How the adapter works

GraphQL execution differs from Express or Fastify because there is no shared middleware pipeline around resolver execution.

Instead, the context factory becomes the runtime entry point.

At execution time, the adapter extracts request-like metadata from the GraphQL runtime, normalizes it into a AmbitenRequestLike structure, initializes runtime scope through the adapter runtime, and establishes `AmbitenContext` before resolvers execute.

This ensures resolver execution follows the same runtime contract as every other Ambiten adapter.

## Execution flow

GraphQL execution follows a context-driven runtime path:

```PlainText
GraphQL Request
  ↓
Context Factory
  ↓
Adapter Runtime
  ↓
AmbitenContext
  ↓
Resolver
  ↓
MongoDB
```

<SignalFlow
  aria-label="GraphQL adapter execution flow"
  :items='["GraphQL Request", "Context Factory", "Adapter Runtime", "AmbitenContext", "Resolver", "MongoDB"]'
/>

The GraphQL runtime continues orchestrating resolver execution while the adapter ensures runtime scope exists consistently across the request lifecycle.

## Resolvers remain clean

Once the adapter is installed, resolvers no longer need to manage runtime infrastructure directly.

```ts
const resolvers = {
  Query: {
    users: async () => {
      return UserModel.find({});
    }
  },

  Mutation: {
    createUser: async (_parent, args) => {
      return UserModel.create(args.input);
    }
  }
};
```

Resolvers do not need to resolve tenant identity, initialize sessions, or propagate execution metadata manually.

Those responsibilities already exist inside the runtime boundary.

## Runtime behavior

With the GraphQL adapter in place, every operation creates a new execution scope automatically.

Tenant identity can be resolved from request metadata, AmbitenContext remains available across resolver execution, and model operations participate in the same request-aware lifecycle consistently.

Middleware, instrumentation, and transaction handling also execute inside that same runtime boundary, which keeps GraphQL behavior aligned with HTTP and serverless environments.

## Transaction-aware mutations

Mutations can participate in transactions exactly the same way as HTTP handlers.

```ts
import { AmbitenContext } from "@ambiten/core";

const resolvers = {
  Mutation: {
    createUser: async (_p, args) => {
      return AmbitenContext.withTransaction(async () => {
        const user = await UserModel.create(args.input);

        await AuditModel.create({
          action: "USER_CREATED",
          userId: user._id
        });

        return user;
      });
    }
  }
};
```

The active session propagates automatically through nested model operations without manual session handling.

## Why GraphQL integration is different

GraphQL execution is resolver-driven rather than middleware-driven.

In Express or Fastify, runtime scope can be established through request hooks or middleware chains. In GraphQL, the context factory is the only reliable execution boundary shared across resolvers.

That is why Ambiten integrates through context creation rather than transport-layer middleware.

The runtime model remains the same even though the execution lifecycle differs.

## When to use the GraphQL adapter

The GraphQL adapter is designed for resolver-driven applications that need runtime-aware execution without pushing infrastructure coordination into resolver code.

It is especially useful for systems that require tenant-aware execution, transaction-capable mutations, structured instrumentation, and operational consistency between GraphQL services and other Ambiten runtimes.

## Mental model

The GraphQL adapter should be viewed as a runtime scope initializer for resolver execution.

```sh
GraphQL Runtime → execution orchestration
Adapter         → runtime initialization
Context         → execution state
Resolvers       → application behavior
MongoDB         → persistence
```

Once execution enters the runtime, models and middleware behave the same way they do in every other supported adapter environment.

## Summary

The GraphQL adapter connects resolver execution to Ambiten’s runtime system.

It establishes execution scope through context factories, initializes AmbitenContext, enables tenant-aware and transaction-aware execution, and allows resolvers to remain focused on application behavior instead of infrastructure coordination.

## Related pages

- [Adapters Overview](/adapters/overview)
- [Usage Patterns](/adapters/usage-patterns)
- [AmbitenBootstrap](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
