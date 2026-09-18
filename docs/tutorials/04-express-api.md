# Tutorial 4 — Build an Express API

> Estimated time: 15–20 minutes

Tutorials 1–3 built direct infrastructure, a structured model, and CRUD. This tutorial changes the short-running script into a long-running HTTP application.

```text
HTTP Request → Express → Ambiten Express Adapter → Route Handler → AmbitenModel → AmbitenClient → MongoDB
```

## What you will build

The Workspace API provides `GET /health` plus `POST`, `GET`, `PATCH`, and `DELETE` user routes. Express changes how execution enters the application; it reuses the same `UserModel`, `AmbitenClient`, and MongoDB database.

## Setup

Copy Tutorial 3 into `examples/ambiten-tutorial/04-express-api`, run `pnpm install`, and configure:

```env
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
PORT=3000
```

The project adds `express` and `@ambiten/adapter-express`. It intentionally does not add tenancy, request-wide transactions, or `AmbitenBootstrapFactory`.

## Request boundary

The startup order is essential:

```text
Express body parsing
      ↓
Ambiten adapter installation
      ↓
Application routes
```

The adapter must be installed before the routes it wraps. Express owns HTTP concerns; the adapter connects framework execution to Ambiten; `UserModel` owns persistence.

## Routes

The completed `usersRouter` translates HTTP input into model operations. It validates bodies, returns `400` or `404` at the HTTP boundary, and routes database work through `UserModel`. It never creates a client or resolves a collection itself.

```text
POST /users          → UserModel.create()
GET /users           → UserModel.find({})
GET /users/:email    → UserModel.findOne()
PATCH /users/:email  → updateOne(), then findOne()
DELETE /users/:email → deleteOne(), then 204
```

## Run and test

```bash
pnpm dev
curl http://localhost:3000/health
```

Expected health response:

```json
{ "status": "ok" }
```

Create a user:

```bash
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Amina","email":"amina@team.io"}'
```

Use `amina%40team.io` when passing the email in a URL. The source includes the full CRUD routes and graceful client shutdown on `SIGINT` and `SIGTERM`.

## Runtime flow

```text
HTTP Request
      ↓
Express
      ↓
Ambiten Express Adapter
      ↓
Route Handler
      ↓
AmbitenModel
      ↓
AmbitenSchema
      ↓
AmbitenClient
      ↓
MongoDB
      ↓
HTTP Response
```

There is now a genuine request boundary, but context, tenancy, and transactions remain deliberately unexplored.

## Common mistakes

- Registering application routes before installing the adapter.
- Creating or closing a database client inside every route.
- Passing Express `req` or `res` into `UserModel`.
- Putting MongoDB configuration in routes.

## Next tutorial

Continue to [Tutorial 5 — Execution Context](/tutorials/05-execution-context), where the adapter-established `AmbitenContext` becomes explicit.
