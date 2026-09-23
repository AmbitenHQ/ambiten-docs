# AWS Lambda Framework Track

One runnable example of a wrapped Lambda handler entering the same Ambiten context,
models, tenant infrastructure, and transaction boundary as the HTTP frameworks.
No AWS account, deployment, or credentials are needed for local verification.

Read the [framework-track page](https://docs.ambiten.dev/tutorials/frameworks/lambda)
or its [Markdown source](../../../../docs/tutorials/frameworks/lambda.md).

## Requirements

- Node.js 22.13 or newer and npm.
- MongoDB: the full transaction demo needs a replica set or sharded cluster.
- For `npm test`, an installed `mongod` executable. The test creates its own
  temporary single-node replica set; it does not use an existing database.

The lockfile records the installed dependencies. The example pins
`@ambiten/core` 1.2.4 and `@ambiten/adapter-lambda` 1.0.2, and compiles to CommonJS.

## Setup

From the docs repository:

```sh
cd examples/ambiten-tutorial/framework-tracks/lambda
npm ci
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell or
`cp .env.example .env` in a POSIX shell). Set `MONGO_URI` to your **development**
replica set and keep `TENANT_A_DB` and `TENANT_B_DB` distinct. The defaults are:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
TENANT_A_DB=ambiten_lambda_tenant_a
TENANT_B_DB=ambiten_lambda_tenant_b
```

The example does not install or configure your development MongoDB server.
Never point it at production data. Redis is not required; leave `REDIS_URI` unset.

## Invoke locally

```sh
npm run typecheck
npm run invoke
```

The default `read` mode calls `GET /users` for tenant A and then tenant B in the
same process. Responses contain `statusCode`, JSON response headers, and a JSON
string in `body`. A decoded response looks like:

```json
{
  "tenantId": "tenant-a",
  "requestId": "local-tenant-a-<run-id>",
  "users": []
}
```

Create one user and audit record for each tenant, then read them:

```sh
npm run invoke -- create
npm run invoke
```

Every `create` run adds records with fresh demo email addresses. It is not a seed
reset and never deletes existing records.

Prove rollback after both model writes:

```sh
npm run invoke -- rollback
```

The runner reports the expected deliberate failure for each tenant. The database
tests below verify that neither the user nor audit record survives. Unexpected
connection or validation failures exit nonzero.

For compiled execution:

```sh
npm run build
npm run invoke:built
npm run invoke:built -- create
npm run invoke:built -- rollback
```

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `src/handler.ts` | Adapter wrapper, ingress policy, GET/POST workflows |
| `src/invoke.ts` | Typed API Gateway-style local events and terminal cleanup |
| `src/runtime.ts` | Process-scoped provider, tenant registrations, cached connections, transaction resolver |
| `src/user.model.ts` | Transport-independent user model |
| `src/audit-log.model.ts` | Audit model participating in the same transaction |
| `test/runtime.test.cjs` | Isolated replica-set integration tests |

The built entry point is `dist/handler.js`, exporting `handler`. Deployment
packaging, AWS infrastructure, and IAM are intentionally outside this track.

## Runtime contract

- Required `x-tenant-id`; only `tenant-a` and `tenant-b` are accepted. No fallback.
- Tenant database names come from server configuration. `x-db-name` and
  `x-collection-name` are rejected.
- Explicit `x-request-id`, or an application-generated UUID. Adapter 1.0.2 does
  not copy `requestContext.requestId` automatically; the local events provide both.
- `GET /users` returns 200 with context metadata and `UserModel.find({})` results.
- `POST /users` accepts a JSON `name` and `email`, writes a user and audit record
  under `AmbitenContext.withTransaction()`, then returns 201 after commit.
- The demo-only boolean `simulateFailure` throws after both writes. Never expose
  this teaching switch as a production feature.
- A valid tenant's unknown route returns 404. Tenant, input, database, and
  transaction errors reject the invocation; production HTTP error mapping is not
  implemented here.

`initializeRuntime()` is shared across calls. Before any model operation, the
handler initializes the selected tenant through the single-flight connection cache.
This also covers Core models that resolve directly through `MultiTenantManager`.
Both models and the transaction resolver then use the same registered client.

The Lambda handler **does not** close clients after each invocation. Only the local
runner/tests call terminal `closeRuntime()` after all their work has completed.
No process-level variable stores a mutable current tenant, request, or session.

## Verify independently

```sh
npm test
```

If `mongod` is not on `PATH`, set `MONGOD_BINARY` to its absolute path. For example,
adjust this to your installed Windows version:

```powershell
$env:MONGOD_BINARY = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
npm test
```

The test fixture ignores `.env`, binds a temporary MongoDB instance to loopback,
uses isolated data, and removes only its own temporary directory afterward. Tests
cover tenant separation, concurrent cold initialization, warm reuse, fresh request
identity, ingress rejection, shared sessions, commit, rollback of both collections,
base64 and invalid payloads, and clean exits from source/compiled runners.

## Boundaries

Tenant routing is not authentication or authorization. The demo does not implement
idempotency for duplicate invocations. A MongoDB transaction does not make external
effects atomic; do not place email or queue publication inside a retryable database
transaction callback.

Await work owned by this invocation. For separate work, publish a job/event and
start a new execution context in its consumer. AsyncLocalStorage references are
not durable state and do not guarantee that detached work can finish after a Lambda
handler returns.
