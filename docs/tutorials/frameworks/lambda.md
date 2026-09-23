# AWS Lambda Framework Track

Run the same Ambiten models inside AWS Lambda by treating each invocation as a fresh execution boundary.

Lambda has no Express middleware chain, Fastify hooks, or NestJS interceptor pipeline. Its handler is the transport boundary. Ambiten integrates by wrapping that handler:

```text
Lambda Invocation → createLambdaAdapter() → Adapter Runtime
                                                  ↓
                                            AmbitenContext
                                                  ↓
                                               Handler
                                                  ↓
                                            AmbitenModel
                                                  ↓
                                               MongoDB
```

The transport model changes. The Ambiten execution contract does not.

## One compact checkpoint

This is one framework-track example, not another multi-page series. It reuses the model/provider pattern from the [core tutorials](/tutorials/) and adds only the infrastructure necessary to run it independently.

The runnable project lives at `examples/ambiten-tutorial/framework-tracks/lambda`. See its [source and README](https://github.com/AmbitenHQ/ambiten-docs/tree/main/examples/ambiten-tutorial/framework-tracks/lambda). The numbered core checkpoints and the [Document-to-PDF SaaS tutorial](/tutorials/pdf-saas) remain separate.

| Invocation | Application behavior | Result |
| --- | --- | --- |
| `GET /users` | Read through the shared `UserModel` | 200 with tenant, request ID, and users |
| `POST /users` | Create a user and audit record in one explicit transaction | 201 after commit |
| `POST /users` with `simulateFailure: true` | Throw after both writes | Invocation rejects; both writes roll back |

This proves header-based tenant resolution, invocation-scoped context, context-aware persistence, warm-environment client reuse, and transaction continuity. It does not add SAM, CDK, Terraform, IAM, API Gateway provisioning, or deployment packaging.

## Requirements and setup

Use Node.js 22.13 or newer and npm. The checkpoint pins `@ambiten/core` 1.2.4 and `@ambiten/adapter-lambda` 1.0.2. The public wrapper is `createLambdaAdapter`; the old `@ambiten/lambda` import is not used.

Reads work against MongoDB, but the complete transaction example requires a replica set or sharded cluster—not a standalone server. Use a dedicated local development replica set, never production data. See MongoDB's [transaction requirements](https://www.mongodb.com/docs/manual/core/transactions/).

From the docs repository:

```sh
cd examples/ambiten-tutorial/framework-tracks/lambda
npm ci
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` in a POSIX shell). Configure the URI for your replica set:

```dotenv
# Use a local single-node replica set for the transaction demo.
MONGO_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
# Dedicated demo databases. Never point this example at production data.
TENANT_A_DB=ambiten_lambda_tenant_a
TENANT_B_DB=ambiten_lambda_tenant_b
```

`tenant-a` and `tenant-b` map to distinct, server-configured databases. No invocation can choose an arbitrary database or collection through headers. The example does not create or reconfigure your MongoDB server.

The initialized checkpoint contains:

```text
lambda/
├── src/
│   ├── handler.ts
│   ├── invoke.ts
│   ├── runtime.ts
│   ├── user.model.ts
│   └── audit-log.model.ts
├── test/runtime.test.cjs
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

`runtime.ts` and `audit-log.model.ts` make the brief's database and transaction dependencies concrete. They are supporting files in the same small example, not separate tutorials.

## Package and TypeScript configuration

If building in a separate directory, install the runtime dependencies:

```sh
npm install @ambiten/core@1.2.4 @ambiten/adapter-lambda@1.0.2 mongodb@^6.21.0 dotenv
npm install -D typescript tsx @types/node@^22
```

The checkpoint uses CommonJS output so the compiled handler loads the published packages through their CommonJS entry points. Its package scripts and dependencies are:

```json
{
  "name": "ambiten-framework-track-lambda",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "invoke": "tsx src/invoke.ts",
    "invoke:built": "node dist/invoke.js",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test test/runtime.test.cjs"
  },
  "dependencies": {
    "@ambiten/adapter-lambda": "1.0.2",
    "@ambiten/core": "1.2.4",
    "dotenv": "^16.4.7",
    "mongodb": "^6.21.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmitOnError": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

`npm run invoke` runs TypeScript locally. `npm run build` creates `dist/handler.js`, which exports the named `handler`, and `dist/invoke.js` for a compiled local run. This page tests local execution; it does not claim that a function has been deployed to AWS.

## Reuse infrastructure, not invocation state

Create `src/runtime.ts`:

```ts
import "dotenv/config";
import { AmbitenClient, AmbitenContext, MultiTenantManager } from "@ambiten/core";
import type { MongoClient } from "mongodb";

const mongoUri = process.env.MONGO_URI?.trim() || "mongodb://127.0.0.1:27017/?replicaSet=rs0";
export const tenantDatabases = Object.freeze({
  "tenant-a": process.env.TENANT_A_DB?.trim() || "ambiten_lambda_tenant_a",
  "tenant-b": process.env.TENANT_B_DB?.trim() || "ambiten_lambda_tenant_b"
});
export type TenantId = keyof typeof tenantDatabases;

if (new Set(Object.values(tenantDatabases)).size !== 2 ||
    Object.values(tenantDatabases).some(name => !/^[a-zA-Z0-9_-]+$/.test(name))) {
  throw new Error("Configure two distinct, non-empty tenant database names using letters, digits, underscores, or hyphens.");
}

export function isTenantId(value: string): value is TenantId {
  return Object.hasOwn(tenantDatabases, value);
}

// Cache infrastructure, never the current tenant, request, event, or session.
const connections = new Map<TenantId, Promise<MongoClient>>();
let initialization: Promise<void> | undefined;
let shutdown: Promise<void> | undefined;

export function getTenantClient(tenantId: string): Promise<MongoClient> {
  if (shutdown) return Promise.reject(new Error("Runtime has been closed."));
  if (!isTenantId(tenantId)) return Promise.reject(new Error("Unknown tenant."));
  let pending = connections.get(tenantId);
  if (!pending) {
    pending = MultiTenantManager.getClient(tenantId).then(client => {
      if (!client) throw new Error("Tenant infrastructure is not registered.");
      return client;
    }).catch(error => {
      connections.delete(tenantId);
      throw error;
    });
    connections.set(tenantId, pending);
  }
  return pending;
}

export const client = new AmbitenClient({
  uri: mongoUri,
  options: { dbName: "ambiten_lambda_runtime" },
  tenantResolver: { getClient: getTenantClient }
});

export function initializeRuntime(): Promise<void> {
  if (shutdown) return Promise.reject(new Error("Runtime has been closed."));
  initialization ??= (async () => {
    await client.connect();
    for (const [tenantId, dbName] of Object.entries(tenantDatabases)) {
      MultiTenantManager.registerLazyTenant(tenantId, mongoUri, { dbName });
    }
    AmbitenContext.configureTransactionResolver({
      resolveClient: tenantId => tenantId ? getTenantClient(tenantId) : undefined
    });
  })().catch(async error => {
    await client.close();
    initialization = undefined;
    throw error;
  });
  return initialization;
}

// Called by the local runner/tests, never at the end of each Lambda invocation.
export function closeRuntime(): Promise<void> {
  shutdown ??= (async () => {
    await initialization?.catch(() => {});
    const outcomes = await Promise.allSettled([
      ...Array.from(connections.values(), async pending => (await pending).close()),
      client.close()
    ]);
    connections.clear();
    MultiTenantManager.clearTenants();
    const errors = outcomes.filter(result => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map(result => result.reason), "Runtime cleanup failed.");
  })();
  return shutdown;
}
```

The reusable `AmbitenClient` is the models' provider. `MultiTenantManager` holds the two tenant registrations. Before a model runs, the handler awaits `getTenantClient()` to initialize that tenant through the connection-promise cache. This matters because Core 1.2.4 models can resolve clients directly through `MultiTenantManager`: caching only the provider's resolver would not prevent competing lazy connections or ensure the local runner tracks them for cleanup.

`initializeRuntime()` is shared across invocations. Its transaction resolver returns the same tenant `MongoClient` that model operations use; a session from an unrelated client must not be mixed into those operations.

`closeRuntime()` is terminal cleanup for the local runner and tests. Do not call it in the handler's `finally` block: doing so would destroy warm-environment reuse. The module stores clients and configuration, not a mutable current tenant, event, request ID, or session.

## Keep the models independent of Lambda

Create `src/user.model.ts`:

```ts
import { AmbitenModel, AmbitenSchema, type SchemaDefinition } from "@ambiten/core";
import { client } from "./runtime";

export interface User {
  name: string;
  email: string;
  createdAt: Date;
}

// Keep the tested runtime field options; isolate Core 1.2.4's schema declaration mismatch.
export const userSchema = new AmbitenSchema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, required: true }
} as unknown as SchemaDefinition<User>);

export const UserModel = new AmbitenModel<User>({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

Create `src/audit-log.model.ts`:

```ts
import {
  AmbitenModel,
  AmbitenSchema,
  type SchemaDefinition
} from "@ambiten/core";
import { client } from "./runtime";

export interface AuditLog {
  action: string;
  userEmail: string;
  createdAt: Date;
}

const schema = new AmbitenSchema<AuditLog>({
  action: { type: String, required: true },
  userEmail: { type: String, required: true },
  createdAt: { type: Date, required: true }
} as unknown as SchemaDefinition<AuditLog>);

export const AuditLogModel = new AmbitenModel<AuditLog>({
  collectionName: "audit_logs",
  schema,
  provider: client
});
```

These follow the tested core-tutorial schema and provider pattern. The audit record uses `userEmail`, as in the core checkpoints. The localized `SchemaDefinition` assertions address Core 1.2.4's declaration mismatch while retaining its runtime `{ type, required }` field configuration.

Neither model imports a Lambda event type or parses HTTP headers. The model operation remains `UserModel.find({})`; runtime tenant and session state arrive through the active execution context.

## Wrap the handler

Create `src/handler.ts`:

```ts
import { randomUUID } from "node:crypto";
import { AmbitenContext } from "@ambiten/core";
import { createLambdaAdapter, type LambdaRequestInput } from "@ambiten/adapter-lambda";
import { getTenantClient, initializeRuntime, isTenantId, tenantDatabases } from "./runtime";
import { UserModel } from "./user.model";
import { AuditLogModel } from "./audit-log.model";

export interface InvocationEvent extends LambdaRequestInput {
  version?: string;
  routeKey?: string;
  rawQueryString?: string;
  requestContext?: {
    requestId?: string;
    http?: { method?: string; path?: string };
  };
}

function response(statusCode: number, result: Record<string, unknown>) {
  const ctx = AmbitenContext.get();
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId: ctx.tenantId, requestId: ctx.requestId, ...result })
  };
}

function readCreateInput(event: InvocationEvent) {
  let input: unknown;
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf8")
      : event.body ?? "";
    input = JSON.parse(body);
  } catch {
    throw new Error("Expected a JSON object containing name and email.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Expected a JSON object containing name and email.");
  }
  const value = input as Record<string, unknown>;
  if (typeof value.name !== "string" || !value.name.trim() ||
      typeof value.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim()) ||
      (value.simulateFailure !== undefined && typeof value.simulateFailure !== "boolean")) {
    throw new Error("Provide a non-empty name, valid email, and optional boolean simulateFailure.");
  }
  return { name: value.name.trim(), email: value.email.trim().toLowerCase(), simulateFailure: value.simulateFailure === true };
}

export const handler = createLambdaAdapter(async (event: InvocationEvent) => {
  const method = event.requestContext?.http?.method ?? event.httpMethod;
  const path = event.rawPath ?? event.requestContext?.http?.path ?? event.path;

  if (path !== "/users" || (method !== "GET" && method !== "POST")) {
    return response(404, { error: "Use GET /users or POST /users." });
  }

  await initializeRuntime();
  // Core models also resolve clients directly through MultiTenantManager.
  // Warm this tenant through the single-flight cache before any model operation.
  await getTenantClient(AmbitenContext.get().tenantId ?? "");

  if (method === "GET") {
    const users = await UserModel.find({});
    return response(200, { users });
  }
 
  let input: ReturnType<typeof readCreateInput>;

  try {
    input = readCreateInput(event);
  } catch (error) {
    return response(
      400,
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid request body."
      }
    );
  }
  try {
  const result = await AmbitenContext.withTransaction(async () => {
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      createdAt: new Date()
    });
    const audit = await AuditLogModel.create({
      action: "USER_CREATED",
      userEmail: user.email,
      createdAt: new Date()
    });
    // Local teaching switch: fail after both writes to prove rollback of both models.
    if (input.simulateFailure) throw new Error("Intentional transaction failure.");
    return { user, audit };
  });
  return response(201, result);
  } catch (error) {
    if (
      input.simulateFailure &&
      error instanceof Error &&
      error.message ===
      "Intentional transaction failure."
    ) {
      return response(
        500,
        {
          error:
            "Transaction rolled back after the intentional failure."
        }
      );
    }

    throw error;
  }
}, {
  tenancy: {
    header: "x-tenant-id",
    resolver: request => {
      if (request.get?.("x-db-name") !== undefined || request.get?.("x-collection-name") !== undefined) {
        throw new Error("Database and collection routing are server-owned.");
      }
      return request.get?.("x-tenant-id")?.trim();
    },
    validate: isTenantId
  },
  resolvers: {
    requestId: request => request.get?.("x-request-id")?.trim() || randomUUID(),
    dbName: request => {
      const tenantId = request.get?.("x-tenant-id")?.trim() ?? "";
      if (!isTenantId(tenantId)) throw new Error("Unknown tenant.");
      return tenantDatabases[tenantId];
    }
  }
});
```

The adapter normalizes invocation headers and transport fields before entering `AmbitenContext`. Tenant selection and trusted database mapping belong to that ingress configuration, not to individual model calls.

Notice the boundaries:

- There is no fallback tenant. Missing identity or an unknown tenant rejects the invocation.
- Only the configured demo tenants are accepted. This allowlist is routing validation, not caller authentication or authorization.
- `x-db-name` and `x-collection-name` are rejected, including normalized mixed-case headers.
- A caller-provided `x-request-id` is used for correlation; otherwise this example generates a UUID.
- `GET /users` is not transactional. Only the consistency-sensitive user-plus-audit workflow calls `AmbitenContext.withTransaction()`.

::: tip Request ID mapping is explicit
Adapter 1.0.2 does not automatically copy API Gateway's `requestContext.requestId` or the Lambda runtime's `awsRequestId` into `AmbitenContext`. The local events below supply `x-request-id` explicitly. The UUID fallback is application configuration, not an implicit adapter guarantee.
:::

The handler receives the original event. That is why its application-body parser explicitly decodes base64 payloads before parsing JSON. Successful results use a JSON proxy-response shape; validation, tenant, database, and deliberate transaction failures reject the invocation. Mapping those failures to production HTTP status codes belongs to the chosen integration/error policy and is not implemented here. A valid tenant calling an unknown route receives 404.

## Invoke locally—twice in one process

Create `src/invoke.ts`:

```ts
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { handler, type InvocationEvent } from "./handler";
import { closeRuntime, type TenantId } from "./runtime";

function makeEvent(tenantId: TenantId, method: "GET" | "POST", requestId: string, body?: object): InvocationEvent {
  return {
    version: "2.0",
    routeKey: `${method} /users`,
    rawPath: "/users",
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": tenantId,
      // Adapter 1.0.2 does not map requestContext.requestId into AmbitenContext.
      "x-request-id": requestId
    },
    requestContext: { requestId, http: { method, path: "/users" } },
    body: body ? JSON.stringify(body) : undefined,
    isBase64Encoded: false
  };
}

async function main() {
  const mode = process.argv[2] ?? "read";
  if (!["read", "create", "rollback"].includes(mode)) {
    throw new Error("Usage: npm run invoke -- [read|create|rollback]");
  }
  const runId = randomUUID();
  for (const tenantId of ["tenant-a", "tenant-b"] as const) {
    const requestId = `local-${tenantId}-${runId}`;
    try {
      const result = await handler(makeEvent(tenantId, mode === "read" ? "GET" : "POST", requestId,
        mode === "read" ? undefined : {
          name: `Lambda ${tenantId}`,
          email: `${tenantId}-${runId}@example.com`,
          simulateFailure: mode === "rollback"
        }));
      if (mode === "rollback") throw new Error("Expected the transaction to fail.");
      console.log(JSON.stringify({ mode, tenantId, result }, null, 2));
    } catch (error) {
      if (mode !== "rollback" || !(error instanceof Error) || error.message !== "Intentional transaction failure.") throw error;
      console.log(JSON.stringify({ mode, tenantId, requestId, expectedError: error.message }, null, 2));
    }
  }
}

main().catch(error => {
  console.error("Local Lambda invocation failed:", error);
  process.exitCode = 1;
}).finally(async () => {
  try { await closeRuntime(); }
  catch (error) { console.error("Local cleanup failed:", error); process.exitCode = 1; }
});
```

The event type extends the adapter's public `LambdaRequestInput`, so the runner does not need `as any`. Its shape is representative of an API Gateway HTTP API event.

Start with reads:

```sh
npm run typecheck
npm run invoke
```

One process calls the same exported handler for `tenant-a` and then `tenant-b`. A new database returns an empty user list. The outer proxy response contains a JSON string in `body`; decoded, its shape is:

```json
{
  "tenantId": "tenant-a",
  "requestId": "local-tenant-a-<run-id>",
  "users": []
}
```

The second response has `tenant-b` and a different request ID. Existing demo records appear only in their corresponding tenant's list. The runtime, model objects, and cached client pools can survive both calls; invocation context must remain separate.

To create one user and audit record per tenant:

```sh
npm run invoke -- create
npm run invoke
```

The runner generates distinct demo email addresses. Each `create` run intentionally adds records to both configured demo databases; it is not a seed reset and does not delete existing data.

## Prove transaction continuity and rollback

The transactional path is:

```text
Lambda Invocation → Adapter Boundary → AmbitenContext
                                             ↓
                                     withTransaction()
                                             ↓
                                       ClientSession
                                       ├─ UserModel.create()
                                       └─ AuditLogModel.create()
                                             ↓
                                       Commit / Rollback
```

Both operations inherit the active session. Neither receives a session argument from the event. The handler awaits transaction completion before returning 201.

Run the deliberate failure:

```sh
npm run invoke -- rollback
```

The failure occurs after both writes, inside the transaction callback. The local runner recognizes only that specific expected error and continues to the other tenant; connection or setup failures still exit nonzero. The integration tests inspect both collections to prove rollback rather than relying only on the exception message.

Do not set `enableTransactions: true` as well. An invocation is an execution boundary; this specific workflow owns an explicit transaction boundary. MongoDB transaction callbacks can be retried, so do not put non-transactional external side effects inside them.

`simulateFailure` is a local teaching switch, not an endpoint feature to expose in a production deployment. The example does not implement duplicate-event idempotency or business-level uniqueness; retries after a completed invocation need a separate application policy.

## Verify against an isolated MongoDB

`npm test` builds the code and starts a disposable single-node replica set using `mongod`. It does not read your `.env` or use an already-running database.

```sh
npm test
```

If `mongod` is not on `PATH`, set `MONGOD_BINARY` to your installed executable. For example, adjust this Windows path for your installed MongoDB version:

```powershell
$env:MONGOD_BINARY = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
npm test
```

The tests verify concurrent cold access, sequential warm reuse, request-ID freshness, header normalization, rejected tenant/infrastructure input, shared transaction sessions, commit, rollback of both collections, payload handling, and source/compiled local runners. The fixture closes clients, stops only its own MongoDB process, and removes only its generated temporary data directory.

You can also run the compiled example against your configured development database:

```sh
npm run build
npm run invoke:built
npm run invoke:built -- create
npm run invoke:built -- rollback
```


## Process lifetime and invocation lifetime

| Lifetime | Reusable or scoped state |
| --- | --- |
| Execution environment / process | MongoDB clients, models, tenant registry, immutable configuration |
| Invocation | Tenant identity, request ID, session, metadata, instrumentation state |
| Model operation | Filter, input document, effective `ModelContext`, operation middleware state |

AWS recommends reusing clients across warm invocations while avoiding shared mutable user/request state. This checkpoint follows that distinction. Warm-environment reuse is an optimization, not a promise that a particular process will exist for the next call. See [AWS Lambda best practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html).

## Detached work needs a new boundary

::: warning An invocation is not durable background state
Do not start unawaited work and assume it is safe to finish after the handler returns. A scheduled timeout, microtask, or asynchronous event listener may retain an AsyncLocalStorage reference, but that does not give it a valid Lambda lifecycle or durable execution guarantee.

Await work that belongs to this invocation. For separate work, publish a job or event and await the publication; the worker or new invocation must establish its own `AmbitenContext`. Do not carry a live MongoDB session across that boundary.
:::

The important distinction is semantic lifetime, not a claim that every detached asynchronous resource instantly loses its stored context. AWS can freeze or terminate the execution environment; see the [Lambda execution-environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html).

## Checkpoint

You now have a wrapped Lambda handler, per-invocation tenant/request context, a transport-independent `UserModel`, reusable process infrastructure, an explicit multi-model transaction, and local commit/rollback verification.

Keep the distinction clear:

```text
Environment may survive between invocations.
Invocation state is not reusable process state.
```

Lambda changes the host lifecycle. It does not change Ambiten's execution model.

Return to [Framework Tracks](/tutorials/frameworks/), compare the [NestJS boundary](/tutorials/frameworks/nestjs), or revisit [Transaction Continuity](/tutorials/08-transaction-continuity) for the core transaction walkthrough.
