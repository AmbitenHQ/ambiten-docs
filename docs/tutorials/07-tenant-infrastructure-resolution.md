# Tutorial 7 — Tenant Infrastructure Resolution

> Estimated time: 20–25 minutes

Tutorial 6 answered:

```text
Who is this execution for?
```

The answer came from the HTTP boundary:

```text
Request
      ↓
x-tenant-id
      ↓
Express Adapter
      ↓
AmbitenContext.tenantId
```

We registered `tenant-a` and `tenant-b`, validated them, and proved that tenant identity remained available throughout the execution.

But tenant identity alone does not tell MongoDB where data belongs.

That requires a second question:

```text
Where does this tenant live?
```

In this tutorial, we connect those two halves.

The runtime becomes:

```text
HTTP Request
      ↓
Tenant Resolver
      ↓
AmbitenContext
tenantId
      ↓
Application
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
MultiTenantManager
      ↓
Tenant MongoClient
      ↓
Tenant Database
      ↓
MongoDB
```

By the end of the tutorial, `tenant-a` and `tenant-b` will use the same application code and the same `UserModel`, but persist data in different MongoDB databases.

## What you will learn

You will learn the difference between:

```text
tenant identity
tenant configuration
tenant client resolution
tenant database resolution
```

and how those responsibilities connect without putting database names into every request or service call.

## What you need

Complete [Tutorial 6 — Multi-Tenant API](/tutorials/06-multi-tenant-api), or use the saved Tutorial 7 checkpoint. You should already recognize `tenant-a`, `tenant-b`, the `x-tenant-id` header, and `AmbitenContext.tenantId`.

Use Node.js 22.13 or later, npm or pnpm, and a reachable MongoDB server. This chapter performs ordinary reads and writes; it does not require a replica set. Transactions arrive in Tutorial 8.

Use a development database. The tenant database names are shared by the series, so records from an earlier checkpoint may still be present.

## Starting point

The completed source checkpoint is:

```text
examples/ambiten-tutorial/07-tenant-infrastructure/
├── src/
│   ├── core/
│   │   ├── db.ts
│   │   └── tenancy.ts
│   ├── models/user.model.ts
│   ├── routes/
│   │   ├── tenant.routes.ts
│   │   └── users.routes.ts
│   ├── services/user.service.ts
│   ├── utils/execution.ts
│   └── index.ts
├── .env.example
├── package.json
├── package-lock.json
└── tsconfig.json
```

If you are following the series by making each change yourself, start with a fresh copy of Tutorial 6's source and project configuration. Do not copy `node_modules`, generated `dist` files, or private `.env` values, and do not overwrite the already completed Tutorial 7 directory.

The package is named `ambiten-tutorial-07-tenant-infrastructure`. No new dependency is needed for this step. From the repository root, prepare the saved checkpoint:

```bash
cd examples/ambiten-tutorial/07-tenant-infrastructure
npm ci
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` for the last command. Preserve an existing environment file instead of overwriting it. With pnpm, use `pnpm install`.

The example configuration is:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
PORT=3000
```

`DB_NAME` is the base runtime database. It does not replace the database names in the tenant registry. `MONGO_URI` supplies the connection string used by this demonstration's base client and tenant registrations.

## Step 1 — Revisit the missing piece

At the end of Tutorial 6 we had:

```text
Request
      ↓
tenant-a
      ↓
AmbitenContext
```

and separately:

```text
MultiTenantManager
      ↓
tenant-a configuration
```

What we had not yet demonstrated was:

```text
AmbitenContext.tenantId
      ↓
MongoDB client
      ↓
MongoDB database
```

Registration and resolution are not the same operation.

Registration means:

```text
the runtime knows
about the tenant
```

Resolution means:

```text
give this execution
the infrastructure
for that tenant
```

## Step 2 — Understand the registered configuration

The existing `src/core/tenancy.ts` registers two tenants and owns their cleanup:

```ts
import { MultiTenantManager } from "@ambiten/core";

const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017";

export function registerTutorialTenants() {
	if (!MultiTenantManager.hasTenant("tenant-a"))
		MultiTenantManager.registerLazyTenant(
			"tenant-a",
			uri,
			{
				dbName: "ambiten_tutorial_tenant_a"
			}
		);

	if (!MultiTenantManager.hasTenant("tenant-b"))
		MultiTenantManager.registerLazyTenant("tenant-b",
			uri, { dbName: "ambiten_tutorial_tenant_b" }
		);
}

export async function closeTutorialTenants() {
	await Promise.all(MultiTenantManager.getAllTenants().map(
		async tenant => tenant.client?.close()));
	MultiTenantManager.clearTenants();
}
```

The mapping is explicit:

| Tenant identity | MongoDB URI | Tenant database |
| --- | --- | --- |
| `tenant-a` | `MONGO_URI` | `ambiten_tutorial_tenant_a` |
| `tenant-b` | `MONGO_URI` | `ambiten_tutorial_tenant_b` |

The tenants use the same MongoDB server in this example, but different databases and tenant clients. They are not separate clusters.

`hasTenant()` prevents repeated registration. `registerLazyTenant()` records configuration without connecting a tenant client immediately. `closeTutorialTenants()` closes activated tenant clients and clears the registry; the base `AmbitenClient` is closed separately.

## Step 3 — Lazy registration vs lazy activation

At startup:

```text
register tenant
      ↓
store configuration
```

Later:

```text
first database access
      ↓
getClient(tenantId)
      ↓
create MongoClient
      ↓
connect
      ↓
store connected client
```

Future operations can then reuse that client.

That is why tenant registration belongs to process infrastructure rather than being repeated inside every route.

## Step 4 — Configure AmbitenClient with tenant resolution

The important addition in `src/core/db.ts` is the explicit tenant client resolver:

```ts
import { AmbitenClient, MultiTenantManager } from "@ambiten/core";

export const client = new AmbitenClient({
	uri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017",
	options: {
		dbName: process.env.DB_NAME ?? "ambiten_tutorial"
	},
	tenantResolver: {
		getClient: async (tenantId: string) =>
			MultiTenantManager.getClient(tenantId)
	}
});
```

The bridge is:

```text
AmbitenClient
      ↓ tenantResolver.getClient(tenantId)
MultiTenantManager.getClient(tenantId)
      ↓
Tenant MongoClient
```

This makes the lower-level client surface tenant-aware. The model's tenant-aware execution path already resolves its active tenant through `MultiTenantManager`; the resolver here is also needed when using `AmbitenClient` directly.

## Step 5 — Why AmbitenClient needs a resolver

`AmbitenClient` should not invent tenant infrastructure.

If an operation asks it for:

```text
tenantId = tenant-a
```

the client needs a component capable of answering:

```text
which MongoClient belongs
to tenant-a?
```

That is the resolver contract.

For this tutorial the answer is:

```text
MultiTenantManager.getClient(
  tenantId
)
```

In larger systems the manager may itself obtain tenant configuration from dynamic infrastructure before supplying the client.

## Step 6 — Add an infrastructure inspection endpoint

The checkpoint adds `src/routes/tenant.routes.ts`:

```ts
import { Router } from "express";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { client } from "../core/db.js";

export const tenantRouter = Router();

tenantRouter.get("/infrastructure", async (_req, res, next) => {
	try {
		const tenantId = AmbitenContext.get().tenantId;
		if (!tenantId)
			return res.status(400).json({
				error: "Tenant context is required."
			});

		const configuredTenant = MultiTenantManager.getTenant(tenantId);
		if (!configuredTenant)
			return res.status(404).json({
				error: "Tenant is not registered."
			});

		const db = await client.db({ tenantId });
		const resolvedTenant = MultiTenantManager.getTenant(tenantId);

		return res.json({
			tenantId,
			configuredDbName: configuredTenant.dbName,
			resolvedDbName: db.databaseName,
			connected: Boolean(resolvedTenant?.client)
		});
	} catch (error) {
		next?.(error);
	}
});
```

The route compares the registered database name with the database selected by the client. It reads the registry again after resolution because the lazy client may have been activated during `client.db({ tenantId })`.

The response deliberately omits the connection URI and credentials. The route is a teaching diagnostic: resolving infrastructure can open a tenant connection, so it is not a passive inspection of startup state.

The route has defensive checks for missing context and unregistered tenants. The Express adapter can reject invalid tenant requests before this handler runs, so those checks do not define every possible error response from the endpoint.

## Step 7 — Follow the direct client path

When the route executes:

```ts
await client.db({ tenantId });
```

the simplified path is:

```text
Explicit context: { tenantId }
      ↓
AmbitenClient.db()
      ↓
tenantResolver.getClient()
      ↓
MultiTenantManager.getClient()
      ↓
Tenant MongoClient + configured tenant database
```

The route first reads `AmbitenContext`, then passes the tenant explicitly to `client.db(...)`. Do not infer that every direct client API automatically reads ambient execution context.

The request in this walkthrough supplies tenant identity, not a database name. The registry supplies the `tenantId → dbName` mapping. When no explicit database override is supplied, this path resolves the configured tenant database.

## Step 8 — Keep health outside the tenant boundary

A process health endpoint answers:

```text
is this service alive?
```

It does not necessarily answer:

```text
is tenant-a available?
```

So register `/health` before installing the tenant-aware adapter:

```ts
app.get(
  "/health",
  (_req, res) => {
    res.json({
      status: "ok"
    });
  }
);
```

Then install the adapter.

```text
/health
→ process boundary

adapter
      ↓
/tenant
/users
→ tenant execution boundary
```

That keeps process health separate from tenant execution.

## Step 9 — Mount the tenant infrastructure route

Here is the complete `src/index.ts` wiring in the saved checkpoint:

```ts
import express, {
	type Express,
	type NextFunction,
	type Request,
	type Response
} from "express";
import { MultiTenantManager } from "@ambiten/core";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { client } from "./core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "./core/tenancy.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { usersRouter } from "./routes/users.routes.js";

const port = Number(process.env.PORT ?? 3000);

async function main() {
	registerTutorialTenants();
	await client.connect();

	const app: Express = express();
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.get("/health", (_req, res) => res.json({ status: "ok" }));

	await createExpressAdapter().install(app, {
		tenancy: {
			header: "x-tenant-id",
			validate: async tenantId =>
				MultiTenantManager.hasTenant(tenantId)
		}
	});

	app.use("/tenant", tenantRouter);
	app.use("/users", usersRouter);

	app.use((
		error: unknown,
		_req: Request,
		res: Response,
		_next: NextFunction
	) => {
		console.error(error);
		res.status(500).json({
			error: error instanceof Error
				? error.message
				: "Unknown error"
		});
	});

	const server = app.listen(port, () =>
		console.log(`Ambiten API running on http://localhost:${port}`)
	);

	const shutdown = () => server.close(
		async () => {
			await closeTutorialTenants();
			await client.close(); process.exit(0);
		});

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}

main().catch(async error => {
	console.error("Application failed:", error);
	await closeTutorialTenants();
	await client.close(); process.exitCode = 1;
});
```

The important ordering is:

```text
Startup: register tenants → connect base client
      ↓
/health: process-level route
      ↓
install tenant-aware Express adapter
      ↓
/tenant/* and /users/*: tenant executions
      ↓
error handler
```

Startup registers tenants without activating all tenant connections. On shutdown, the server stops accepting new connections, then the checkpoint closes tenant clients and the base client. More robust readiness and shutdown handling is covered in [Tutorial 12](/tutorials/12-production-runtime).

The existing package scripts provide these checks and the development server:

```bash
npm run typecheck
npm run build
npm run dev
```

With pnpm, use `pnpm typecheck`, `pnpm build`, and `pnpm dev`. The HTTP commands below use Bash line continuations; in PowerShell, put the command on one line and use `curl.exe`, or use `Invoke-RestMethod`.

First verify process health without a tenant header:

```bash
curl http://localhost:3000/health
```

Expected:

```json
{ "status": "ok" }
```

This proves the process can answer the health route. It is not a tenant availability probe or a database readiness check.

## Step 10 — Resolve Tenant A

Run:

```bash
curl \
  http://localhost:3000/tenant/infrastructure \
  -H "x-tenant-id: tenant-a"
```

Expected response:

```json
{
  "tenantId": "tenant-a",
  "configuredDbName": "ambiten_tutorial_tenant_a",
  "resolvedDbName": "ambiten_tutorial_tenant_a",
  "connected": true
}
```

We can now observe both sides:

```text
Execution Identity
tenant-a

Infrastructure
ambiten_tutorial_tenant_a
```

## Step 11 — Resolve Tenant B

Run:

```bash
curl \
  http://localhost:3000/tenant/infrastructure \
  -H "x-tenant-id: tenant-b"
```

Expected:

```json
{
  "tenantId": "tenant-b",
  "configuredDbName": "ambiten_tutorial_tenant_b",
  "resolvedDbName": "ambiten_tutorial_tenant_b",
  "connected": true
}
```

The same endpoint reached different infrastructure.

## Step 12 — Return to UserModel

The existing `src/models/user.model.ts` remains tenant-independent:

```ts
import { AmbitenModel, AmbitenSchema } from "@ambiten/core";
import { client } from "../core/db.js";

export interface User {
	name: string;
	email: string;
	createdAt: Date;
}

export const userSchema = new AmbitenSchema<User>({
	name: String,
	email: String,
	createdAt: Date
});

export const UserModel = new AmbitenModel<User>({
	collectionName: "users",
	schema: userSchema,
	provider: client
});
```

There is one `UserModel`, one schema, and one logical collection name. There is no `TenantAUserModel` or `TenantBUserModel`.

The tenant belongs to the current execution, not to model identity. The service can call `UserModel.find({})` without choosing a database itself.

## Step 13 — Create a Tenant A user

Run:

```bash
curl \
  -X POST \
  http://localhost:3000/users \
  -H "x-tenant-id: tenant-a" \
  -H "Content-Type: application/json" \
  -d '{"name":"Amina — Tenant A","email":"shared@example.com"}'
```

The flow is:

```text
POST /users
      ↓
tenant-a
      ↓
AmbitenContext
      ↓
UserModel.create()
      ↓
Effective ModelContext
      ↓
Tenant Infrastructure
      ↓
ambiten_tutorial_tenant_a
      ↓
users
```

## Step 14 — Create a Tenant B user

Use the same email:

```bash
curl \
  -X POST \
  http://localhost:3000/users \
  -H "x-tenant-id: tenant-b" \
  -H "Content-Type: application/json" \
  -d '{"name":"Amina — Tenant B","email":"shared@example.com"}'
```

This execution reaches:

```text
ambiten_tutorial_tenant_b
```

instead.

The application route did not change.

The service did not change.

The model did not change.

Only the active tenant changed.

## Step 15 — Read the two tenant views

Tenant A:

```bash
curl \
  http://localhost:3000/users \
  -H "x-tenant-id: tenant-a"
```

Tenant B:

```bash
curl \
  http://localhost:3000/users \
  -H "x-tenant-id: tenant-b"
```

You should see different tenant data.

Conceptually:

```text
same route
same service
same model
same collection name

tenant-a
→ database A

tenant-b
→ database B
```

That is the end-to-end result we deliberately postponed from Tutorial 6.

The existing list route returns an object, not a bare array. Inspect its `users` property alongside `routeContext` and the `execution` snapshots. For the requests above:

| Request tenant | `routeContext.tenantId` | User you just created |
| --- | --- | --- |
| `tenant-a` | `tenant-a` | Amina — Tenant A |
| `tenant-b` | `tenant-b` | Amina — Tenant B |

The `execution.beforeAwait`, `execution.afterAwait`, and helper metadata show that identity stays with the asynchronous execution. Other users may already be present if earlier checkpoints used these same databases.

Repeating the create requests may insert additional records; this example does not add a unique-email index. Use a fresh email if you want an unambiguous comparison. The key check is that a record created only for one tenant does not appear in the other tenant's view.

## What just happened

Tutorial 6 established:

```text
Request
      ↓
TenantResolver
      ↓
AmbitenContext.tenantId
```

Tutorial 7 adds:

```text
AmbitenContext.tenantId
      ↓
Tenant Infrastructure Resolution
      ↓
Tenant MongoClient
      ↓
Tenant Database
```

Together:

```text
HTTP Request
      ↓
Express Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
MultiTenantManager
      ↓
Tenant MongoClient
      ↓
Tenant Database
      ↓
MongoDB
```

## Two related infrastructure paths

There are two useful paths to understand.

### Model execution

```text
AmbitenContext
tenantId
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
MultiTenantManager
      ↓
Tenant Database
```

Application code simply performs:

```ts
await UserModel.find({});
```

### Direct AmbitenClient execution

When application or infrastructure code needs the client directly:

```ts
await client.db({
  tenantId
});
```

the path is:

```text
ModelContext
tenantId
      ↓
AmbitenClient
      ↓
TenantClientResolver
      ↓
MultiTenantManager
      ↓
Tenant Database
```

Both styles are valid.

The difference is where execution enters the database layer.

## Registration is not activation

At startup:

```text
tenant-a
→ registered
→ no client required yet
```

After first access:

```text
tenant-a
→ getClient()
→ MongoClient connected
→ client retained
```

That is why:

```json
{
  "connected": true
}
```

appears after infrastructure has been resolved.

Lazy tenant registration allows infrastructure to exist conceptually without forcing every tenant connection to become active during process startup.

## Tenant identity is still not authorization

The infrastructure now works end-to-end.

That still does not mean:

```text
x-tenant-id: tenant-a
```

proves that the caller is allowed to access Tenant A.

The security sequence remains:

```text
Authentication
→ who is the caller?

Tenant Resolution
→ which tenant is this execution for?

Authorization
→ may the caller act for that tenant?

Infrastructure Resolution
→ where does that tenant live?
```

This tutorial connects tenant identity to infrastructure. It does not implement authentication or tenant authorization.

## Why the database name remains infrastructure-owned

We continue to send:

```text
x-tenant-id: tenant-a
```

not:

```text
x-db-name:
ambiten_tutorial_tenant_a
```

That keeps:

```text
identity
```

separate from:

```text
topology
```

The application can later move Tenant A from one database or cluster to another without changing the public tenant identity.

The examples deliberately omit physical-routing headers. This checkpoint does not add middleware that rejects `x-db-name` or `x-collection-name`; omitting them in a request is not an enforcement mechanism. Treat this as a local teaching application. The later [Production Runtime checkpoint](/tutorials/12-production-runtime) explicitly guards those headers.

## Common mistakes

### Registering a tenant but not resolving its client

Registration means configuration exists.

It does not necessarily mean the tenant MongoClient has already connected.

Use the runtime resolution path when the tenant is actually needed.

### Giving AmbitenClient a tenantId without a resolver

Tenant-aware direct client operations require the client to know how to obtain the corresponding MongoClient.

Configure:

```ts
tenantResolver: {
  getClient:
    async (tenantId) =>
      MultiTenantManager.getClient(
        tenantId
      )
}
```

### Passing the database name from every route

Avoid:

```ts
await service(
  tenantId,
  dbName
);
```

when `dbName` is infrastructure derived from tenant configuration.

### Creating a model per tenant

Avoid:

```text
TenantAUserModel
TenantBUserModel
TenantCUserModel
```

when all tenants use the same logical model definition.

Tenant execution determines infrastructure.

### Mutating one global database selection

Do not implement concurrent tenant execution by globally switching one shared database name before every request.

Tenant routing should derive from execution-scoped identity.

## Verify the checkpoint

Before moving on, confirm:

- `GET /health` works without tenant identity.
- Tenant A's infrastructure response selects `ambiten_tutorial_tenant_a`.
- Tenant B's infrastructure response selects `ambiten_tutorial_tenant_b`.
- Each resolved tenant reports a retained client through `connected: true`.
- The same user model creates and reads different tenant data.
- Changing a tenant header changes execution scope, not shared model state.

`connected: true` means the manager retains a client after resolution. It is not a continuous health guarantee. Calling the inspection endpoint again uses the retained client rather than registering the tenant again.

## Checkpoint

The series now has:

```text
Tutorial 1
AmbitenClient

Tutorial 2
Schema + Model

Tutorial 3
CRUD

Tutorial 4
Express Adapter

Tutorial 5
Execution Context

Tutorial 6
Tenant Identity

Tutorial 7
Tenant Infrastructure Resolution
```

The multi-tenant runtime is now complete enough to support:

```text
request
→ tenant identity
→ context
→ model
→ tenant client
→ tenant database
```

The key mental model is:

```text
TenantResolver
identifies the tenant.

AmbitenContext
carries tenant identity.

AmbitenModel
binds execution to persistence.

MultiTenantManager
owns tenant infrastructure.

TenantClientResolver
provides MongoDB capability.

MongoDB
persists tenant data.
```

## Next tutorial

Return to the [tutorial catalog](/tutorials/), or continue to:

[Tutorial 8 — Transaction Continuity](/tutorials/08-transaction-continuity)

Now that tenant-aware database resolution works, the next concern is:

```text
How do multiple operations
participate in one MongoDB transaction
without manually passing the session
through every layer?
```

Tutorial 8 will introduce:

```text
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
AmbitenModel
      ↓
Effective ModelContext.session
      ↓
Participating Operations
```

The transaction boundary will own commit and rollback.

The individual model operations will participate in that boundary.
