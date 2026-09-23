---
title: Lambda Adapter
description: Connect AWS Lambda invocation execution to AmbitenContext, tenant resolution, transactions, and multi-tenant runtime infrastructure.
---

# Lambda Adapter

The Lambda adapter connects AWS Lambda invocation execution to Ambiten's runtime model.

Unlike Express or Fastify, Lambda does not provide a long-lived request middleware chain.

The function handler itself is the execution boundary.

Ambiten therefore integrates by wrapping the Lambda handler so every invocation enters a fresh `AmbitenContext` before application logic executes.

```text
Lambda Event
      ↓
Lambda Adapter
      ↓
adapter-runtime
      ↓
AmbitenContext
      ↓
Handler
      ↓
AmbitenModel
      ↓
Tenant Database
```

This allows Lambda applications to use the same context-aware runtime model as other Ambiten environments while respecting Lambda's invocation lifecycle.

## Runtime Responsibility Model

The Lambda adapter participates in the same Ambiten architecture as other execution environments.

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

Lambda Adapter
→ establishes invocation execution scope

AmbitenContext
→ carries invocation-scoped state

MultiTenantManager
→ manages tenant infrastructure

AmbitenModel
→ performs data operations

MongoDB
→ performs persistence
```

The important distinction in Lambda is that execution scope and process infrastructure have different lifetimes.

```text
Invocation
→ short-lived execution context

Lambda execution environment
→ may survive across multiple warm invocations
```

Ambiten uses those two lifetimes differently.

## Integration Model

Wrap the Lambda handler with `createLambdaAdapter(...)`.

```ts
import {
  createLambdaAdapter
} from "@ambiten/adapter-lambda";

export const handler =
  createLambdaAdapter(
    async (event) => {
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
        header: "x-tenant-id"
      }
    }
  );
```

The wrapper normalizes the invocation, establishes Ambiten's execution context, and then executes the original handler inside that boundary.

Conceptually:

```text
AWS invokes function
      ↓
Ambiten Lambda Adapter
      ↓
normalize invocation
      ↓
resolve runtime context
      ↓
AmbitenContext
      ↓
application handler
```

## Bootstrap Before Invocation Execution

The Lambda adapter establishes execution scope.

It does not replace Ambiten runtime initialization.

Runtime infrastructure should normally be prepared outside the invocation-specific handler path so the Lambda execution environment can reuse it when AWS keeps the environment warm.

For example:

```ts
import {
  AmbitenBootstrapFactory
} from "@ambiten/core";

import {
  createLambdaAdapter
} from "@ambiten/adapter-lambda";

const runtime =
  await AmbitenBootstrapFactory.create();

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
        header: "x-tenant-id"
      }
    }
  );
```

Conceptually:

```text
COLD START
──────────
Lambda execution environment created
        ↓
AmbitenBootstrapFactory.create()
        ↓
runtime infrastructure ready
        ↓
handler exported


INVOCATION
──────────
Lambda event
        ↓
Lambda Adapter
        ↓
new AmbitenContext
        ↓
handler execution
```

If the execution environment remains warm, the initialized runtime may be reused by later invocations.

The invocation context is still recreated for each execution.

## Cold Starts and Warm Invocations

AWS Lambda may create a new execution environment or reuse an existing one.

This creates two different lifecycle concerns.

### Cold Start

During a cold start:

```text
new Lambda environment
      ↓
load module
      ↓
initialize Ambiten runtime
      ↓
prepare database infrastructure
      ↓
handler becomes ready
```

### Warm Invocation

During a warm invocation:

```text
existing Lambda environment
      ↓
reuse initialized runtime
      ↓
new Lambda event
      ↓
new AmbitenContext
      ↓
execute handler
```

The rule is:

```text
Reuse infrastructure where appropriate.

Never reuse invocation context.
```

This separation allows Ambiten to benefit from connection reuse without allowing request-scoped state to leak between Lambda invocations.

## How the Adapter Works

The Lambda adapter wraps the invocation boundary and delegates shared runtime behavior to Ambiten's adapter runtime.

For HTTP-style Lambda events, the adapter can normalize request information such as:

```text
headers
method
path
cookies
request metadata
```

into the request representation understood by the shared adapter runtime.

Conceptually:

```text
Lambda Event
      ↓
@ambiten/adapter-lambda
      ↓
AmbitenRequestLike
      ↓
adapter-runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Handler
```

This keeps AWS-specific event handling outside Ambiten Core.

## Execution Flow

A typical Lambda invocation follows:

```text
Lambda Event
      ↓
Adapter Wrapper
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Handler
      ↓
AmbitenModel
      ↓
MultiTenantManager
      ↓
Tenant Database
```

<SignalFlow
  aria-label="Lambda adapter execution flow"
  :items='[
    "Lambda Event",
    "Adapter Wrapper",
    "Adapter Runtime",
    "AmbitenContext",
    "Handler",
    "MongoDB"
  ]'
/>

The hosting environment changes.

The Ambiten execution model remains consistent.

## Handler Execution

Once wrapped by the adapter, handlers can execute model operations without manually constructing runtime context.

```ts
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
    }
  );
```

The handler does not need to manually:

- create `AmbitenContext`,
- resolve request tenant identity repeatedly,
- select tenant databases,
- create MongoDB clients,
- propagate runtime metadata through services.

Those concerns are handled through Ambiten's runtime boundary.

## Invocation-Scoped Context

Every invocation receives its own Ambiten execution scope.

For example:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();
```

refers only to the active invocation.

Conceptually:

```text
Invocation A
→ AmbitenContext A

Invocation B
→ AmbitenContext B

Invocation C
→ AmbitenContext C
```

Even when the same warm Lambda execution environment processes multiple invocations:

```text
same process
≠
same execution context
```

This is essential for tenant isolation and request correctness.

## Async Context Propagation

The invocation context remains available through asynchronous work that belongs to the active handler execution.

For example:

```ts
export const handler =
  createLambdaAdapter(
    async () => {
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
        statusCode: 200,
        body: JSON.stringify({
          before,
          after
        })
      };
    }
  );
```

For an invocation belonging to `tenant5`:

```json
{
  "before": "tenant5",
  "after": "tenant5"
}
```

Application services do not need to manually pass tenant identity through every async call.

## Tenant-Aware Lambda Execution

For an HTTP-style Lambda invocation, tenant identity may be supplied through:

```http
x-tenant-id: tenant5
```

The adapter can resolve:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

Conceptually:

```text
Lambda Event
x-tenant-id: tenant5
        ↓
Lambda Adapter
        ↓
TenantResolver
        ↓
tenant5
        ↓
AmbitenContext
tenantId = tenant5
```

The handler can then perform:

```ts
await UserModel.find({});
```

without manually selecting the tenant database.

## Tenant Resolution vs Tenant Infrastructure

The Lambda adapter determines which tenant belongs to the invocation.

It does not manage tenant infrastructure.

```text
Lambda Adapter
→ Who is this invocation for?

AmbitenContext
→ Which tenant belongs to this execution?

MultiTenantManager
→ What resources belong to that tenant?
```

The adapter may resolve:

```text
tenant5
```

without knowing:

```text
MongoDB URI
database name
connection state
region
tenant metadata
```

Those concerns remain under `MultiTenantManager`.

## Tenant Validation

Resolved tenant identity can be validated before the wrapped handler executes.

For example:

```ts
import {
  MultiTenantManager
} from "@ambiten/core";

export const handler =
  createLambdaAdapter(
    async () => {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true
        })
      };
    },

    {
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
    }
  );
```

The execution path becomes:

```text
Invocation
   ↓
Resolve tenantId
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
 ↓
Handler
```

Validation may be asynchronous.

## Dynamic Tenants

Lambda applications can also use dynamically discovered tenants.

Suppose the invocation resolves:

```text
tenant5
```

but the tenant is not currently registered.

The runtime may follow:

```text
Handler
   ↓
UserModel.find(...)
   ↓
AmbitenContext
tenantId = tenant5
   ↓
MultiTenantManager
   ↓
tenant5 registered?
      ↓ no
TenantConfigResolver
      ↓
external tenant lookup
      ↓
register tenant5
      ↓
getClient()
      ↓
db_tenant5
```

The Lambda adapter does not need to know whether the tenant was configured during cold start or discovered during a later invocation.

It only carries the tenant identity into the runtime.

## Dynamic Tenants Across Warm Invocations

A dynamically discovered tenant may become part of the `MultiTenantManager` registry for the lifetime of the current Lambda execution environment.

Conceptually:

```text
Cold Start
   ↓
tenant1 registered
tenant2 registered

Invocation A
   ↓
tenant5 discovered
   ↓
tenant5 registered

Warm Invocation B
   ↓
tenant5 already available
```

However, Lambda execution environments are disposable.

A future cold start creates a new process and therefore a new in-memory runtime registry.

Dynamic tenant configuration should consequently be backed by a durable source when tenants need to be rediscovered.

For example:

```text
tenant registry service
control database
configuration service
account database
```

Do not treat the in-memory Lambda runtime registry as permanent tenant storage.

## Custom Tenant Resolution

Tenant identity does not have to originate from a fixed HTTP header.

Applications can use custom resolution when the invocation model requires it.

Conceptually:

```ts
{
  resolvers: {
    tenantId: async (req) => {
      return resolveTenantForInvocation(
        req
      );
    }
  }
}
```

Tenant identity may be derived from request metadata such as:

```text
headers
authentication claims
gateway metadata
path information
custom invocation metadata
```

The resulting contract remains:

```text
Invocation
   ↓
TenantResolver
   ↓
tenantId
   ↓
AmbitenContext
```

Downstream application code remains independent from the mechanism used to identify the tenant.

## Transaction-Aware Execution

Lambda handlers can use Ambiten transactions like other execution environments.

For explicit transaction boundaries:

```ts
import {
  AmbitenContext
} from "@ambiten/core";

export const handler =
  createLambdaAdapter(
    async () => {
      return AmbitenContext
        .withTransaction(
          async () => {
            const user =
              await UserModel.create({
                name: "Alice"
              });

            await AuditModel.create({
              action:
                "USER_CREATED",

              userId:
                user._id
            });

            return {
              statusCode: 200,
              body: JSON.stringify(
                user
              )
            };
          }
        );
    }
  );
```

The active transaction session propagates through nested model operations executed inside the transaction boundary.

```text
Invocation
   ↓
AmbitenContext
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

## Request-Wide Transactions

If the Lambda adapter exposes the shared transaction option for the invocation boundary, request-wide transaction behavior can be configured through the adapter rather than manually nesting another invocation-level transaction.

Conceptually:

```ts
createLambdaAdapter(
  handler,
  {
    enableTransactions: true
  }
);
```

The execution becomes:

```text
Invocation
   ↓
Lambda Adapter
   ↓
AmbitenContext
   ↓
Transaction Boundary
   ↓
Handler
```

Use request-wide transactions only when the entire invocation should represent one atomic transactional unit.

For operation-specific consistency, an explicit:

```ts
AmbitenContext.withTransaction(...)
```

boundary may be more appropriate.

## Transaction Scope Should Be Intentional

Serverless execution does not make every invocation transactional by default.

Use transactions when multiple database operations must succeed or fail together.

```text
Invocation
   ↓
multiple dependent writes?
   │
   ├── yes → transaction may be appropriate
   │
   └── no  → ordinary execution may be sufficient
```

Transactions should reflect application consistency requirements.

## Infrastructure Reuse

Warm Lambda environments can reuse process-level infrastructure.

This is generally desirable for resources such as:

```text
MongoDB clients
tenant clients
runtime configuration
logging infrastructure
resolved tenant registry
```

Avoid creating a new MongoDB client solely because a new invocation has started.

Conceptually:

```text
BAD

Invocation A
→ new MongoClient
→ query
→ disconnect

Invocation B
→ new MongoClient
→ query
→ disconnect
```

Prefer managed runtime infrastructure:

```text
Lambda execution environment
        ↓
Ambiten runtime
        ↓
managed MongoDB clients
        ↓
Invocation A
Invocation B
Invocation C
```

Each invocation still receives a separate `AmbitenContext`.

## Context Isolation and Infrastructure Reuse

The correct serverless model is:

```text
REUSABLE
────────
Ambiten runtime
MongoDB clients
tenant registry
logger infrastructure


PER INVOCATION
──────────────
AmbitenContext
tenantId
requestId
transaction state
invocation metadata
```

These lifetimes should not be confused.

Reusing a MongoDB connection is desirable.

Reusing a previous invocation's tenant context is not.

## Do Not Store Invocation Identity in Process Globals

Avoid patterns such as:

```ts
let currentTenantId:
  string | undefined;

export async function handler(
  event
) {
  currentTenantId =
    event.headers[
      "x-tenant-id"
    ];

  // ...
}
```

Process globals may survive across warm invocations and are not an appropriate execution-isolation mechanism.

Use:

```ts
AmbitenContext.get().tenantId
```

inside the active Ambiten invocation boundary.

## Request Identity vs User Identity

Tenant identity and authenticated user identity are separate concerns.

For example:

```text
tenantId = tenant5
```

may identify the tenant while an authorization mechanism separately identifies:

```text
userId = usr_2481
```

Applications may operate with both:

```ts
{
  tenantId: "tenant5",
  userId: "usr_2481"
}
```

The Lambda adapter establishes the Ambiten execution boundary.

Authentication and authorization remain application responsibilities.

## Security

A client-supplied tenant header should not automatically grant access to that tenant.

For HTTP-facing Lambda functions:

```http
x-tenant-id: tenant5
```

may correctly identify an existing tenant while the caller remains unauthorized.

A secure flow may look like:

```text
API Gateway / Lambda Event
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
Handler
```

Tenant existence and tenant authorization are separate concerns.

## Lambda Context vs AmbitenContext

AWS Lambda also exposes a Lambda runtime context object.

That should not be confused with `AmbitenContext`.

```text
AWS Lambda Context
→ function/invocation environment information

AmbitenContext
→ Ambiten execution state
```

AWS context may contain information such as:

```text
request ID
function name
remaining execution time
runtime metadata
```

Ambiten context may contain:

```text
tenantId
requestId
transaction state
logger metadata
runtime metadata
```

Applications may use both when appropriate.

They represent different layers of execution.

## Request IDs

Where appropriate, Lambda invocation metadata can contribute to request correlation.

Conceptually:

```text
AWS invocation identifier
      ↓
request/correlation metadata
      ↓
AmbitenContext
      ↓
logs and operations
```

This can make serverless execution easier to trace across:

```text
Lambda
API Gateway
services
MongoDB
logs
```

without coupling model code directly to AWS APIs.

## Error Handling

Failures can occur at several points:

```text
Lambda Event
      ↓
Tenant Resolution
      ├── unresolved tenant
      ↓
Tenant Validation
      ├── invalid tenant
      ↓
Handler
      ├── application error
      ↓
Model
      ├── database error
```

The surrounding Lambda integration should map these failures into the response or invocation semantics appropriate for the trigger.

Ambiten does not require all failure types to collapse into one generic runtime error.

## HTTP and Event-Driven Lambda Functions

The Lambda adapter normalizes invocation execution into Ambiten's runtime boundary.

For HTTP-oriented Lambda functions, request-like information can naturally provide:

```text
headers
method
path
cookies
tenant identity
```

For non-HTTP event-driven workloads, tenant identity may need to come from event-specific application metadata rather than an HTTP header.

The important architectural rule remains:

```text
external invocation data
      ↓
resolve tenant identity
      ↓
AmbitenContext
      ↓
application execution
```

When using non-HTTP events, ensure the selected Lambda adapter configuration and resolver support the event shape your application provides.

## Detached Work

Lambda handlers should avoid assuming asynchronous work can safely continue after the invocation has completed.

For work that must outlive the invocation, prefer an external execution boundary such as:

```text
SQS
SNS
EventBridge
another Lambda
workflow system
```

Propagate the identity needed by the next execution:

```text
tenantId
requestId
correlation metadata
```

The receiving worker can then establish a new Ambiten execution context.

Conceptually:

```text
Lambda A
AmbitenContext
      ↓
publish message
tenantId = tenant5
      ↓
Lambda B
      ↓
new AmbitenContext
tenantId = tenant5
```

Do not depend on in-memory context surviving across Lambda invocations.

## Relationship with AmbitenBootstrapFactory

`AmbitenBootstrapFactory` and the Lambda adapter operate at different lifecycle levels.

```text
AmbitenBootstrapFactory
→ prepares execution-environment infrastructure

Lambda Adapter
→ establishes per-invocation execution
```

Conceptually:

```text
Lambda execution environment
      ↓
AmbitenBootstrapFactory
      ↓
Runtime Ready
      ↓
Invocation A
      ↓
Lambda Adapter
      ↓
AmbitenContext A

Invocation B
      ↓
Lambda Adapter
      ↓
AmbitenContext B
```

The factory initializes infrastructure.

The adapter creates execution isolation for each invocation.

## Runtime Shutdown

Lambda differs from long-running servers because process termination is controlled by the platform.

Applications should not normally call:

```ts
await runtime.shutdown();
```

at the end of every invocation.

Doing so would defeat infrastructure reuse across warm invocations.

Avoid:

```ts
export const handler =
  createLambdaAdapter(
    async () => {
      const result =
        await UserModel.find({});

      await runtime.shutdown();

      return result;
    }
  );
```

For Lambda, managed infrastructure should generally remain available for the lifetime of the execution environment.

The platform may terminate that environment when it is no longer required.

## ESM and CommonJS

Lambda applications can participate in Ambiten's ESM or CommonJS package boundaries.

For ESM:

```text
ESM Lambda Application
      ↓
Lambda Adapter ESM
      ↓
adapter-runtime ESM
      ↓
Ambiten Core ESM
```

For CommonJS:

```text
CommonJS Lambda Application
      ↓
Lambda Adapter CJS
      ↓
adapter-runtime CJS
      ↓
Ambiten Core CJS
```

This matters because request-scoped runtime state must remain consistent across the adapter and Core boundary.

Applications should use public package imports.

Prefer:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

and the public Lambda adapter package.

Avoid internal build paths such as:

```text
@ambiten/core/dist/...
@ambiten/adapter-runtime/dist/...
```

## Testing Lambda Integration

A meaningful Lambda integration test should verify invocation isolation and context propagation.

For example:

```ts
export const handler =
  createLambdaAdapter(
    async () => {
      await Promise.resolve();

      return {
        tenantId:
          AmbitenContext
            .get()
            .tenantId
      };
    },

    {
      tenancy: {
        header: "x-tenant-id"
      }
    }
  );
```

An invocation containing:

```http
x-tenant-id: tenant5
```

should execute with:

```ts
{
  tenantId: "tenant5"
}
```

A second invocation for another tenant should observe its own context:

```text
Invocation A
→ tenant5

Invocation B
→ tenant7
```

without tenant state leaking between them.

For multi-tenant database integration, also verify the manager state when appropriate:

```ts
const tenant =
  MultiTenantManager
    .getTenant("tenant5");
```

After database access, the tenant may report:

```ts
{
  tenantId: "tenant5",
  dbName: "db_tenant5",
  connected: true,
  lazy: false
}
```

This validates the complete path:

```text
Lambda Event
      ↓
Adapter
      ↓
AmbitenContext
      ↓
Handler
      ↓
Model
      ↓
MultiTenantManager
      ↓
Tenant Database
```

## Why Lambda Integration Matters

Serverless systems often accumulate repeated infrastructure code around:

```text
tenant resolution
request correlation
runtime metadata
transactions
database routing
observability
```

The Lambda adapter centralizes the execution-boundary concerns so handlers remain focused on application behavior.

This becomes especially useful when a platform combines:

```text
HTTP APIs
Lambda functions
queues
scheduled execution
workers
traditional services
```

while expecting the same Ambiten execution model across them.

## When to Use the Lambda Adapter

The Lambda adapter is appropriate for AWS Lambda workloads that require:

- tenant-aware execution,
- context propagation,
- transaction-aware database operations,
- dynamic tenant resolution,
- reusable runtime infrastructure,
- consistent behavior with other Ambiten environments.

It is especially useful when Lambda functions participate in a larger platform that also uses Ambiten in long-running services.

## Recommended Mental Model

Think of the Lambda adapter as a per-invocation runtime boundary.

```text
AWS Lambda
→ owns execution environment and invocation

AmbitenBootstrapFactory
→ prepares reusable runtime infrastructure

Lambda Adapter
→ establishes invocation scope

TenantResolver
→ identifies tenant

AmbitenContext
→ carries invocation state

MultiTenantManager
→ resolves tenant infrastructure

AmbitenModel
→ performs data operations

MongoDB
→ persists data
```

The key serverless distinction is:

```text
Runtime infrastructure may survive a warm invocation.

AmbitenContext must belong only to the current invocation.
```

## Summary

The Lambda adapter connects AWS Lambda invocation execution to Ambiten's runtime system.

It:

- wraps the Lambda handler as the execution boundary,
- normalizes invocation metadata,
- resolves tenant identity,
- validates tenancy when configured,
- establishes a fresh `AmbitenContext` for every invocation,
- preserves context across asynchronous handler execution,
- supports transaction-aware operations,
- allows dynamic tenant discovery,
- keeps tenant infrastructure separate from invocation identity,
- allows managed database resources to be reused across warm executions.

The complete runtime flow is:

```text
Lambda Execution Environment
      ↓
Ambiten Runtime
      ↓
Lambda Event
      ↓
Lambda Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Handler / Service
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
