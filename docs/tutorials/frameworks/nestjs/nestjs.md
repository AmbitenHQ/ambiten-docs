# NestJS Framework Track

Integrate Ambiten with NestJS without moving runtime infrastructure into controllers or services.

NestJS structures applications differently from middleware-first frameworks such as Express. Controllers handle transport, services coordinate application behavior, and providers participate through dependency injection. Guards, pipes, interceptors, and modules shape the request lifecycle.

Ambiten does not replace those concepts. Its NestJS adapter establishes an execution boundary for downstream controller and service work:

```text
HTTP Request
      ↓
NestJS
      ↓
Ambiten Global Interceptor
      ↓
Adapter Runtime
      ↓
AmbitenContext
      ↓
Controller
      ↓
Service
      ↓
AmbitenModel
      ↓
MongoDB
```

The model and database steps are the destination of this track. This first page proves the boundary through controllers and services without connecting to MongoDB.

The framework changes. The Ambiten execution contract does not.

## Four compact pages

This track adapts the Workspace API from the [core learning path](/tutorials/) to NestJS rather than repeating Tutorials 01–12.

1. **NestJS Overview & Runtime Boundary** — this page, with a runnable checkpoint.
2. [Tenant-Aware Services and Models](/tutorials/frameworks/nestjs/tenant-aware-services) — planned.
3. [Transaction Continuity Across Services](/tutorials/frameworks/nestjs/transaction-continuity) — planned.
4. [Middleware, Instrumentation & Production Structure](/tutorials/frameworks/nestjs/middleware-instrumentation-production) — planned.

Across the track, we will cover module integration, context propagation, tenant-aware service execution, models, transactions, middleware reuse, instrumentation, and application lifetime. This page deliberately introduces neither a model nor `enableTransactions: true`.

## Prerequisites

Use Node.js 22.13 or newer and npm. The runnable checkpoint uses NestJS 11, RxJS 7, `@ambiten/core` 1.2.4, and `@ambiten/adapter-nestjs` 1.0.2. MongoDB is needed on the next page, not for these context probes.

Be familiar with NestJS modules, controllers, providers, dependency injection, and interceptors. This is not a NestJS introduction. The [NestJS first-steps guide](https://docs.nestjs.com/first-steps) covers the framework setup.

From the Ambiten tutorials, understand [execution context](/tutorials/05-execution-context), [tenant infrastructure](/tutorials/07-tenant-infrastructure-resolution), [transactions](/tutorials/08-transaction-continuity), [middleware](/tutorials/09-middleware-and-lifecycle), and [instrumentation](/tutorials/10-instrumentation).

## Run the checkpoint

The complete application lives in the docs repository at:

```text
examples/ambiten-tutorial/framework-tracks/nestjs/
```

It is separate from the numbered core checkpoints and from the [Document-to-PDF SaaS tutorial](/tutorials/pdf-saas). See the [checkpoint source](https://github.com/AmbitenHQ/ambiten-docs/tree/main/examples/ambiten-tutorial/framework-tracks/nestjs).

From the repository root:

```sh
cd examples/ambiten-tutorial/framework-tracks/nestjs
npm ci
```

Copy `.env.example` to `.env`. In PowerShell:

```powershell
Copy-Item .env.example .env
```

Or in a POSIX shell:

```sh
cp .env.example .env
```

The file contains only the HTTP binding:

```dotenv
HOST=127.0.0.1
PORT=3000
```

Both values have the same defaults if `.env` is absent. No database credentials or tenant registry are required yet.

Start the application:

```sh
npm run typecheck
npm run start:dev
```

To build and run compiled JavaScript instead:

```sh
npm run build
npm start
```

Stop the server with Ctrl+C. The entry point enables NestJS shutdown hooks.

## Start a separate application from scratch

If following the page outside this repository, use the Nest CLI without installing it globally:

```sh
npx @nestjs/cli@11 new ambiten-nestjs-track --package-manager npm --skip-git
cd ambiten-nestjs-track
npm install @ambiten/core@1.2.4 @ambiten/adapter-nestjs@1.0.2 mongodb@^6.21.0 dotenv
```

Use the files described below in place of the generated demo controller and service. The checkpoint's `package.json`, `nest-cli.json`, and lockfile provide the reproducible setup if you prefer not to scaffold separately.

::: tip Compile decorator metadata
This checkpoint compiles to CommonJS using the local Nest CLI. Its `tsconfig.json` enables `experimentalDecorators` and `emitDecoratorMetadata`; Nest needs that constructor metadata to inject `UsersService`. Do not substitute a TypeScript runner that omits decorator metadata and assume dependency injection will behave identically.
:::

The checkpoint's TypeScript configuration is:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmitOnError": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

## Current structure and the next step

The first checkpoint is fully initialized:

```text
nestjs/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── context/
│   │   └── context.controller.ts
│   └── users/
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
├── test/
│   └── runtime.test.cjs
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

The next page will add `src/core/db.ts`, `src/core/tenancy.ts`, and `src/models/user.model.ts`. Their absence here is intentional: the first checkpoint tests execution context, not persistence.

NestJS owns application composition. Ambiten owns execution coordination. Neither requires a NestJS-specific redesign of the model layer.

## Where the execution boundary begins

Express commonly enters Ambiten through middleware. Fastify uses lifecycle integration. NestJS has a broader pipeline:

```text
Request → Middleware → Guards → Interceptors → Pipes → Controller → Service
```

The Ambiten module supplies adapter configuration and installs a global interceptor. That interceptor enters the shared runtime before downstream controller logic runs. See Nest's [request lifecycle](https://docs.nestjs.com/faq/request-lifecycle) and [interceptor documentation](https://docs.nestjs.com/interceptors) for the framework ordering.

Guards run before interceptors, so a guard must not assume this interceptor has already created `AmbitenContext`. Authentication and authorization still belong to the application; tenant resolution alone is not authorization.

## Register the adapter module

Create `src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { AmbitenNestAdapterModule } from "@ambiten/adapter-nestjs";
import { ContextController } from "./context/context.controller";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    AmbitenNestAdapterModule.forRoot({
      tenancy: {
        header: "x-tenant-id"
      }
    }),
    UsersModule
  ],
  controllers: [ContextController]
})
export class AppModule {}
```

Use the published `@ambiten/adapter-nestjs` package, not `@ambiten/nestjs`. The module's `forRoot(...)` registration provides the configuration and registers `AmbitenNestInterceptor` through Nest's global interceptor mechanism.

There is deliberately no `fallback: "default"`. A missing tenant must not silently become another tenant. There is also no transaction configuration: first prove that the controller and service execute inside the boundary.

Register the adapter once at the application composition root, not separately in each feature module.

## Inspect execution in a controller

Create `src/context/context.controller.ts`:

```ts
import { Controller, Get } from "@nestjs/common";
import { AmbitenContext } from "@ambiten/core";

@Controller("context")
export class ContextController {
  @Get()
  getContext() {
    const ctx = AmbitenContext.get();

    return {
      tenantId: ctx.tenantId,
      requestId: ctx.requestId,
      dbName: ctx.dbName
    };
  }
}
```

The controller belongs to `AppModule`. It does not parse headers or create context. The intended ownership is:

```text
x-tenant-id → NestJS Request → Ambiten Interceptor → Adapter Runtime
                                                        ↓
                                                AmbitenContext
                                                        ↓
                                               ContextController
```

## Keep the service reusable

Create `src/users/users.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { AmbitenContext } from "@ambiten/core";

@Injectable()
export class UsersService {
  async inspectExecution() {
    // Read after awaited work to exercise the actual execution boundary.
    await new Promise<void>((resolve) => setImmediate(resolve));
    const ctx = AmbitenContext.get();

    return {
      tenantId: ctx.tenantId,
      requestId: ctx.requestId
    };
  }
}
```

The asynchronous pause is deliberate: reading context only during adapter setup would not demonstrate propagation into awaited service work.

Create `src/users/users.controller.ts`:

```ts
import { Controller, Get } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("runtime")
  getRuntime() {
    return this.usersService.inspectExecution();
  }
}
```

Then wire the feature in `src/users/users.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
```

`AppModule` imports `UsersModule`, so Nest can construct the controller and inject its service. No controller-to-service context argument is required.

## Bootstrap the process

Create `src/main.ts`:

```ts
import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 3000);

  if (!host.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Set HOST to a non-empty address and PORT to an integer from 1 to 65535.");
  }

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  try {
    await app.listen(port, host);
    console.log(`NestJS framework track listening at ${await app.getUrl()}`);
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch((error: unknown) => {
  console.error("Unable to start the NestJS framework track:", error);
  process.exitCode = 1;
});
```

This is ordinary NestJS startup plus local configuration and shutdown handling. It does not initialize a MongoDB client, register tenant databases, or create per-request context.

## Verify both routes

Run the app and call the controller probe with an explicit tenant and request ID. Use `curl.exe` in Windows PowerShell if `curl` is an alias.

```sh
curl -H "x-tenant-id: tenant-a" -H "x-request-id: context-a" http://127.0.0.1:3000/context
```

Expected response:

```json
{
  "tenantId": "tenant-a",
  "requestId": "context-a"
}
```

`dbName` is absent because no database name was supplied or resolved. JSON omits `undefined` properties. This is not evidence of a MongoDB connection or a configured tenant database.

Now verify context through the injected service:

```sh
curl -H "x-tenant-id: tenant-b" -H "x-request-id: service-b" http://127.0.0.1:3000/users/runtime
```

Expected response:

```json
{
  "tenantId": "tenant-b",
  "requestId": "service-b"
}
```

The context survives the interceptor, controller, dependency-injected service, and its asynchronous pause. If `x-request-id` is omitted, `requestId` is absent; this configuration does not generate one automatically.

### Missing tenant behavior

Without `x-tenant-id`, the uncustomized 1.0.2 adapter rejects execution with `Tenant resolution failed`. Nest maps that ordinary error to HTTP 500 with the public response:

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

That confirms no fallback tenant was used. It is a baseline adapter behavior, not the final client-error contract for a production API. The tenant-aware page will define intentional validation, authorization, and error mapping. Do not describe this checkpoint as returning HTTP 400 or 401 before adding that policy.

Keep these diagnostic endpoints local. Tenant headers are development inputs, not proof of access rights, and arbitrary infrastructure headers must not become trusted production database configuration.

## Values, Promises, and Observables

Nest controllers can return ordinary values, Promises, or Observables. The controller probe returns a value; the users route returns the service's Promise.

The published NestJS adapter also subscribes to `next.handle()` inside the callback supplied to the shared adapter runtime. That subscription boundary matters: constructing a cold Observable and then subscribing after leaving the context would not enclose the downstream execution.

The checkpoint tests include a test-only cold Observable that reads context during subscription and again after a delay. They verify controller execution, not just module registration.

```sh
npm test
```

The test runner builds the application, binds an ephemeral loopback port, and verifies:

- Context in the controller and in the service after awaited work.
- Overlapping requests across tenants and unique request IDs.
- Context in delayed Observable execution, with subscriptions that actually overlap.
- Missing tenant rejection without a fallback.
- No invented or retained request/database metadata.
- Error isolation and no active context in the test caller outside request execution.

The test-only `/boundary-test/*` routes are not registered in the normal application.

These tests establish the first-page execution contract. They do not prove transaction completion or database isolation; those need their own persistence tests later.

## Dependency injection is not execution context

NestJS dependency injection answers which implementation a class receives and how providers belong to modules. Ambiten context answers which tenant, request, database, and session belong to the current execution.

| Concern | Owner |
| --- | --- |
| Application composition and provider dependencies | NestJS DI |
| Controller routing and transport behavior | NestJS |
| Execution-scoped tenant, request, and session state | `AmbitenContext` |
| Persistence-facing operation state | Effective `ModelContext` |

The provider can remain reusable while its methods consume the active execution context.

Do not store a mutable `currentTenant` field on a singleton provider and overwrite it for each request. Concurrent requests could mutate the same process-level object. Tenant identity belongs to the execution's asynchronous chain instead.

## Keep transport state out of model calls

The following is a preview of the next page, not a missing model to create now.

Avoid a design where every controller reads `@Headers("x-tenant-id")`, passes it to the service, and the service forwards it into every model call. Once the execution boundary and infrastructure are configured, the ordinary flow can remain:

```ts
// Controller
@Get()
getUsers() {
  return this.usersService.findUsers();
}

// Service
async findUsers() {
  return UserModel.find({});
}
```

The model binds active execution state into its Effective `ModelContext`. Explicit overrides still have legitimate uses, but routine propagation should not require every method to carry transport-derived tenant arguments.

## Three lifetimes

| Lifetime | Examples |
| --- | --- |
| Process | NestJS application, modules, singleton providers, MongoDB clients, tenant registry, configuration, models |
| Execution | `tenantId`, `requestId`, `dbName`, session, logger metadata, instrumentation state |
| Operation | Filter, update, explicit `ModelContext`, middleware changes, soft-delete controls |

NestJS supports other provider scopes; this checkpoint uses the ordinary singleton services. Execution-specific state is not stored on those singleton instances.

```text
PROCESS: NestJS application + providers + infrastructure
                             ↓
EXECUTION: AmbitenContext
                             ↓
OPERATION: AmbitenModel + Effective ModelContext
                             ↓
MongoDB
```

## Checkpoint

You now have an initialized NestJS application, the public Ambiten adapter module, a global interceptor, required tenant identity at ingress, context in a controller, and context in an injected service after asynchronous work.

The controllers and services remain ordinary NestJS components. They do not initialize runtime context, parse tenant headers, or forward tenant state manually.

What you have proved is:

```text
NestJS → Interceptor → AmbitenContext → Controller → Service
```

You have deliberately not created a MongoDB model. Resolving `x-tenant-id` to tenant identity and resolving that identity to MongoDB infrastructure are separate responsibilities.

## Next: Tenant-Aware NestJS Services

The next page, [Tenant-Aware Services and Models](/tutorials/frameworks/nestjs/tenant-aware-services), will add `UserModel`, `MultiTenantManager`, and tenant-specific database operations. Its detailed walkthrough is still planned.

Only after that path is verified will [Transaction Continuity Across Services](/tutorials/frameworks/nestjs/transaction-continuity) introduce a transaction spanning multiple service/model operations.
