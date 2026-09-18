# Tutorial 1 — Your First Ambiten Application

> Estimated time: 10 minutes

In this tutorial, you will create the smallest useful Ambiten application.

You will connect to MongoDB with `AmbitenClient`, access a MongoDB collection, write a document, read it back, and close the connection.

We are intentionally **not** introducing schemas, models, context, adapters, multi-tenancy, or transactions yet.

The starting point is simply:

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

By the end of this tutorial, you will have a working Ambiten application using the published `@ambiten/core` package.

## What you will build

We are beginning a small Workspace application that will grow throughout this tutorial series. Eventually it will contain users, projects, tasks, audit records, multi-tenancy, transactions, middleware, instrumentation, and background work.

For now, we only need one `users` collection.

```text
Workspace
      ↓
users
```

The application will:

```text
Connect
   ↓
Open users collection
   ↓
Insert user
   ↓
Read user
   ↓
Close connection
```

## What you need

You need Node.js 20 or later, pnpm, and access to a MongoDB instance. The simplest setup is MongoDB running locally on `mongodb://127.0.0.1:27017`.

If you use Docker, start a temporary MongoDB instance with:

```bash
docker run \
  --name ambiten-tutorial-mongo \
  -p 27017:27017 \
  -d mongo:7
```

Verify that it is running with:

```bash
docker ps
```

## Starting point

Open the first tutorial example:

```bash
cd examples/ambiten-tutorial/01-first-app
```

```text
01-first-app/
├── src/
│   └── index.ts
├── .env.example
├── package.json
└── tsconfig.json
```

This project is independent from the Ambiten monorepo. It installs the published package exactly as an external application would.

## Step 1 — Install Ambiten

Install the project dependencies:

```bash
pnpm install
```

The runtime dependencies are:

```json
{
  "dependencies": {
    "@ambiten/core": "^1.2.4",
    "mongodb": "^6.21.0"
  }
}
```

`@ambiten/core` provides `AmbitenClient`. The MongoDB package provides the driver capability that Ambiten uses.

## Step 2 — Configure MongoDB

Copy the example environment file:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

The configuration is:

```env
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
```

`MONGO_URI` identifies the server; `DB_NAME` selects this tutorial's database. MongoDB creates the database resources when data is written.

## Step 3 — Create an AmbitenClient

In `src/index.ts`, import `AmbitenClient`, define the `User` document shape, read `MONGO_URI` and `DB_NAME`, then create the client:

```ts
const client = new AmbitenClient({
  uri,
  options: { dbName }
});
```

At this stage, the architecture is deliberately still small:

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

`AmbitenClient` can be used directly when a model abstraction is not needed.

## Step 4 — Connect and access a collection

Connect, then request a typed MongoDB collection:

```ts
await client.connect();

const users = await client.collection<User>("users");
```

`AmbitenClient.collection()` gives you a MongoDB collection, so familiar operations such as `findOne()`, `insertOne()`, `updateOne()`, `deleteOne()`, and `aggregate()` remain available.

## Step 5 — Write and read a user

The example removes its predictable test user, inserts it, and reads it back:

```ts
const email = "amina@team.io";

await users.deleteMany({ email });

const result = await users.insertOne({
  name: "Amina",
  email,
  createdAt: new Date()
});

const user = await users.findOne({
  _id: result.insertedId
});
```

MongoDB returns the inserted identifier through `result.insertedId`.

## Step 6 — Close the client

The example closes the short-lived script client in a `finally` block:

```ts
try {
  // database work
} finally {
  await client.close();
}
```

A long-running API server usually keeps the client open for the process lifetime and closes it during graceful shutdown.

## Complete application

The full source is available at [`examples/ambiten-tutorial/01-first-app/src/index.ts`](../../examples/ambiten-tutorial/01-first-app/src/index.ts). It creates a single `AmbitenClient`, connects, writes and reads `Amina`, and guarantees client cleanup.

## Run the application

Start the tutorial:

```bash
pnpm dev
```

Expected output is similar to:

```text
Connected to MongoDB through AmbitenClient.

User found: {
  _id: ObjectId(...),
  name: 'Amina',
  email: 'amina@team.io',
  createdAt: ...
}
```

The identifier and timestamp differ on every run.

## Verify the TypeScript project

```bash
pnpm typecheck
pnpm build
pnpm start
```

## What just happened

You used Ambiten without a model, framework, adapter, or runtime context:

```text
new AmbitenClient(...)
      ↓
client.connect()
      ↓
client.collection("users")
      ↓
MongoDB Collection
      ↓
insertOne() → findOne()
      ↓
client.close()
```

`AmbitenClient` stays close to MongoDB. It provides the database capability that the rest of the runtime later builds upon.

## Runtime flow

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

There is no `AmbitenContext`, Effective `ModelContext`, tenant resolution, transaction boundary, or framework adapter yet. Those are introduced only when they solve a problem the application has reached.

## Common mistakes

### MongoDB is not running

For `ECONNREFUSED 127.0.0.1:27017`, ensure MongoDB is running and that the URI in `.env` is correct.

### The `.env` file is missing

Copy `.env.example` to `.env` before running `pnpm dev`.

### `mongodb` is missing

Install dependencies from the `01-first-app` directory with `pnpm install`. The MongoDB driver must be installed alongside Ambiten.

### Creating a client for every operation

Create infrastructure once and reuse it over the ordinary application lifecycle; do not create a separate `AmbitenClient` per database operation.

## Checkpoint

You now have a working Ambiten application that:

- connects through `AmbitenClient`
- accesses a collection directly
- writes and reads a document
- cleans up the client lifecycle
- uses the published `@ambiten/core` package

The mental model is:

```text
AmbitenClient provides MongoDB capability.

MongoDB performs persistence.
```

## Next tutorial

Continue to [Tutorial 2 — Schema and Model](/tutorials/02-schema-and-model).

Tutorial 2 moves the direct `users` collection behind:

```text
AmbitenSchema
      ↓
AmbitenModel
      ↓
AmbitenClient
      ↓
MongoDB
```
