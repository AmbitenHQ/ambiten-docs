# Framework Tracks

The primary tutorial series uses Express. These tracks show how a different framework enters the same Ambiten runtime. Read-through pages live here; runnable checkpoints live under `examples/ambiten-tutorial/framework-tracks/<framework>`. They complement the completed core path rather than extending its numbering.

```text
Fastify Request ──┐
NestJS Request ───┤
GraphQL Resolver ─┼→ AmbitenContext → Same Models
Lambda Event ─────┘
```

## Fastify first

Fastify is the first track because it changes the HTTP lifecycle while keeping the application and model layer familiar. It uses hooks rather than Express middleware, but the intended boundary still leads into Adapter Runtime → `AmbitenContext` → application logic → models.

The track has four compact pages:

1. [Fastify Overview](/tutorials/frameworks/fastify) — setup, public adapter installation, tenant validation, and an execution-context probe.
2. [Runtime Boundary & Tenant-Aware API](/tutorials/frameworks/fastify/tenant-aware-api) — planned.
3. [Transaction Continuity](/tutorials/frameworks/fastify/transaction-continuity) — planned.
4. [Middleware, Instrumentation & Production Notes](/tutorials/frameworks/fastify/middleware-instrumentation-production) — planned.

The first runnable Fastify checkpoint is available under `examples/ambiten-tutorial/framework-tracks/fastify`. It uses the published `@ambiten/adapter-fastify` 1.0.4 public API, validates tenants through `MultiTenantManager.resolveTenant()`, and verifies asynchronous handler context and concurrent tenant/request isolation. Database-backed endpoints and the three later pages remain planned.

## NestJS

NestJS introduces module registration, dependency injection, and interceptor-based execution boundaries. Its first runnable checkpoint is available under `examples/ambiten-tutorial/framework-tracks/nestjs`.

1. [NestJS Overview & Runtime Boundary](/tutorials/frameworks/nestjs) — module setup, controllers, injected services, and asynchronous context checks.
2. [Tenant-Aware Services and Models](/tutorials/frameworks/nestjs/tenant-aware-services) — planned.
3. [Transaction Continuity Across Services](/tutorials/frameworks/nestjs/transaction-continuity) — planned.
4. [Middleware, Instrumentation & Production Structure](/tutorials/frameworks/nestjs/middleware-instrumentation-production) — planned.

## AWS Lambda

[AWS Lambda Framework Track](/tutorials/frameworks/lambda) is one compact, runnable example under `examples/ambiten-tutorial/framework-tracks/lambda`. It demonstrates a wrapped handler, fresh invocation context, tenant-aware model reads, warm-process infrastructure reuse, and an explicit user-plus-audit transaction with commit/rollback tests. Local invocation does not require deployment to AWS.

## GraphQL: Apollo and Yoga

[GraphQL Framework Track](/tutorials/frameworks/graphql) is one shared application with Apollo Server and GraphQL Yoga launchers under `examples/ambiten-tutorial/framework-tracks/graphql`. It includes tenant-aware reads and writes, application context values, and an explicit user-plus-audit transaction. The read-through documents the local resolver-scope bridge and Yoga Fetch compatibility configuration required by adapter 1.0.2.

The [Document-to-PDF SaaS tutorial](/tutorials/pdf-saas) remains a separate, standalone learning path.
