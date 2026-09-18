# Tutorial 9 — Middleware and Lifecycle

> Estimated time: 20–25 minutes

Tutorial 8 introduced transaction continuity.

We now have an application capable of carrying:

```text
tenant identity
+
transaction state
```

through runtime execution.

But persistence behavior involves another class of concerns:

```text
normalize data before creation

enforce persistence policy

shape query filters

react after persistence

soft-delete documents

restore deleted documents
```

Those concerns should not need to be repeated inside every route or service.

In this tutorial we will introduce Ambiten model middleware and schema hooks.

The runtime becomes:

```text
Application
      ↓
AmbitenModel
      ↓
Model Before Middleware
      ↓
Validation
      ↓
Schema Pre Hook
      ↓
MongoDB
      ↓
Schema Post Hook
      ↓
Model After Middleware
      ↓
Application
```

We will then use model middleware to build a soft-delete lifecycle for users.

## What you will build

Our user lifecycle will support:

```text
create
→ normalize and enrich

find
→ hide deleted users by default

soft delete
→ mark a user as deleted

deleted-only read
→ inspect deleted users

restore
→ return a deleted user to active state

hard delete
→ explicitly remove a deleted user
```

Routes and services will remain focused on application behavior.

The lifecycle policy will live with the model layer.

## Starting point

Read [Tutorial 8 — Transaction Continuity](/tutorials/08-transaction-continuity) first. This chapter builds on the same execution and persistence concepts, but the saved lifecycle checkpoint is a focused application:

```text
examples/ambiten-tutorial/09-middleware-lifecycle/
├── src/
│   ├── core/
│   │   ├── db.ts
│   │   └── tenancy.ts
│   ├── models/user.model.ts
│   ├── policies/user-lifecycle.ts
│   ├── routes/users.routes.ts
│   ├── services/user.service.ts
│   └── index.ts
├── .env.example
├── package.json
├── package-lock.json
└── tsconfig.json
```

Its package name is `ambiten-tutorial-09-middleware-lifecycle`. No new dependency is needed for middleware or schema hooks.

The original progression starts from Tutorial 8. If implementing it yourself, copy source and configuration into a fresh directory, preserve any workflows you want to carry forward, and avoid copying dependencies, generated output, or private environment files. Do not overwrite the completed checkpoint.

The saved Tutorial 9 source shown here exposes the user lifecycle routes below; it does not contain the earlier infrastructure-inspection router or audit-transaction demonstration. Use Tutorial 7 or 8 for those examples. This read-through describes the actual Tutorial 9 checkpoint without implying that those endpoints are mounted here.

Use Node.js 22.13 or later and a reachable development MongoDB instance. These lifecycle operations work with standalone MongoDB. From the repository root:

```bash
cd examples/ambiten-tutorial/09-middleware-lifecycle
npm ci
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env`. Preserve an existing environment file. With pnpm, use `pnpm install`.

The example settings are:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
PORT=3000
```

The registry still maps `tenant-a` and `tenant-b` to their separate tutorial databases. `DB_NAME` is the base runtime database, not a replacement for those mappings.

Use a fresh email for this walkthrough if `lifecycle@example.com` already exists. These checkpoints share database names, and the model does not install a unique-email constraint.

## Step 1 — Understand lifecycle policy

Until now our model operations looked direct:

```ts
await UserModel.create(data);
```

or:

```ts
await UserModel.find({});
```

But a real model often needs policy around those operations.

For example:

```text
create user
      ↓
normalize email
      ↓
validate
      ↓
persist
      ↓
run post-persistence behavior
```

Likewise:

```text
find users
      ↓
apply visibility policy
      ↓
query MongoDB
```

Middleware provides a place for that behavior without putting it into every caller.

## Step 2 — Model middleware vs schema hooks

This tutorial uses two lifecycle layers.

### Model middleware

Model middleware is registered directly on `AmbitenModel`.

For example:

```ts
UserModel.beforeSave(
  async (ctx) => {
    // before create
  }
);
```

or:

```ts
UserModel.beforeFind(
  async (ctx) => {
    // before find
  }
);
```

Model middleware can inspect or modify operation state such as:

```text
filter
update
document
result
tenantId
dbName
session
operation metadata
```

### Schema hooks

Schema hooks belong to `AmbitenSchema`.

For example:

```ts
userSchema.pre(
  "create",
  async (ctx) => {
    // schema lifecycle
  }
);
```

and:

```ts
userSchema.post(
  "create",
  async (ctx) => {
    // after persistence
  }
);
```

The two mechanisms are related, but they are not the same layer.

The `post` example above illustrates the API. The saved checkpoint registers a schema pre-create guard, but no schema-post or model-after logging hooks. We will distinguish the runtime's lifecycle stages from the callbacks this application actually registers.

## Step 3 — Create lifecycle ordering

For `create()`, think about the lifecycle as:

```text
UserModel.create()
      ↓
Model Before Middleware
      ↓
Validation
      ↓
Schema Pre Hook
      ↓
MongoDB insert
      ↓
Schema Post Hook
      ↓
Model After Middleware
```

This ordering matters.

Suppose we want to normalize an email before validation.

The appropriate place is:

```text
Model Before Middleware
```

because that middleware runs before validation.

A schema pre-create hook occurs later in the create lifecycle.

## Step 4 — Extend User lifecycle state

The lifecycle adds `createdAt`, `isDeleted`, and `deletedAt` without replacing `name` or `email`. Both the schema and model are exported so startup policy can configure them.

The saved `src/models/user.model.ts` is:

```ts
import { AmbitenModel, AmbitenSchema } from "@ambiten/core";
import { client } from "../core/db.js";

export interface User {
	name: string;
	email: string;
	createdAt?: Date;
	isDeleted?: boolean;
	deletedAt?: Date | null;
}

export const userSchema = new AmbitenSchema<User>({
	name: String,
	email: String,
	createdAt: Date,
	isDeleted: Boolean,
	deletedAt: Date
});

export const UserModel = new AmbitenModel<User>({
	collectionName: "users",
	schema: userSchema,
	provider: client
});
```

The flags represent persistence state. An active user normally has `isDeleted: false`; a soft-deleted user has `isDeleted: true` and a deletion timestamp. Restoring resets the configured deleted flag and timestamp.

Defining these fields does not enable a soft-delete policy by itself. The next step configures which operations use them.

## Step 5 — Create the lifecycle policy

The active policy in `src/policies/user-lifecycle.ts` is shown below. An older commented-out alternative is omitted from this documentation excerpt; the running behavior is unchanged.

```ts
import { UserModel, userSchema } from "../models/user.model.js";
import { ModelContext } from '@ambiten/core';

let configured = false;

export function configureUserLifecycle() {
	if (configured) return;
	configured = true;

	UserModel.setSoftDeleteConfig({
		deletedAtField: "deletedAt",
		isDeletedField: "isDeleted"
	});

	UserModel.beforeSave(async (ctx: ModelContext) => {
		if (!ctx.doc) return;
		if (ctx.doc.email) ctx.doc.email = ctx.doc.email.trim().toLowerCase();

		ctx.doc.createdAt ??= new Date();
		ctx.doc.isDeleted ??= false;
	});

	userSchema.pre("create",
		async (ctx: ModelContext) => {
			if (!ctx.tenantId)
				throw new Error("Tenant context is required.");
		});

	UserModel.beforeFind(
		async (ctx: ModelContext) => {
			if (ctx.onlyDeleted) {
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: true
				};
				return;
			}

			if (!ctx.withDeleted)
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: { $ne: true }
				};
		});

	UserModel.beforeFindOne(
		async (ctx: ModelContext) => {
			if (ctx.onlyDeleted) {
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: true
				};

				return;
			}

			if (!ctx.withDeleted)
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: { $ne: true }
				};

		});

	UserModel.beforeDeleteOne(
		async (ctx: ModelContext) => {
			/*
			 * hardDelete means:
			 * do not convert this operation
			 * into a soft delete.
			 */
			if (ctx.hardDelete) {
				return;
			}

			/*
			 * Do not soft-delete something
			 * that is already deleted.
			 */
			const filter =
				ctx.filter ?? {};

			ctx.filter = {
				...filter,
				isDeleted: {
					$ne: true
				}
			};

			/*
			 * Tell AmbitenModel.deleteOne()
			 * to take its soft-delete branch.
			 */
			ctx.meta = {
				...(ctx.meta ?? {}),
				softDelete: true
			};

			/*
			 * deleteOne() requires the middleware
			 * to provide the soft-delete update.
			 */
			ctx.update = {
				$set: {
					isDeleted: true,
					deletedAt: new Date()
				}
			};
		}
	);

}
```

This policy has five jobs:

1. Configure the field names used by soft-delete and restore machinery.
2. Normalize email and supply creation defaults before create validation.
3. Require tenant context in the schema pre-create hook.
4. Apply read visibility to `find` and `findOne`.
5. Convert ordinary `deleteOne` intent into a soft-delete update.

`setSoftDeleteConfig()` names fields; it does not automatically turn every delete into a soft delete. The delete middleware must set `meta.softDelete` and provide `ctx.update`.

The create normalization is not an email-format validator or a uniqueness check. The current route checks that name and email are strings; stronger business validation is a separate policy.

## Step 6 — Why configuration is guarded

Our module contains:

```ts
let configured = false;
```

and:

```ts
if (configured) {
  return;
}
```

Middleware registration adds handlers to the model.

Calling setup repeatedly could therefore register the same policy more than once.

The guard makes lifecycle setup idempotent for this application.

## Step 7 — Register lifecycle policy at startup

The complete startup wiring in `src/index.ts` calls `configureUserLifecycle()` once before the server accepts requests:

```ts
import express, {
  type NextFunction,
  type Request,
  type Response
} from "express";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { MultiTenantManager } from "@ambiten/core";
import { client } from "./core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "./core/tenancy.js";
import { configureUserLifecycle } from "./policies/user-lifecycle.js";
import { usersRouter } from "./routes/users.routes.js";

const port = Number(process.env.PORT ?? 3000);
async function main() {
  registerTutorialTenants();
  await client.connect();

  configureUserLifecycle();

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  await createExpressAdapter().install(app, {
    tenancy: {
      header: "x-tenant-id",
      validate: async tenantId =>
        MultiTenantManager.hasTenant(tenantId)
    }
  });

  app.use("/users", usersRouter);

  app.use((
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => res.status(500).json({
      error: error instanceof Error
        ? error.message
        : "Unknown error"
    })
  );

  const server = app.listen(port, () =>
    console.log(`Ambiten API running on http://localhost:${port}`)
  );

  const shutdown = () => server.close(
    async () => {
      await closeTutorialTenants();
      await client.close();
      process.exit(0);
    });

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(
  async error => {
    console.error(error);
    await closeTutorialTenants();
    await client.close();
    process.exitCode = 1;
  });
```

Process setup and request execution remain separate:

```text
Process startup
  → register tenant infrastructure
  → connect base database client
  → configure model lifecycle once
  → install adapter and routes
  → listen

Each request
  → adapter establishes tenant context
  → route/service expresses intent
  → model runs the already registered policy
```

The health route precedes the tenant adapter. User routes run after it.

Use the existing scripts to check and start the checkpoint:

```bash
npm run typecheck
npm run build
npm run dev
```

With pnpm, use `pnpm typecheck`, `pnpm build`, and `pnpm dev`. Check liveness with `curl http://localhost:3000/health`; it returns `{"status":"ok"}` without a tenant header.

The HTTP commands in this page use Bash line continuations. In PowerShell, use a single-line `curl.exe` command or `Invoke-RestMethod` instead.

## Step 8 — Test create middleware

Create a user with deliberately untidy casing and whitespace:

```bash
curl \
  -X POST \
  http://localhost:3000/users \
  -H "x-tenant-id: tenant-a" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lifecycle User","email":"  Lifecycle@Example.COM  "}'
```

The model before middleware changes:

```text
"  Lifecycle@Example.COM  "
```

into:

```text
"lifecycle@example.com"
```

before validation and persistence.

It also adds:

```text
createdAt
isDeleted = false
```

## Step 9 — Observe lifecycle ordering

The create response is a user document with HTTP 201. Inspect its `email`, `createdAt`, and `isDeleted` values:

```text
email      = lifecycle@example.com
createdAt  = generated creation timestamp
isDeleted  = false
```

The relevant order for this operation is:

```text
model before:create
      ↓
validation of the normalized document
      ↓
schema pre:create
      ↓
MongoDB insert
      ↓
schema post:create stage
      ↓
model after:create stage
```

The checkpoint implements the first middleware and the schema pre-create guard. The runtime also has post/after stages, but the saved policy does not register callbacks that print them. Do not expect the four diagnostic log messages proposed in the draft to appear without adding those optional logging hooks.

A schema post-create hook or `UserModel.afterSave(...)` callback can observe the persisted result when registered. It is after the insert, not a guarantee that an enclosing transaction has already committed. External side effects such as sending email need their own consistency strategy.

## Step 10 — Add read visibility policy

Our `beforeFind()` middleware changes a normal query from:

```ts
{}
```

into:

```ts
{
  isDeleted: {
    $ne: true
  }
}
```

before MongoDB receives it.

So application code can still write:

```ts
await UserModel.find({});
```

while lifecycle policy determines which documents are normally visible.

This keeps the service API focused on:

```text
find users
```

instead of:

```text
find users
and remember the soft-delete predicate
every single time
```

## Step 11 — Explicit visibility modes

Application code expresses the desired visibility through model context:

```ts
// Default visibility: hide deleted records.
await UserModel.find({});

// Only records marked deleted.
await UserModel.find({}, { onlyDeleted: true });

// Do not add the default deleted-state predicate.
await UserModel.find({}, { withDeleted: true });
```

The `beforeFind` and `beforeFindOne` middleware interpret those flags:

| Mode | Effective deleted-state condition |
| --- | --- |
| Default | `isDeleted: { $ne: true }` |
| `onlyDeleted: true` | `isDeleted: true` |
| `withDeleted: true` | Leave the caller's filter unchanged |

`onlyDeleted` takes precedence if both flags are supplied. `withDeleted` does not discard other filter criteria. Normal reads also include older records whose `isDeleted` field is absent, because those records are not marked `true`.

These options change query visibility, not the caller's permissions. Authorization must still decide who may inspect deleted records.

## Step 12 — Add service operations

The saved `src/services/user.service.ts` does more than forward a delete call: it normalizes the lookup email, checks the required state, and returns a document for the HTTP response.

```ts
import { UserModel } from "../models/user.model.js";

export const listDeletedUsers = () => UserModel.find(
	{},
	{ onlyDeleted: true }
);

export const listUsersIncludingDeleted = () => UserModel.find(
	{}, { withDeleted: true }
);

export async function restoreUser(
  email: string
) {
  const normalizedEmail =
    email
      .trim()
      .toLowerCase();

  /*
   * Verify that the user actually exists
   * in the soft-deleted state.
   */
  const deletedUser =
    await UserModel.findOne(
      {
        email: normalizedEmail
      },
      {
        onlyDeleted: true
      }
    );

  if (!deletedUser) {
    throw new Error(
      `Deleted user "${normalizedEmail}" was not found.`
    );
  }

  /*
   * restoreOne() resets the configured
   * soft-delete fields.
   */
  await UserModel.restoreOne({
    email: normalizedEmail,
    isDeleted: true
  });

  /*
   * Verify the user is visible again
   * through the normal active-user policy.
   */
  const restoredUser =
    await UserModel.findOne({
      email: normalizedEmail
    });

  if (!restoredUser) {
    throw new Error(
      `User "${normalizedEmail}" could not be restored.`
    );
  }

  return restoredUser;
}

export async function softDeleteUser(
	email: string
) {
	const normalizedEmail =
		email
			.trim()
			.toLowerCase();

	const user =
		await UserModel.findOne({
			email: normalizedEmail
		});

	if (!user) {
		throw new Error(
			`Active user "${normalizedEmail}" was not found.`
		);
	}

	await UserModel.deleteOne({
		email: normalizedEmail
	});

	return user;
}

export async function purgeUser(
	email: string
) {
	const normalizedEmail =
		email
			.trim()
			.toLowerCase();

	/*
	 * Verify that a SOFT-DELETED user
	 * actually exists before purging.
	 */
	const user =
		await UserModel.findOne(
			{
				email: normalizedEmail
			},
			{
				onlyDeleted: true
			}
		);

	if (!user) {
		throw new Error(
			`Deleted user "${normalizedEmail}" was not found.`
		);
	}

	/*
	 * hardDelete flows into the middleware
	 * context, causing beforeDeleteOne()
	 * to leave the delete physical.
	 */
	await UserModel.deleteOne(
		{
			email: normalizedEmail,
			isDeleted: true
		},
		{
			hardDelete: true
		}
	);

	return user;
}
```

The intent is explicit:

- `listDeletedUsers()` uses deleted-only visibility.
- `listUsersIncludingDeleted()` permits both active and deleted records.
- `softDeleteUser()` first requires an active user.
- `restoreUser()` requires a deleted user, restores it, then reads through normal visibility to verify the new state.
- `purgeUser()` first requires a deleted user, then opts into physical removal.

The restore service deliberately re-reads the active user rather than relying on `restoreOne()` to return that document.

Soft delete and purge return the user found **before** the mutation. Their response payloads are not post-operation snapshots. Verify the resulting state through the read endpoints.

These are multi-operation workflows, not atomic state machines. This chapter does not wrap them in transactions or implement a concurrency/retry strategy.

## Step 13 — How soft delete works

A normal call:

```ts
await UserModel.deleteOne({
  email
});
```

first enters model middleware.

Our policy sets:

```ts
ctx.meta = {
  ...ctx.meta,
  softDelete: true
};
```

and:

```ts
ctx.update = {
  $set: {
    isDeleted: true,
    deletedAt: new Date()
  }
};
```

The effective operation therefore becomes:

```text
deleteOne intent
      ↓
beforeDeleteOne
      ↓
soft-delete metadata
+
update document
      ↓
MongoDB updateOne
```

The document remains in MongoDB.

Its state changes.

## Step 14 — Add lifecycle routes

The checkpoint uses an `email` **query parameter** for mutation targets:

| Method | Route | Service or model operation |
| --- | --- | --- |
| POST | `/users` | `UserModel.create(...)` |
| GET | `/users` | Normal `UserModel.find({})` |
| GET | `/users/deleted` | `listDeletedUsers()` |
| GET | `/users/with-deleted` | `listUsersIncludingDeleted()` |
| DELETE | `/users?email=...` | `softDeleteUser(email)` |
| POST | `/users/restore?email=...` | `restoreUser(email)` |
| DELETE | `/users/purge?email=...` | `purgeUser(email)` |

The draft's `/soft-delete/:email`, `/restore/:email`, and `/purge/:email` forms are not active routes in this saved checkpoint. Use the query-string forms in the commands below.

Here is the active `src/routes/users.routes.ts`, with the inactive commented-out route alternatives omitted:

```ts
import { Router } from "express";
import { UserModel } from "../models/user.model.js";
import {
	listDeletedUsers,
	listUsersIncludingDeleted,
	purgeUser,
	restoreUser,
	softDeleteUser
} from "../services/user.service.js";

export const usersRouter = Router();

usersRouter.delete(
	"/purge",
	async (req, res, next) => {
		try {
			const email =
				String(
					req.query.email ?? ""
				);

			if (!email) {
				return res
					.status(400)
					.json({
						error:
							"email query parameter is required."
					});
			}

			const user =
				await purgeUser(email);

			return res.json({
				message:
					"User permanently deleted.",
				user
			});
		} catch (error) {
			next?.(error);
		}
	}
);

/*
 * Ordinary delete = soft delete.
 */
usersRouter.delete(
	"/",
	async (req, res, next) => {
		try {
			const email =
				String(
					req.query.email ?? ""
				);

			if (!email) {
				return res
					.status(400)
					.json({
						error:
							"email query parameter is required."
					});
			}

			const user =
				await softDeleteUser(
					email
				);

			return res.json({
				message:
					"User soft-deleted.",
				user
			});
		} catch (error) {
			next?.(error);
		}
	}
);

usersRouter.post("/", async (req, res, next) => {
	try {
		const { name, email } = req.body;
		if (typeof name !== "string" || typeof email !== "string")
			return res.status(400).json({
				error: "name and email are required."
			});

		return res.status(201).json(
			await UserModel.create({ name, email })
		);

	} catch (error) {
		next?.(error);
	}
});

usersRouter.get("/deleted", async (_req, res, next) => {
	try {
		return res.json({
			users: await listDeletedUsers()
		});
	} catch (error) {
		next?.(error);
	}
});

usersRouter.get("/with-deleted", async (_req, res, next) => {
	try {
		return res.json({
			users: await listUsersIncludingDeleted()
		});
	} catch (error) {
		next?.(error);
	}
});

usersRouter.post(
	"/restore",
	async (
		req,
		res,
		next
	) => {
		try {
			const email =
				typeof req.query.email ===
					"string"
					? req.query.email
						.trim()
					: "";

			if (!email) {
				return res
					.status(400)
					.json({
						error:
							"email query parameter is required."
					});
			}

			const user =
				await restoreUser(
					email
				);

			return res
				.status(200)
				.json({
					status:
						"restored",

					user
				});
		} catch (error) {
			next?.(error);
		}
	}
);

usersRouter.get("/", async (_req, res, next) => {
	try {
		return res.json({
			users: await UserModel.find({})
		});
	} catch (error) {
		next?.(error);
	}
});
```

If you later add a generic `GET /users/:email` route, register `/deleted` and `/with-deleted` first so those literal names are not interpreted as email parameters.

Missing email query parameters return HTTP 400. Missing users cause these services to throw; this checkpoint's general error handler currently returns HTTP 500 for those errors. It does not implement a separate not-found error/status mapping.

## Step 15 — Soft-delete the user

Run this against the disposable user created in Step 8:

```bash
curl -X DELETE \
  "http://localhost:3000/users?email=lifecycle%40example.com" \
  -H "x-tenant-id: tenant-a"
```

The response has `message: "User soft-deleted."` and a `user` property. That user is the pre-delete snapshot returned by the service; it may still show `isDeleted: false`.

The persisted document remains in MongoDB, now with:

```text
email      = lifecycle@example.com
isDeleted  = true
deletedAt  = time of deletion
```

The next two read requests prove that state change. Encoding `@` as `%40` keeps the query value unambiguous; quote URLs that contain query parameters.

## Step 16 — Normal reads hide it

Run:

```bash
curl \
  http://localhost:3000/users \
  -H "x-tenant-id: tenant-a"
```

The lifecycle user should no longer appear in the ordinary result.

The document still exists.

The visibility policy changed the effective query.

## Step 17 — Read deleted users

Run:

```bash
curl \
  http://localhost:3000/users/deleted \
  -H "x-tenant-id: tenant-a"
```

Now the deleted user should appear.

The model call uses:

```ts
{
  onlyDeleted: true
}
```

and middleware converts that intent into:

```ts
{
  isDeleted: true
}
```

## Step 18 — Read everything

Run:

```bash
curl \
  http://localhost:3000/users/with-deleted \
  -H "x-tenant-id: tenant-a"
```

This bypasses the default soft-delete visibility filter.

Both active and deleted documents may be returned.

## Step 19 — Restore the user

Run:

```bash
curl -X POST \
  "http://localhost:3000/users/restore?email=lifecycle%40example.com" \
  -H "x-tenant-id: tenant-a"
```

The response contains `status: "restored"` and the re-read `user`.

The service uses `onlyDeleted: true` to find the deleted record, calls `restoreOne({ email, isDeleted: true })`, then looks it up again through the normal active-user policy.

The stored state changes from:

```text
isDeleted = true
deletedAt = Date
```

to:

```text
isDeleted = false
deletedAt = null
```

List active users again:

```bash
curl http://localhost:3000/users \
  -H "x-tenant-id: tenant-a"
```

The lifecycle user should appear in the response's `users` array. A deleted-only read should no longer include it.

## Step 20 — Hard delete explicitly

First soft-delete the test user again:

```bash
curl -X DELETE \
  "http://localhost:3000/users?email=lifecycle%40example.com" \
  -H "x-tenant-id: tenant-a"
```

Then permanently remove that deleted record:

```bash
curl -X DELETE \
  "http://localhost:3000/users/purge?email=lifecycle%40example.com" \
  -H "x-tenant-id: tenant-a"
```

The response contains `message: "User permanently deleted."` and the previously deleted user snapshot. The service supplies `hardDelete: true`, so middleware does not convert the delete into an update.

This is physical removal, not another state change. Only use the purge demonstration on disposable tutorial data; restoring cannot recover a purged record.

Finally, read both `/users/deleted` and `/users/with-deleted`. Neither should include the purged user. The service intentionally rejects purging a user that is still active.

## Step 21 — Why hard delete is explicit

The normal application behavior is now:

```text
delete
→ soft delete
```

Physical removal requires:

```text
hardDelete: true
```

That makes destructive intent visible in application code.

It does not mean every application must use soft deletion.

It means this model has been configured with that lifecycle policy.

## Step 22 — Middleware still receives execution state

Middleware runs with the effective operation context, including relevant tenant, database, collection, and session state. The schema pre-create guard reads `ctx.tenantId` from that execution rather than from a global mutable tenant variable.

If participating model operations already have an active MongoDB session, lifecycle callbacks remain within that operation flow. Middleware does not create or commit a transaction by itself; the enclosing boundary from Tutorial 8 owns that responsibility.

The lifecycle endpoints in this saved checkpoint do not start transactions. The read/check/write sequences in its services therefore should not be mistaken for transactional guarantees.

You can also repeat the create/read sequence with `x-tenant-id: tenant-b`. The same policy runs for the other tenant, but deleting a tenant-A user should not remove its tenant-B counterpart.

## Step 23 — Policy belongs near persistence behavior

Without middleware, the route might eventually contain logic like:

```ts
await UserModel.find({
  isDeleted: {
    $ne: true
  }
});
```

and:

```ts
await UserModel.updateOne(
  {
    email
  },
  {
    $set: {
      isDeleted: true,
      deletedAt:
        new Date()
    }
  }
);
```

repeated throughout the application.

That creates policy duplication.

Our architecture instead becomes:

```text
Route
→ application intent

Service
→ workflow intent

Model Middleware
→ persistence policy

Schema
→ schema lifecycle

MongoDB
→ persistence
```

## Step 24 — Scope of this checkpoint

This policy explicitly governs creation, `find`, `findOne`, and ordinary `deleteOne`. The restore service uses the model's dedicated restore operation.

It does not automatically apply the read-visibility filter to aggregation, bulk operations, raw collection access, updates, or every other MongoDB operation. Define the corresponding policy before relying on those paths to honor soft-delete visibility.

Nor does it implement authentication, authorization for deleted-record access, uniqueness, idempotent mutation endpoints, or atomic multi-step workflows. The tenant header is an identity demonstration, not proof that the caller may act for that tenant.

A useful completion check for the disposable lifecycle user is:

| After operation | Normal list | Deleted-only list | All-record list |
| --- | --- | --- | --- |
| Create | Present | Absent | Present |
| Soft delete | Absent | Present | Present |
| Restore | Present | Absent | Present |
| Soft delete, then purge | Absent | Absent | Absent |

This table tests the actual persistence result, rather than assuming a mutation response contains an updated document.

## What just happened

Before Tutorial 9:

```text
Application
      ↓
AmbitenModel
      ↓
MongoDB
```

We now have:

```text
Application
      ↓
AmbitenModel
      ↓
Model Before Middleware
      ↓
Validation
      ↓
Schema Pre Hook
      ↓
MongoDB
      ↓
Schema Post Hook
      ↓
Model After Middleware
```

And our user model now owns a lifecycle policy:

```text
Create
→ normalize / enrich

Read
→ apply visibility

Delete
→ state transition

Restore
→ clear deleted state

Purge
→ physical removal
```

## Runtime flow

The complete runtime architecture has now grown to:

```text
HTTP Request
      ↓
Express Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Application Service
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Model Middleware
      ↓
Schema Lifecycle
      ↓
Tenant Infrastructure
      ↓
MongoDB
      ↓
Post-operation Lifecycle
      ↓
HTTP Response
```

Context still determines execution.

The model still coordinates the operation.

Middleware now adds persistence policy.

The schema participates in operation lifecycle.

MongoDB performs persistence.

## Common mistakes

### Registering middleware for every request

Do not repeatedly call lifecycle configuration from route handlers.

Configure long-lived model policy once during application startup.

### Assuming soft delete is active automatically

Supporting soft-delete state is not the same as enabling a soft-delete policy.

This tutorial explicitly wires that policy into `deleteOne`, `find`, and `findOne`.

### Forgetting query visibility

Marking:

```text
isDeleted = true
```

is only half of a soft-delete implementation.

Ordinary reads must also decide whether deleted documents should remain visible.

### Making hard deletion implicit

If normal deletion means soft deletion, make permanent removal a distinct and intentional operation.

### Assuming aggregate automatically uses find middleware

`beforeFind()` governs `find`.

An aggregation pipeline is a different operation and requires its own applicable policy.

### Putting persistence policy into controllers

Routes should not need to remember every model invariant.

Keep model-specific lifecycle behavior close to the model layer.

## Checkpoint

The series now looks like:

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
Tenant Infrastructure

Tutorial 8
Transaction Continuity

Tutorial 9
Middleware + Lifecycle
```

The model runtime now handles more than persistence calls:

```text
Execution State
      ↓
Model Operation
      ↓
Lifecycle Policy
      ↓
Schema Lifecycle
      ↓
Persistence
```

## Next tutorial

Continue to:

[Tutorial 10 — Instrumentation](/tutorials/10-instrumentation)

Tutorial 10 will add runtime visibility:

```text
Execution Context
      ↓
Model Operation
      ↓
Query Instrumentation
      ↓
Observer / Runtime Signal
      ↓
Operational Insight
```

We will attach an execution-local observer and correlate query signals with tenant identity, request identity, operation, and collection scope without turning routes and services into telemetry plumbing.

You can also return to the [tutorial catalog](/tutorials/) or revisit [Transaction Continuity](/tutorials/08-transaction-continuity).
