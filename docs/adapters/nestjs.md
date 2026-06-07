# NestJS Adapter

The NestJS adapter integrates Ambiten through NestJS’s module and interceptor system rather than traditional middleware.

Instead of attaching runtime behavior directly to route handlers, the adapter establishes execution scope at the framework level so controllers, services, and providers execute inside a fully initialized `AmbitenContext`.

This allows Ambiten to align naturally with NestJS’s dependency injection model, modular architecture, and request lifecycle.

## Integration model

The adapter is installed through `AmbitenNestAdapterModule.forRoot(...)`.

```ts
import { Module } from "@nestjs/common";
import { AmbitenNestAdapterModule } from "@ambiten/nestjs";

@Module({
  imports: [
    AmbitenNestAdapterModule.forRoot({
      tenancy: {
        header: "x-tenant-id",
        fallback: "default"
      },
      enableTransactions: true
    })
  ]
})
export class AppModule {}
```

Once registered, the adapter becomes part of the application lifecycle and applies runtime-aware execution consistently across the application.

## How the adapter works

NestJS execution differs from middleware-driven frameworks because request orchestration happens through modules, providers, guards, pipes, and interceptors.

The Ambiten adapter integrates through a global interceptor that executes before controller logic runs.

Internally, the adapter normalizes the incoming request into a runtime-aware request shape, invokes the adapter runtime, initializes AmbitenContext, and then allows controller execution to continue inside the active runtime boundary.

This ensures services, models, middleware, instrumentation, and transactions all participate in the same request-aware execution scope automatically.

## Execution flow

The runtime lifecycle follows the same architectural path as other Ambiten adapters while adapting to NestJS’s execution model.

```PlainText
HTTP Request
  ↓
NestJS Interceptor
  ↓
Adapter Runtime
  ↓
AmbitenContext
  ↓
Controller
  ↓
Service
  ↓
MongoDB
```

<SignalFlow 
   aria-label="NestJS adapter execution flow" 
   :items='["HTTP Request", "NestJS Interceptor", "Adapter Runtime", "AmbitenContext", "Controller", "Service", "MongoDB"]'
/>

NestJS continues managing routing and dependency injection while Ambiten establishes runtime-aware execution boundaries around the request lifecycle.

## Service execution

Once the adapter is installed, services can execute model operations without manual infrastructure coordination.

```ts
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserService {
  async getUsers() {
    return UserModel.find({});
  }

  async createUser(data: any) {
    return UserModel.create(data);
  }
}
```

Services remain focused on application workflows rather than tenant resolution, session propagation, or runtime state management.

## CController execution

Controllers remain clean because runtime initialization already occurred before execution reached the controller layer.

```ts
import { Controller, Get, Post, Body } from "@nestjs/common";

@Controller("users")
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  getUsers() {
    return this.service.getUsers();
  }

  @Post()
  createUser(@Body() data: any) {
    return this.service.createUser(data);
  }
}
```

The controller does not need to manage tenant identity, transaction state, or request-scoped runtime configuration manually.

## Runtime behavior

With the adapter enabled, runtime scope is established before controller execution begins.

Tenant identity can be resolved automatically from request metadata, `AmbitenContext` remains available throughout services and model execution, and middleware and instrumentation behave consistently across the request lifecycle.

Because the runtime boundary exists above the controller and service layers, nested model operations inherit execution state automatically without requiring explicit propagation.


## Transaction-aware services

Services can participate in transactions through the same runtime-aware transaction model used everywhere else in Ambiten.

```ts
import { Injectable } from "@nestjs/common";
import { AmbitenContext } from "@ambiten/core";

@Injectable()
export class OrderService {
  async createOrder(data: any) {
    return AmbitenContext.withTransaction(async () => {
      const order = await OrderModel.create(data);

      await InventoryModel.updateOne(
        { _id: data.itemId },
        { $inc: { stock: -1 } }
      );

      return order;
    });
  }
}
```

The active session propagates automatically across nested model operations and service boundaries.

## Why NestJS integration is different

NestJS is designed around dependency injection and framework-managed execution pipelines rather than direct middleware composition.

Because of this, Ambiten integrates through:

```PlainText
Dynamic Module  → configuration
Global Interceptor → execution boundary
AmbitenContext → runtime state
Services & Models → application execution
```

This approach keeps runtime orchestration aligned with NestJS’s architectural model instead of forcing middleware-centric patterns into the framework.

## When to use the NestJS adapter

The NestJS adapter is designed for applications that rely on NestJS modules, providers, dependency injection, and layered service architecture.

It is especially useful when applications require tenant-aware execution, request-scoped transactions, structured instrumentation, and runtime consistency across services without introducing infrastructure logic into controllers or providers.

## Mental model

The NestJS adapter should be viewed as a framework-level runtime initializer.

```PlainText
NestJS → application lifecycle
Adapter → runtime initialization
Context → execution state
Services → application orchestration
MongoDB → persistence
```

Once execution enters the runtime boundary, models and middleware behave consistently across every supported Ambiten environment.

## Summary

The NestJS adapter connects NestJS’s execution pipeline to Ambiten’s runtime system.

It establishes runtime-aware execution through modules and interceptors, initializes `AmbitenContext` before controller execution begins, enables tenant-aware and transaction-aware workflows, and keeps controllers and services focused on application behavior instead of infrastructure coordination.

## Related pages

- [Adapters Overview](/adapters/overview)
- [Usage Patterns](/adapters/usage-patterns)
- [AmbitenBootstrap](/advanced/bootstrap-cli)
- [Context](/core/context)
- [Transactions](/core/transactions)
