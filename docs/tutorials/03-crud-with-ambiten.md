# Tutorial 3 — CRUD With Ambiten

> Estimated time: 10–15 minutes

Tutorial 2 introduced `AmbitenSchema` and `AmbitenModel`. This tutorial completes the basic persistence cycle without adding an architectural layer.

```text
Create → Read → Update → Delete
```

## What you will build

The existing `UserModel` creates a user, reads one and many matching users, updates it, reads the updated state, deletes it, and confirms deletion.

## Starting point

Copy `examples/ambiten-tutorial/02-schema-model` to `examples/ambiten-tutorial/03-crud`. The source structure remains unchanged: `core/db.ts` owns infrastructure, `models/user.model.ts` owns persistence definition, and `index.ts` owns application workflow.

## CRUD through the model

```ts
const createdUser = await UserModel.create({ name: "Amina", email, createdAt: new Date() });
const foundUser = await UserModel.findOne({ email });
const users = await UserModel.find({ email });

await UserModel.updateOne({ email }, {
  $set: { name: "Amina Yusuf" }
});

const updatedUser = await UserModel.findOne({ email });

await UserModel.deleteOne({ email });
const deletedUser = await UserModel.findOne({ email });
```

Filters and update documents retain MongoDB semantics. `findOne()` returns a normalized model result or `null`; `find()` returns normalized model results. `updateOne()` and `deleteOne()` resolve when their mutation finishes, so read again when the workflow needs the resulting state.

## Run the application

With MongoDB running:

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm start
```

The output logs `CREATE`, `READ ONE`, `READ MANY`, `UPDATE`, and `DELETE`; the final value is `null`.

## Runtime flow

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

## Common mistakes

- Do not expect `updateOne()` or `deleteOne()` to return a document; follow with `findOne()`.
- Use MongoDB update operators such as `$set`.
- Use `findOne()` for one document and `find()` for an array.
- Keep model-oriented workflows on `UserModel` so schema and lifecycle behavior participates consistently.

## Checkpoint

The model is now a complete basic CRUD surface: `create`, `findOne`, `find`, `updateOne`, and `deleteOne`. The architecture is unchanged; only the operations flowing through it expanded.

## Next tutorial

Continue to [Tutorial 4 — Build an Express API](/tutorials/04-express-api). The persistence layer is ready for its first HTTP execution boundary.
