---
title: NestJS Adapter
description: Connect NestJS request execution to AmbitenContext, tenant resolution, transactions, and multi-tenant runtime infrastructure.
---

# NestJS Adapter

The NestJS adapter connects NestJS's request execution pipeline to Ambiten's runtime model.

Unlike middleware-first frameworks, NestJS organizes request execution through modules, providers, guards, pipes, interceptors, controllers, and services.

Ambiten integrates with that lifecycle through a NestJS module and a global interceptor so downstream controller and service execution can run inside an active `AmbitenContext`.

```text
HTTP Request
      ↓
NestJS Execution Pipeline
      ↓
Ambiten Interceptor
      ↓
adapter-runtime
      ↓
AmbitenContext
      ↓
Controller
      ↓
Service
      ↓
AmbitenModel
      ↓
Tenant Database
```

The adapter does not replace NestJS's dependency injection or execution pipeline.

NestJS continues to own routing, providers, guards, pipes, interceptors, validation, exception handling, and application composition.

The Ambiten adapter owns the boundary between NestJS request execution and Ambiten's request-scoped runtime.

## Why the NestJS Adapter Exists

Ambiten separates runtime startup, request execution, tenant infrastructure, and persistence into distinct layers.

```text
AmbitenBootstrapFactory
→ prepares runtime infrastructure

NestJS Adapter
→ establishes request execution scope

AmbitenContext
→ carries request-scoped state

MultiTenantManager
→ manages tenant infrastructure

Controllers & Services
→ perform application orchestration

AmbitenModel
→ performs data operations

MongoDB
→ performs persistence
```

Without the adapter, controllers or services would need to create Ambiten execution context manually.

The NestJS adapter establishes that boundary at the framework level instead.

## Integration Model

The adapter is installed through `AmbitenNestAdapterModule.forRoot(...)`.

```ts
import {
  Module
} from "@nestjs/common";

import {
  AmbitenNestAdapterModule
} from "@ambiten/nestjs";

@Module({
  imports: [
    AmbitenNestAdapterModule.forRoot({
      tenancy: {
        header: "x-tenant-id"
      }
    })
  ]
})
export class AppModule {}
```

Once registered, the Ambiten interceptor becomes part of NestJS's request lifecycle.

Downstream execution can then participate in Ambiten's request-scoped runtime.

## Relationship with AmbitenBootstrapFactory

The NestJS adapter and `AmbitenBootstrapFactory` operate at different lifecycle stages.

```text
AmbitenBootstrapFactory
→ prepares process-level runtime infrastructure

NestJS Adapter
→ establishes request-level execution scope
```

A typical application lifecycle is:

```text
Process Starts
      ↓
AmbitenBootstrapFactory
      ↓
Runtime Ready
      ↓
NestJS Application
      ↓
AmbitenNestAdapterModule
      ↓
Application Starts Listening
      ↓
Requests Enter AmbitenContext
```

Bootstrap prepares the runtime.

NestJS integration connects request execution to it.

## How the Adapter Works

NestJS request handling is orchestrated through the framework's execution pipeline.

The Ambiten adapter participates through an interceptor.

Conceptually, the interceptor:

1. receives the NestJS `ExecutionContext`,
2. obtains the underlying request,
3. normalizes it into an Ambiten-compatible request shape,
4. resolves tenant identity,
5. validates tenancy when configured,
6. establishes `AmbitenContext`,
7. executes downstream controller and service work inside that runtime boundary.

The architecture is:

```text
NestJS ExecutionContext
      ↓
HTTP Request
      ↓
Ambiten Request Normalization
      ↓
adapter-runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Controller Execution
```

This keeps NestJS-specific request types outside Ambiten Core.

## Observable Execution Boundary

NestJS interceptors return RxJS Observables.

That creates an important integration requirement.

The Ambiten runtime boundary must cover the execution of the downstream Observable, not only the moment when `next.handle()` creates it.

Conceptually:

```text
Interceptor Called
      ↓
runWithAdapterContext(...)
      ↓
subscribe to next.handle()
      ↓
controller executes
      ↓
service executes
      ↓
async operations
      ↓
AmbitenContext remains active
```

This matters because `next.handle()` is typically a cold Observable.

Creating the Observable is not necessarily the same moment that controller execution occurs.

The NestJS adapter is therefore responsible for keeping the actual downstream execution within the Ambiten context boundary.

## Execution Flow

A normal request follows:

```text
HTTP Request
      ↓
NestJS
      ↓
Global Ambiten Interceptor
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Controller
      ↓
Service
      ↓
AmbitenModel
      ↓
MultiTenantManager
      ↓
Tenant Database
```

<SignalFlow
  aria-label="NestJS adapter execution flow"
  :items='[
    "HTTP Request",
    "NestJS Interceptor",
    "Adapter Runtime",
    "AmbitenContext",
    "Controller",
    "Service",
    "MongoDB"
  ]'
/>

NestJS continues to control the framework lifecycle.

Ambiten establishes the execution context used by application work.

## Controllers Remain Focused

Once the adapter is registered, controllers should not need to coordinate Ambiten runtime infrastructure manually.

```ts
import {
  Body,
  Controller,
  Get,
  Post
} from "@nestjs/common";

@Controller("users")
export class UserController {
  constructor(
    private readonly service:
      UserService
  ) {}

  @Get()
  getUsers() {
    return this.service
      .getUsers();
  }

  @Post()
  createUser(
    @Body() data: any
  ) {
    return this.service
      .createUser(data);
  }
}
```

The controller does not need to:

- create `AmbitenContext`,
- resolve tenant infrastructure,
- create tenant MongoDB clients,
- pass tenant headers into services,
- propagate request metadata manually.

Those concerns are handled through the surrounding runtime boundary.

## Service Execution

Services can remain independent from the transport layer.

```ts
import {
  Injectable
} from "@nestjs/common";

@Injectable()
export class UserService {
  async getUsers() {
    return UserModel.find({});
  }

  async createUser(
    data: any
  ) {
    return UserModel.create(
      data
    );
  }
}
```

The service does not need access to:

```text
Request
ExecutionContext
HTTP headers
NestJS interceptor state
```

just to determine which tenant owns the operation.

That identity is available through `AmbitenContext`.

## Tenant-Aware Execution

A common tenancy configuration resolves the tenant from an HTTP header.

```ts
AmbitenNestAdapterModule.forRoot({
  tenancy: {
    header: "x-tenant-id"
  }
});
```

A request may contain:

```http
POST /users
x-tenant-id: tenant5
```

The adapter resolves:

```ts
AmbitenContext.get().tenantId;
// "tenant5"
```

Conceptually:

```text
x-tenant-id: tenant5
        ↓
NestJS Interceptor
        ↓
TenantResolver
        ↓
tenant5
        ↓
AmbitenContext
tenantId = tenant5
        ↓
Controller
        ↓
Service
```

Downstream application code should normally use the resolved runtime identity:

```ts
const {
  tenantId
} = AmbitenContext.get();
```

rather than repeatedly reading the raw HTTP header.

## Tenant Resolution vs Tenant Infrastructure

The NestJS adapter identifies which tenant belongs to the request.

It does not manage that tenant's infrastructure.

```text
NestJS Adapter
→ Who is this request for?

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
deployment region
tenant metadata
```

Those concerns remain under `MultiTenantManager`.

## Tenant Validation

Resolved tenants can be validated before controller execution proceeds.

For example:

```ts
import {
  Module
} from "@nestjs/common";

import {
  MultiTenantManager
} from "@ambiten/core";

import {
  AmbitenNestAdapterModule
} from "@ambiten/nestjs";

@Module({
  imports: [
    AmbitenNestAdapterModule.forRoot({
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
    })
  ]
})
export class AppModule {}
```

The lifecycle becomes:

```text
Request
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
Controller
```

Validation may be asynchronous.

This allows tenant validation to work with dynamically discovered tenants as well as tenants registered during startup.

## Dynamic Tenants

The NestJS adapter does not need to know whether a tenant was registered during application startup.

For example:

```text
Request
x-tenant-id: tenant5
        ↓
NestJS Adapter
        ↓
tenantId = tenant5
        ↓
AmbitenContext
        ↓
Controller
        ↓
Service
        ↓
Model
```

If `tenant5` is not registered:

```text
MultiTenantManager
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

From the NestJS adapter's perspective, static and dynamic tenants are identical.

The adapter carries identity.

The runtime manages infrastructure.

## Custom Tenant Resolution

Tenant identity does not have to originate from `x-tenant-id`.

Applications can provide custom tenant resolution logic.

Conceptually:

```ts
AmbitenNestAdapterModule.forRoot({
  resolvers: {
    tenantId: async (req) => {
      return resolveTenantForRequest(
        req
      );
    }
  }
});
```

A custom resolver may derive tenancy from:

- authenticated identity,
- JWT claims,
- cookies,
- subdomains,
- route information,
- gateway metadata,
- custom request state.

The runtime contract remains:

```text
NestJS Request
      ↓
TenantResolver
      ↓
tenantId
      ↓
AmbitenContext
```

Controllers and services remain independent from the original resolution mechanism.

## Authentication and Guards

NestJS applications commonly use guards for authentication and authorization.

Tenant resolution may depend on identity established by those guards.

Conceptually:

```text
Request
   ↓
Authentication / Guard
   ↓
Authenticated Identity
   ↓
Tenant Resolution
   ↓
AmbitenContext
   ↓
Controller
```

If a custom tenant resolver depends on framework state populated earlier in the NestJS pipeline, make sure the required information is available when the Ambiten interceptor performs resolution.

Authentication and tenancy should remain conceptually separate.

```text
Authentication
→ Who is the caller?

Tenant Resolution
→ Which tenant is this execution for?

Authorization
→ May this caller act for this tenant?
```

## Security

A tenant identifier is not automatically proof of authorization.

For example:

```http
x-tenant-id: tenant5
```

may correctly identify a valid tenant while the authenticated caller is not permitted to access it.

A stronger lifecycle may look like:

```text
HTTP Request
      ↓
Authentication
      ↓
Authenticated Identity
      ↓
Tenant Resolution
      ↓
Tenant Authorization
      ↓
AmbitenContext
      ↓
Controller
```

Ambiten provides the execution and tenancy runtime.

Application security remains the responsibility of the application.

## Request Metadata

The adapter runtime can carry additional execution metadata alongside tenant identity.

Common context values include:

```text
tenantId
requestId
dbName
collectionName
debug state
logger metadata
custom metadata
```

For example:

```ts
AmbitenNestAdapterModule.forRoot({
  tenancy: {
    header: "x-tenant-id"
  },

  requestIdHeader:
    "x-request-id",

  dbNameHeader:
    "x-db-name",

  collectionNameHeader:
    "x-collection-name"
});
```

These values belong to the active request execution.

They should not be confused with process-level tenant configuration owned by `MultiTenantManager`.

## Async Context Propagation

NestJS service methods frequently cross asynchronous boundaries.

For example:

```ts
@Injectable()
export class UserService {
  async inspectContext() {
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
```

For a request belonging to `tenant5`:

```ts
{
  before: "tenant5",
  after: "tenant5"
}
```

The adapter's execution boundary should remain active throughout controller and service execution associated with that request.

## Services Do Not Need Request Injection for Tenant Identity

Without runtime context, an application may be tempted to pass request objects through service layers.

```text
Controller
   ↓ passes Request
Service
   ↓ passes Request
Repository
   ↓ reads tenant header
```

Ambiten allows:

```text
NestJS Interceptor
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

A service can access:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();
```

without becoming request-scoped merely to receive tenant identity.

This is especially useful in NestJS applications where unnecessary request-scoped providers can affect lifecycle complexity and performance.

## Singleton Providers and Request Context

NestJS services are commonly singleton providers.

Ambiten context does not require every service that accesses request state to become a NestJS request-scoped provider.

For example:

```ts
@Injectable()
export class AuditService {
  logOperation() {
    const {
      tenantId,
      requestId
    } = AmbitenContext.get();

    // ...
  }
}
```

The service instance may remain long-lived while `AmbitenContext` provides execution-specific state for the active request.

Conceptually:

```text
Singleton Service
      ↓
called by Request A
      ↓
AmbitenContext A

same Service
      ↓
called by Request B
      ↓
AmbitenContext B
```

Do not store tenant-specific request state directly on singleton provider instance fields.

Avoid:

```ts
@Injectable()
export class UserService {
  currentTenantId:
    string | undefined;
}
```

Request-specific state belongs in the execution context, not in shared provider instances.

## Models Use the Active Runtime Context

Controllers and services can perform ordinary model operations:

```ts
@Injectable()
export class UserService {
  async createUser(
    data: any
  ) {
    return UserModel.create(
      data
    );
  }
}
```

If the active request contains:

```ts
{
  tenantId: "tenant5"
}
```

the runtime can resolve:

```text
UserModel.create(...)
      ↓
AmbitenContext
tenantId = tenant5
      ↓
MultiTenantManager
      ↓
tenant5 client
      ↓
db_tenant5
```

Neither the controller nor service needs to manually select the database.

## Transactions

The NestJS adapter can establish transaction-aware request execution.

```ts
AmbitenNestAdapterModule.forRoot({
  tenancy: {
    header: "x-tenant-id"
  },

  enableTransactions: true
});
```

When enabled, downstream controller and service execution enters Ambiten through a transaction-aware request boundary.

Conceptually:

```text
HTTP Request
      ↓
NestJS Interceptor
      ↓
AmbitenContext
      ↓
Transaction Boundary
      ↓
Controller
      ↓
Service
      ↓
Model Operations
```

For example:

```ts
@Injectable()
export class OrderService {
  async createOrder(
    data: any
  ) {
    const order =
      await OrderModel.create(
        data
      );

    await InventoryModel.updateOne(
      {
        _id: data.itemId
      },
      {
        $inc: {
          stock: -1
        }
      }
    );

    return order;
  }
}
```

When request-wide transactions are enabled, the service already executes inside that transaction-aware boundary.

## Explicit Transaction Boundaries

Applications may instead leave automatic request transactions disabled and create explicit transaction scopes only where needed.

```ts
import {
  Injectable
} from "@nestjs/common";

import {
  AmbitenContext
} from "@ambiten/core";

@Injectable()
export class OrderService {
  async createOrder(
    data: any
  ) {
    return AmbitenContext
      .withTransaction(
        async () => {
          const order =
            await OrderModel.create(
              data
            );

          await InventoryModel
            .updateOne(
              {
                _id:
                  data.itemId
              },
              {
                $inc: {
                  stock: -1
                }
              }
            );

          return order;
        }
      );
  }
}
```

The distinction is:

```text
enableTransactions: true
→ request-wide transaction boundary

AmbitenContext.withTransaction(...)
→ explicit operation-specific transaction
```

Choose the strategy that matches the application's consistency requirements.

## Transaction Scope Should Be Intentional

Not every NestJS request should automatically require a transaction.

Use request-wide transactions when the entire request represents one atomic unit.

Use explicit transaction scopes when only a particular workflow requires atomic consistency.

```text
Request
   ↓
multiple dependent writes?
   │
   ├── yes → transaction may be appropriate
   │
   └── no  → ordinary execution may be sufficient
```

Avoid adding transaction cost without a consistency requirement.

## NestJS Dependency Injection

Ambiten does not replace NestJS dependency injection.

Providers continue to be constructed and managed by NestJS.

For example:

```ts
@Injectable()
export class UserService {
  constructor(
    private readonly audit:
      AuditService
  ) {}
}
```

The dependency graph remains under NestJS.

Ambiten provides the runtime state associated with the active execution.

```text
NestJS DI
→ manages application dependencies

AmbitenContext
→ manages execution-scoped runtime state
```

These systems complement one another.

## Request-Scoped Providers vs AmbitenContext

NestJS supports request-scoped providers, but not every service needs to become request-scoped simply because it needs the current tenant.

If the only request-specific information required is runtime state such as:

```text
tenantId
requestId
transaction session
```

that state can remain in `AmbitenContext`.

Request-scoped providers remain useful when the provider itself genuinely requires a per-request lifecycle.

The two mechanisms solve different problems.

## Guards, Pipes, and Interceptors

NestJS has multiple execution stages.

Conceptually:

```text
Request
   ↓
Middleware
   ↓
Guards
   ↓
Interceptors
   ↓
Pipes / Controller
   ↓
Service
```

Applications should consider where required tenant-resolution inputs become available.

For example, if authentication information is produced by a guard and tenant resolution depends on that information, integration order becomes part of the application's architecture.

The Ambiten adapter should have access to the data required by its configured resolver when it establishes runtime context.

## Exception Handling

NestJS exception filters remain responsible for framework-level error handling.

Tenant resolution or validation may fail before controller logic executes.

Conceptually:

```text
Request
   ↓
Ambiten Interceptor
   ↓
Tenant Resolution
   ├── unresolved
   ↓
Tenant Validation
   ├── invalid
   ↓
Controller
   ├── application error
   ↓
Model
   ├── database error
```

These failure classes can be mapped into NestJS exceptions or filters according to the application's API policy.

For tenant-required routes, unresolved tenancy should not silently fall back to an unrelated tenant database.

## Adapter Registration Is Application Infrastructure

The adapter module should normally be registered once in the application composition.

```ts
@Module({
  imports: [
    AmbitenNestAdapterModule.forRoot({
      tenancy: {
        header: "x-tenant-id"
      }
    })
  ]
})
export class AppModule {}
```

Conceptually:

```text
Application Bootstrap
      ↓
Register Ambiten Module
      ↓
Global Interceptor Active
      ↓
Request A → AmbitenContext A
Request B → AmbitenContext B
Request C → AmbitenContext C
```

The module and interceptor infrastructure are long-lived.

The contexts established for requests are isolated execution scopes.

## Runtime Shutdown

The NestJS adapter manages request execution boundaries.

Ambiten runtime infrastructure should still be shut down at the application lifecycle boundary.

For example:

```ts
async function shutdown() {
  await app.close();
  await runtime.shutdown();
}
```

Do not call:

```ts
runtime.shutdown();
```

inside individual controllers or services.

The runtime belongs to the application process rather than one request.

## ESM and CommonJS

NestJS applications can participate in Ambiten's ESM and CommonJS package boundaries.

Conceptually:

```text
ESM NestJS Application
      ↓
NestJS Adapter ESM
      ↓
adapter-runtime ESM
      ↓
Ambiten Core ESM
```

and:

```text
CommonJS NestJS Application
      ↓
NestJS Adapter CJS
      ↓
adapter-runtime CJS
      ↓
Ambiten Core CJS
```

This matters because request-scoped state must remain consistent across the adapter and Core boundary.

Use public package imports.

For example:

```ts
import {
  AmbitenContext
} from "@ambiten/core";
```

and the public NestJS adapter package.

Avoid internal build imports such as:

```text
@ambiten/core/dist/...
@ambiten/adapter-runtime/dist/...
```

Public exports allow the correct runtime entry to be selected for the application's module format.

## Testing NestJS Integration

A meaningful NestJS integration test should verify execution inside the real framework lifecycle.

For example:

```ts
@Injectable()
export class ContextService {
  async getTenant() {
    await Promise.resolve();

    return AmbitenContext
      .get()
      .tenantId;
  }
}
```

A controller may expose:

```ts
@Controller("context")
export class ContextController {
  constructor(
    private readonly service:
      ContextService
  ) {}

  @Get()
  getContext() {
    return this.service
      .getTenant();
  }
}
```

A request containing:

```http
GET /context
x-tenant-id: tenant5
```

should observe:

```text
tenant5
```

inside the service after the asynchronous boundary.

This verifies more than module registration.

It verifies:

```text
HTTP Request
      ↓
NestJS Interceptor
      ↓
Observable Execution
      ↓
AmbitenContext
      ↓
Controller
      ↓
Service
      ↓
async boundary
      ↓
tenant5 still available
```

For tenant-aware database integration, the test can also inspect:

```ts
const tenant =
  MultiTenantManager
    .getTenant("tenant5");
```

after a model operation.

## Why NestJS Integration Is Different

NestJS is designed around framework-managed execution and dependency injection.

Ambiten therefore integrates through:

```text
Dynamic Module
→ configuration

Global Interceptor
→ execution boundary

adapter-runtime
→ shared Ambiten request execution

AmbitenContext
→ runtime state

Controllers & Services
→ application logic

MultiTenantManager
→ tenant infrastructure
```

This approach follows NestJS's architectural model instead of forcing an Express-style middleware pattern into the framework.

## Why the Observable Boundary Matters

NestJS controller execution is exposed to interceptors through RxJS.

That means the runtime contract must account for two moments:

```text
Observable created
```

and:

```text
Observable subscribed / executed
```

Those moments are not necessarily equivalent.

For Ambiten, the important requirement is:

```text
Controller and service execution
must occur inside
the active AmbitenContext
```

A correct adapter therefore treats the Observable execution lifecycle as part of the request boundary.

This is the key NestJS-specific difference from middleware-oriented adapters.

## When to Use the NestJS Adapter

The NestJS adapter is appropriate for applications that rely on:

- NestJS modules,
- dependency injection,
- controllers,
- providers,
- layered service architecture,
- guards and interceptors,
- multi-tenant request execution,
- transaction-aware workflows,
- runtime context propagation.

It is especially useful when application services should remain independent from transport-specific request plumbing.

## Recommended Mental Model

Think of the NestJS adapter as a framework-level execution-boundary initializer.

```text
NestJS
→ owns application lifecycle and DI

NestJS Adapter
→ enters Ambiten runtime

TenantResolver
→ identifies tenant

AmbitenContext
→ carries execution state

Controllers
→ expose application operations

Services
→ orchestrate domain behavior

MultiTenantManager
→ resolves tenant resources

AmbitenModel
→ performs data operations

MongoDB
→ persists data
```

NestJS manages application composition.

Ambiten manages runtime execution state.

## Summary

The NestJS adapter connects NestJS's execution pipeline to Ambiten's runtime model.

It:

- integrates through a NestJS module and interceptor,
- normalizes incoming request information,
- resolves tenant identity,
- validates tenancy when configured,
- establishes `AmbitenContext`,
- preserves execution state through controller and service async flows,
- supports transaction-aware request execution,
- allows dynamic tenant discovery downstream,
- keeps singleton services free from shared request state,
- keeps tenant infrastructure outside controllers and providers.

The complete flow is:

```text
HTTP Request
      ↓
NestJS Execution Pipeline
      ↓
Ambiten Interceptor
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Controller
      ↓
Service
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