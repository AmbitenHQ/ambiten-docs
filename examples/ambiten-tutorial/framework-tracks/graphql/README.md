# GraphQL Framework Track

One shared schema, resolver layer, model layer, and Ambiten runtime, with two
launchers: Apollo Server and GraphQL Yoga.

Read the [complete tutorial](https://docs.ambiten.dev/tutorials/frameworks/graphql)
or its [Markdown source](../../../../docs/tutorials/frameworks/graphql.md).

## Requirements

- Node.js 22.15 or newer and npm.
- A dedicated development MongoDB replica set (transactions require a replica set
  or sharded cluster).
- An installed `mongod` for the isolated integration tests.

The checkpoint pins Core 1.2.4, adapter-graphql 1.0.2, Apollo 5.5.1, and Yoga 5.24.1.
GraphQL is kept on 16.x to satisfy the published peer dependencies.

## Setup

```sh
cd examples/ambiten-tutorial/framework-tracks/graphql
npm ci
```

Copy `.env.example` to `.env` using `Copy-Item .env.example .env` in PowerShell or
`cp .env.example .env` in a POSIX shell. Configure your development replica-set URI:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
TENANT_A_DB=ambiten_graphql_tenant_a
TENANT_B_DB=ambiten_graphql_tenant_b
APOLLO_PORT=4000
YOGA_PORT=4001
```

Keep tenant database names distinct. The example does not configure MongoDB for
you. Never use production data. Redis is not needed; leave `REDIS_URI` unset.

## Two launchers

Apollo:

```sh
npm run dev:apollo
```

Endpoint: [http://127.0.0.1:4000/](http://127.0.0.1:4000/).

Yoga, in a separate terminal:

```sh
npm run dev:yoga
```

Endpoint and GraphiQL: [http://127.0.0.1:4001/graphql](http://127.0.0.1:4001/graphql).

Both bind loopback only. In either client, add:

```json
{
  "x-tenant-id": "tenant-a",
  "x-request-id": "graphql-demo-a"
}
```

Then run:

```graphql
query {
  runtime { tenantId requestId applicationName }
  users { _id name email }
}
```

A new database returns an empty users list. Change the tenant header to
`tenant-b` to query its separate database. Omit the request-ID header to generate
a new UUID for each operation.

## Write, commit, and roll back

Create through one host and read through the other with the same tenant header:

```graphql
mutation {
  createUser(input: { name: "GraphQL User", email: "graphql@example.com" }) {
    _id name email
  }
}
```

Create a user and audit atomically:

```graphql
mutation {
  createUserWithAudit(input: { name: "Audited User", email: "audited@example.com" }) {
    _id name email
  }
}
```

Add `simulateFailure: true` to the arguments of `createUserWithAudit`, using a
fresh email, to throw after both writes. Expect `data: null` and a GraphQL error
with code `DEMO_ROLLBACK`. Neither write survives; tests inspect both collections.

Every successful create adds a record. There is no seed reset, email uniqueness,
or duplicate-operation idempotency. Remove the failure switch for real users.

## Published adapter compatibility

Adapter 1.0.2 scopes **context construction**, not subsequent resolver execution.
The factories alone return metadata but do not leave AmbitenContext active when
GraphQL invokes resolvers.

- `shared/context.ts` captures the factory scope with
  `AsyncLocalStorage.snapshot()` in the extension callback.
- `shared/schema.ts` restores that scope around explicit and default application
  field resolvers. It rejects execution without the captured boundary.
- Yoga uses Node's native `Request`, `Response`, and `Headers`, because the
  adapter's `instanceof Headers` check does not recognize Yoga's default class.

These are local compatibility adjustments, not a patch to the installed package.
The tests record the unbridged behavior and verify actual HTTP execution with the
bridge. Do not remove it until an updated adapter and integration tests justify
doing so. No resolver passes tenant or session parameters into a model call.

## Ownership and security

The shared runtime caches infrastructure and configures the transaction resolver.
The context extension warms each tenant through a single-flight connection cache
before models run, including Core paths that use MultiTenantManager directly.

No fallback tenant exists. Only tenant-a and tenant-b are allowed.
`x-db-name` and `x-collection-name` are rejected; databases are server-selected.
This is routing validation, **not authentication or authorization**.

The GraphQL context still carries application values (`applicationName` here);
AmbitenContext carries execution infrastructure. A real application must verify
the principal and authorize access to the resolved tenant.

Only `createUserWithAudit` owns an explicit transaction. Do not enable global
adapter transactions as well. Multiple mutation fields are not one atomic unit.
Do not put non-transactional external effects inside a retryable transaction.

Stop a launcher with Ctrl+C: it drains the HTTP server before closing runtime
clients. Do not close clients per request or retain captured context for detached
background work.

## Build and test

```sh
npm run typecheck
npm run build
npm test
```

Tests start a disposable local replica set and ephemeral HTTP ports, ignore
`.env`, and never connect to an existing database. They stop their own processes
and remove only their generated temporary directory.

If needed, adjust this path for your installed MongoDB version:

```powershell
$env:MONGOD_BINARY = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
npm test
```

Coverage includes both HTTP hosts, concurrency, tenant separation, scope after
awaits, application context, request IDs, rejected routing, cross-host data,
shared transaction sessions, commit/rollback, validation, and source/built CLIs.

For compiled execution, run `npm run start:apollo` or `npm run start:yoga`.

This checkpoint does not include federation, subscriptions, uploads, batching,
production authentication/error policy, deployment, or query complexity limits.
