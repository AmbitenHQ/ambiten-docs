# Tutorial 2 — Schema and Model

> Estimated time: 10–15 minutes

In Tutorial 1, you accessed MongoDB directly through `AmbitenClient`:

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

That remains a valid Ambiten usage pattern. As an application grows, though, application code should not repeatedly own collection identity, document shape, persistence behavior, and provider selection.

This tutorial makes one architectural jump: direct collection access becomes schema-bound model execution.

```text
Application
      ↓
AmbitenModel
      ↓
Schema / Model Behavior
      ↓
Collection Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

We are still not introducing framework adapters, runtime context, multi-tenancy, transactions, or full CRUD.

## What you will build

We continue the Workspace application, which still has only users:

```text
Workspace
      ↓
Users
```

Instead of requesting `client.collection<User>("users")` in application code, define a reusable persistence boundary:

```ts
const UserModel = new AmbitenModel<User>({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

The application then uses `UserModel.create(...)` and `UserModel.findOne(...)`.

## What you need

Complete [Tutorial 1 — Your First Ambiten Application](/tutorials/01-first-ambiten-app) first. You need Node.js 20+, pnpm, MongoDB, `@ambiten/core`, and `mongodb`.

## Starting point

Copy the Tutorial 1 checkpoint and move into it:

```bash
cp -R examples/ambiten-tutorial/01-first-app examples/ambiten-tutorial/02-schema-model
cd examples/ambiten-tutorial/02-schema-model
```

PowerShell:

```powershell
Copy-Item -Recurse examples/ambiten-tutorial/01-first-app examples/ambiten-tutorial/02-schema-model
```

The finished source layout is:

```text
src/
├── core/
│   └── db.ts
├── models/
│   └── user.model.ts
└── index.ts
```

This separates infrastructure, domain persistence, and application execution without adding unnecessary architecture.

## Step 1 — Move database infrastructure into `core`

Create `src/core/db.ts` and move the Tutorial 1 `AmbitenClient` configuration into it. The client is reusable process infrastructure and will become the model's database provider.

```ts
export const client = new AmbitenClient({
  uri,
  options: { dbName }
});
```

## Step 2 — Define the User type and schema

Create `src/models/user.model.ts`:

```ts
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
```

TypeScript describes the code shape; `AmbitenSchema` participates in runtime persistence behavior. For example, model creation validates its input through the attached schema before insertion.

## Step 3 — Create an AmbitenModel

Add the client import using its `.js` runtime extension, then create the model:

```ts
import { client } from "../core/db.js";

export const UserModel = new AmbitenModel<User>({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

The model owns the `users` collection boundary; the schema supplies persistence behavior; the provider supplies database capability.

```text
UserModel
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

## Step 4 — Use the model

`src/index.ts` connects the reusable client and calls the model:

```ts
const createdUser = await UserModel.create({
  name: "Amina",
  email,
  createdAt: new Date()
});

const foundUser = await UserModel.findOne({ email });
```

The timestamp in `email` makes repeated runs independent of cleanup from a previous run.

The operation path is now:

```text
Application
      ↓
UserModel.create()
      ↓
Schema participation
      ↓
Collection Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

## Notice the returned `_id`

MongoDB driver collections expose identifiers as `ObjectId` values. `AmbitenModel` returns normalized model results, so model `_id` values are strings. This is the first observable difference between direct collection and model execution.

## Run the application

Make sure MongoDB is running, then run:

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm start
```

Expected output is similar to:

```text
Connected to MongoDB.

Created user: { name: 'Amina', email: 'amina....@team.io', createdAt: ..., _id: '...' }
Found user: { name: 'Amina', email: 'amina....@team.io', createdAt: ..., _id: '...' }
```

## What just happened

Tutorial 1 used a direct MongoDB collection. Tutorial 2 adds structured persistence:

```text
Application
      ↓
AmbitenModel
      ↓
AmbitenSchema
      ↓
Collection Resolution
      ↓
DbProvider
      ↓
AmbitenClient
      ↓
MongoDB
```

Direct access remains available. The model layer is introduced when reusable persistence behavior becomes useful.

### Schema vs Model

`AmbitenSchema` defines document structure, validation, schema hooks, and lifecycle behavior. `AmbitenModel` coordinates collection operations, schema participation, middleware participation, and provider resolution.

```text
Schema → what persistence behavior belongs to the document
Model  → how an operation is coordinated against the collection
```

## Runtime flow

```text
Application
      ↓
UserModel
      ↓
AmbitenSchema
      ↓
Collection Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

There is still no `AmbitenContext`, framework adapter, tenant resolution, transaction boundary, or background execution.

## Common mistakes

### Missing `.js` in local imports

With NodeNext/ESM, use `../core/db.js`, not `../core/db`. The source uses the emitted JavaScript extension.

### Forgetting to connect the provider

Call `await client.connect()` before model operations. The model uses that client as its provider.

### Creating a client for every operation

`AmbitenClient` is reusable process-level infrastructure. Create it once and supply it where database capability is needed.

### Bypassing the model unintentionally

Direct `client.collection("users")` access remains valid, but a workflow designed around `UserModel` should normally route persistence operations through the model so schema and lifecycle behavior can participate.

## Checkpoint

You now have an Ambiten application with `AmbitenClient`, `AmbitenSchema`, and `AmbitenModel`.

```text
Schema defines persistence behavior.
Model coordinates the operation.
Provider supplies infrastructure.
AmbitenClient provides MongoDB capability.
MongoDB performs persistence.
```

## Next tutorial

Continue to [Tutorial 3 — CRUD With Ambiten](/tutorials/03-crud-with-ambiten). It keeps this `UserModel` and focuses on its complete CRUD surface.
