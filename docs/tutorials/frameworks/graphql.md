# GraphQL Framework Track

Ambiten integrates with GraphQL at the **execution boundary**.

The GraphQL adapter supports both:

- Apollo Server
- GraphQL Yoga

Both integrations preserve the same Ambiten execution model:

```text
GraphQL Request
      ↓
GraphQL Server
      ↓
Ambiten GraphQL Adapter
      ↓
Adapter Runtime
      ↓
AmbitenContext
      ↓
Resolvers
      ↓
Application Services
      ↓
AmbitenModel
      ↓
MongoDB
```

The GraphQL server may change.

The application execution model does not.

## Installation

Install Ambiten and the GraphQL adapter:

```bash
npm install \
  @ambiten/core \
  @ambiten/adapter-graphql
```

Then install the GraphQL server used by your application.

Apollo Server

```bash
npm install \
  @apollo/server \
  graphql
```

GraphQL Yoga

```bash
npm install \
  graphql-yoga \
  graphql
```

`@ambiten/adapter-graphql` does not require applications to use a particular GraphQL server internally.

The adapter exposes framework-facing integration points while the shared Ambiten adapter runtime owns execution context.

## Package version

This framework track targets:

```text
@ambiten/adapter-graphql@2.x
```

Version 2 introduces execution-scoped integrations for Apollo Server and GraphQL Yoga.

The primary APIs are:

```ts
createApolloAdapter()
createYogaAdapter()
```

Earlier context-factory APIs remain available for compatibility, but they should not be used as the primary execution integration.

## Shared application layer

The Apollo and Yoga examples use the same GraphQL schema, resolvers, and Ambiten models.

A useful project structure is:

```text
examples/
└── ambiten-tutorials/
    └── framework-tracks/
        └── graphql/
            ├── src/
            │   ├── shared/
            │   │   ├── type-defs.ts
            │   │   ├── resolvers.ts
            │   │   ├── runtime.ts
            │   │   └── user.model.ts
            │   │
            │   ├── apollo.ts
            │   └── yoga.ts
            │
            ├── package.json
            ├── tsconfig.json
            └── .env.example
```

The important separation is:

```text
shared/
→ GraphQL schema
→ resolvers
→ models
→ application logic

apollo.ts
→ Apollo ingress

yoga.ts
→ Yoga ingress
```

This allows the same application layer to run under either GraphQL server.

## Shared schema

```ts
// src/shared/type-defs.ts

export const typeDefs = `#graphql
  type User {
    _id: ID!
    name: String!
    email: String!
  }

  type RuntimeContext {
    tenantId: String
    requestId: String
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  type Query {
    users: [User!]!
    runtime: RuntimeContext!
  }

  type Mutation {
    createUser(
      input: CreateUserInput!
    ): User!
  }
`;
```

The runtime field is included only to make the execution boundary visible during development.

## Shared resolvers

```ts
// src/shared/resolvers.ts

import {
  AmbitenContext
} from "@ambiten/core";

import {
  UserModel
} from "./user.model";

export const resolvers = {
  Query: {
    users: async () => {
      return UserModel.find({});
    },

    runtime: () => {
      const ctx =
        AmbitenContext.get();

      return {
        tenantId:
          ctx.tenantId,

        requestId:
          ctx.requestId
      };
    }
  },

  Mutation: {
    createUser: async (
      _parent: unknown,
      args: {
        input: {
          name: string;
          email: string;
        };
      }
    ) => {
      return UserModel.create(
        args.input
      );
    }
  }
};
```

Notice what the resolvers do not receive manually:

```text
tenantId
dbName
ClientSession
requestId
```

The GraphQL adapter establishes the Ambiten execution boundary before resolver execution begins.

Runtime-aware model operations can therefore consume the active execution context without manually threading infrastructure state through resolver arguments.

##  Apollo Server

Apollo Server integrates through:

```ts
createApolloAdapter()
```

The adapter wraps Apollo-compatible GraphQL HTTP execution so the Ambiten runtime remains active while resolvers execute.

## Apollo setup

```ts
// src/apollo.ts

import {
  ApolloServer
} from "@apollo/server";

import {
  startStandaloneServer
} from "@apollo/server/standalone";

import {
  createApolloAdapter
} from "@ambiten/adapter-graphql";

import {
  MultiTenantManager
} from "@ambiten/core";

import {
  typeDefs
} from "./shared/type-defs";

import {
  resolvers
} from "./shared/resolvers";

import {
  initializeRuntime
} from "./shared/runtime";

await initializeRuntime();

const server =
  new ApolloServer({
    typeDefs,
    resolvers
  });

const adapter =
  createApolloAdapter();

adapter.install(
  server,
  {
    tenancy: {
      header: "x-tenant-id",

      validate:
        async (tenantId) => {
          const tenant =
            await MultiTenantManager.resolveTenant(tenantId);
            if (!tenant) {
              throw new Error(
              `Tenant with ID "${tenantId}" not found.`
            );
          }

          return true;
        }
    }
  }
);

const { url } =
  await startStandaloneServer(
    server,
    {
      listen: {
        port: 4000
      }
    }
  );

console.log(
  `Apollo ready at ${url}`
);
```

Application code only interacts with:

```ts
createApolloAdapter()
```

The adapter internally coordinates the GraphQL request with Ambiten's shared adapter runtime.

Application code does not need to use:

```text
runWithAdapterContext
AmbitenRequestLike
AsyncLocalStorage
adapter-runtime internals
```

## Apollo runtime flow

```text
HTTP Request
      ↓
Apollo Server
      ↓
createApolloAdapter()
      ↓
GraphQL execution boundary
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Resolvers
      ↓
Services
      ↓
AmbitenModel
      ↓
MongoDB
      ↓
GraphQL Response
```

The important boundary is the GraphQL operation itself.

Ambiten does not establish context only while the Apollo context object is being constructed.

The runtime remains active while application execution proceeds.

## GraphQL Yoga

GraphQL Yoga integrates through:

```ts
createYogaAdapter()
```

The Yoga adapter participates in Yoga's execution pipeline so queries, mutations, subscriptions, and streaming execution can enter the Ambiten runtime boundary.

## Yoga setup

```ts
// src/yoga.ts

import {
  createServer
} from "node:http";

import {
  createSchema,
  createYoga
} from "graphql-yoga";

import {
  createYogaAdapter
} from "@ambiten/adapter-graphql";

import {
  MultiTenantManager
} from "@ambiten/core";

import {
  typeDefs
} from "./shared/type-defs";

import {
  resolvers
} from "./shared/resolvers";

import {
  initializeRuntime
} from "./shared/runtime";

await initializeRuntime();

const ambiten =
  createYogaAdapter({
    tenancy: {
      header:"x-tenant-id",

      validate:
        async (tenantId) => {
          const tenant =
            await MultiTenantManager.resolveTenant(tenantId);
            if (!tenant) {
              throw new Error(
                `Tenant with ID "${tenantId}" not found.`
            );
          }

          return true;
        }
    }
  });

const yoga =
  createYoga({
    schema: createSchema({typeDefs,resolvers}),

    plugins: [
      ambiten
    ]
  });

const server = createServer(yoga);

server.listen(
  4001,
  () => {
    console.log(
      "Yoga ready at http://localhost:4001/graphql"
    );
  }
);
```


The application resolver layer remains unchanged.

## Yoga runtime flow

```text
HTTP Request
      ↓
GraphQL Yoga
      ↓
createYogaAdapter()
      ↓
Execute / Subscribe
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Resolvers
      ↓
Services
      ↓
AmbitenModel
      ↓
MongoDB
```

For streaming or subscription execution, Ambiten preserves the already-resolved execution identity when the iterator continues.

The original ingress tenant resolution is not treated as a new request for every emitted result.

## Run the examples

Apollo:

```bash
npm run dev:apollo
```

Yoga:

```bash
npm run dev:yoga
```

A project may expose scripts such as:

```json
{
  "scripts": {
    "dev:apollo": "tsx watch src/apollo.ts",
    "dev:yoga": "tsx watch src/yoga.ts"
  }
}
```

## Query runtime state

Run the same query against either server:

```GraphQL
query {
  runtime {
    tenantId
    requestId
  }

  users {
    _id
    name
    email
  }
}
```

Send:

```text
x-tenant-id: tenant-a
```

The result demonstrates that resolver execution is running inside the resolved Ambiten context.

## Create a user

```GraphQL
mutation {
  createUser(
    input: {
      name: "GraphQL User"
      email: "graphql@example.com"
    }
  ) {
    _id
    name
    email
  }
}
```

The resolver remains:

```ts
return UserModel.create(
  args.input
);
```

The tenant identity does not need to be forwarded manually.

## Application context still works

Ambiten does not replace normal GraphQL application context.

For example, Apollo may still define application-specific context:

```ts
await startStandaloneServer(
  server,
  {
    context:
      async ({ req }) => {
        return {
          user:
            await authenticate(
              req.headers
                .authorization
            )
        };
      }
  }
);
```

The Apollo adapter preserves that context while adding Ambiten execution information.

Conceptually:

```text
GraphQL context
→ authenticated user
→ DataLoaders
→ API clients
→ application services

AmbitenContext
→ tenantId
→ requestId
→ runtime metadata
→ execution infrastructure
→ transaction session when explicitly active
```

These concerns are related but not identical.

## Tenant resolution is not authorization

The GraphQL adapter may resolve tenant identity from:

```text
x-tenant-id
```

but tenant resolution does not prove that the caller is authorized to act for that tenant.

A complete application boundary remains:

```text
Authentication
      ↓
Who is the caller?

Authorization
      ↓
May this caller act for this tenant?

Tenant Resolution
      ↓
Which tenant execution is this for?

AmbitenContext
      ↓
Runtime execution
```

Applications should perform authentication and authorization according to their security architecture.

Ambiten then carries the validated execution identity through infrastructure-aware application work.

## Server-owned infrastructure

Tenant identity may originate at ingress.

Database and collection routing should normally remain server-owned.

Recommended:

```txet
Client
→ x-tenant-id

Server
→ tenant configuration
→ database resolution
→ collection/model configuration
```

Avoid treating client-supplied database or collection names as an authorization mechanism.

Tenant identity and tenant infrastructure remain separate concepts.

## Transactions

`@ambiten/adapter-graphql@2.x` does not enable automatic GraphQL-operation-wide transactions through:

```ts
enableTransactions: true
```

GraphQL can complete an execution while returning resolver failures in its result.

That means a generic operation-wide transaction boundary cannot safely infer:

```text
GraphQL result returned
=
transaction should commit
```

For GraphQL mutations, establish transactions explicitly around the workflow that requires atomicity.

Conceptually:


```text
Mutation Resolver
      ↓
Application Service
      ↓
Explicit Transaction Boundary
      ↓
Model A
      ↓
Model B
      ↓
Commit / Rollback
```

This keeps transaction ownership aligned with the actual business operation rather than the GraphQL transport.

## Context factories

Earlier versions exposed integrations centered around:

```ts
createApolloContextFactory()
createYogaContextFactory()
```

These APIs may remain available for compatibility, but they should not be used as the primary Ambiten integration.

Why?

Creating a GraphQL context object and executing GraphQL resolvers are different lifecycle stages.

A context factory can produce:

```ts
{
  tenantId: "tenant-a"
}
```

without guaranteeing that the active Ambiten runtime remains alive later when the resolver executes.

Version 2 solves this by integrating with actual GraphQL execution.

Prefer:

```ts
createApolloAdapter()
```

and:

```ts
createYogaAdapter()
```

for new applications.

## Framework-neutral adapter design

`@ambiten/adapter-graphql` intentionally avoids owning Apollo, Yoga, or GraphQL framework type hierarchies.

Internally the package uses small structural execution contracts and converts ingress data into Ambiten's framework-neutral request representation.

Conceptually:

```text
Apollo ─────┐
            │
Yoga ───────┤
            ↓
GraphQL request normalization
            ↓
AmbitenRequestLike
            ↓
Adapter Runtime
            ↓
AmbitenContext
```

This keeps Ambiten's execution architecture independent from framework release cycles while allowing applications to choose the GraphQL server appropriate for their environment.

## Apollo and Yoga share the same application

The two integrations differ only at ingress.

```text

                    GraphQL Operation
                           ↓
                 ┌─────────┴─────────┐
                 │                   │
           Apollo Server        GraphQL Yoga
                 │                   │
                 ↓                   ↓
        createApolloAdapter   createYogaAdapter
                 │                   │
                 └─────────┬─────────┘
                           ↓
                     Adapter Runtime
                           ↓
                     AmbitenContext
                           ↓
                        Resolvers
                           ↓
                        Services
                           ↓
                      AmbitenModel
                           ↓
                         MongoDB
```

That is the main lesson of this framework track.

Apollo and Yoga provide different GraphQL server environments.

Ambiten provides the same execution model underneath both.

## What just happened

The GraphQL server received an operation.

The Ambiten GraphQL adapter converted that framework-specific execution into an Ambiten execution boundary.

Tenant identity and execution metadata were resolved once at ingress.

`AmbitenContext` remained active while resolvers, nested asynchronous calls, services, and models executed.

The model layer then resolved the effective model context and tenant-aware infrastructure before MongoDB performed the operation.

At no point did application resolvers need to manually propagate the tenant through every function call.

## Runtime flow

```text
GraphQL Request
      ↓
Apollo Server / GraphQL Yoga
      ↓
Ambiten GraphQL Adapter
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Resolver
      ↓
Application Service
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Tenant Infrastructure Resolution
      ↓
MongoDB
      ↓
GraphQL Result
```

## Checkpoint

At this point you have used Ambiten with:

```text
Apollo Server                    ✓
GraphQL Yoga                     ✓
Execution-scoped context         ✓
Tenant resolution                ✓
Tenant validation                ✓
Async resolver propagation       ✓
Shared resolver layer            ✓
Shared model layer               ✓
Concurrent execution isolation   ✓
Streaming continuation support   ✓
Explicit transaction ownership   ✓
```

The GraphQL server controls GraphQL execution.

Ambiten controls runtime consistency inside that execution boundary.

Return to [Framework Tracks](/tutorials/frameworks/), compare the [NestJS boundary](/tutorials/frameworks/nestjs), or revisit [Transaction Continuity](/tutorials/08-transaction-continuity) 