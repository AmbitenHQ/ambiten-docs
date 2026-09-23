# NestJS Framework Track — Overview & Runtime Boundary

Runnable checkpoint for the first page of the NestJS framework track. It proves
the path from the global Ambiten interceptor into a controller and an injected
service. It deliberately does not create MongoDB clients, models, or transactions.

Read the [matching tutorial](https://docs.ambiten.dev/tutorials/frameworks/nestjs)
or its [Markdown source](../../../../docs/tutorials/frameworks/nestjs/nestjs.md).

## Requirements

- Node.js 22.13 or newer and npm.
- No running MongoDB or Redis instance is required for this checkpoint.
- The checkpoint uses `@ambiten/core` 1.2.4, `@ambiten/adapter-nestjs` 1.0.2,
  NestJS 11, and RxJS 7. The lockfile records the installed dependency versions.

## Run

From the docs repository:

```sh
cd examples/ambiten-tutorial/framework-tracks/nestjs
npm ci
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell or
`cp .env.example .env` in a POSIX shell), then:

```sh
npm run typecheck
npm run start:dev
```

The app listens at `http://127.0.0.1:3000`. `HOST` and `PORT` are optional:
the same values are the defaults. Keep the demo bound to loopback. Stop with Ctrl+C.

For a compiled run:

```sh
npm run build
npm start
```

The local Nest CLI compiles TypeScript with decorator metadata for dependency
injection. No global Nest CLI installation is needed. The compiled checkpoint is
CommonJS, including its imports of the published Ambiten packages.

## Try both execution paths

Use `curl.exe` instead of `curl` in Windows PowerShell if `curl` is an alias.

```sh
curl -H "x-tenant-id: tenant-a" -H "x-request-id: context-a" http://127.0.0.1:3000/context
curl -H "x-tenant-id: tenant-b" -H "x-request-id: service-b" http://127.0.0.1:3000/users/runtime
```

Expected responses:

```json
{"tenantId":"tenant-a","requestId":"context-a"}
```

```json
{"tenantId":"tenant-b","requestId":"service-b"}
```

`/context` reads the active context directly in the controller. `/users/runtime`
reads it in a singleton service after awaited work. Neither route parses tenant
headers or creates context manually.

`dbName` is absent when no database name is supplied or resolved. No tenant database
has been configured. `requestId` is also absent if `x-request-id` is omitted; this
checkpoint does not invent one.

There is no fallback tenant. With the uncustomized 1.0.2 adapter, a request missing
`x-tenant-id` fails with HTTP 500 (`Tenant resolution failed` internally), not a
successful response for a default tenant. An intentional client-error policy and
trusted tenant authorization belong to the next page. The header alone is not
authorization. Infrastructure headers must not be trusted as production database
configuration.

## Verify

```sh
npm test
```

Tests build the app and exercise real HTTP requests on an ephemeral loopback port:

- Context in the controller and the injected service after awaited work.
- Overlapping requests across multiple tenants and request IDs.
- A test-only cold Observable that reads context during subscription and after a delay.
- Missing tenant rejection without a fallback.
- No invented or retained request/database metadata.
- Error isolation and a clean context outside request execution.

The test-only `/boundary-test/*` endpoints are not part of the normal application.

## Files

```text
nestjs/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── context/context.controller.ts
│   └── users/
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
├── test/runtime.test.cjs
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## Next checkpoint

The [Tenant-Aware Services and Models page](https://docs.ambiten.dev/tutorials/frameworks/nestjs/tenant-aware-services)
will introduce tenant infrastructure and `UserModel`. The later pages cover
transaction continuity across services and middleware, instrumentation, and
production structure. Those pages are currently outlines, not implemented features
of this checkpoint.
