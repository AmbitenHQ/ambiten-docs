# Tutorial 8 — Transaction Continuity

> Estimated time: 20–25 minutes

Tutorial 7 completed tenant infrastructure resolution. Some workflows need more than one database operation to succeed or fail together. This tutorial creates a user and an audit record in one explicit transaction.

```text
Request
   ↓
Tenant Context
   ↓
Workflow Transaction Boundary
   ↓
ClientSession
   ↓
AmbitenContext.session
   ↓
UserModel + AuditLogModel
   ↓
same transaction
```

## What you will learn

- A transaction boundary owns commit and rollback.
- Model operations participate in that boundary.
- `AmbitenContext.session` carries the active session through the workflow.
- One tenant-aware transaction can write to `users` and `audit_logs` atomically.
- MongoDB transactions do not roll back external side effects.

## Prerequisite — transaction-capable MongoDB

MongoDB transactions require a replica set or a sharded cluster. A standalone local MongoDB server rejects transactional writes. Use a single-node replica set or MongoDB Atlas before testing this checkpoint.

## Starting point

Copy Tutorial 7 into `examples/ambiten-tutorial/08-transaction-continuity`. The tenant resolver, lazy tenant registrations, and adapter tenancy configuration remain unchanged.

## Step 1 — Add the audit model

`AuditLogModel` uses the same tenant-aware provider as `UserModel`, but writes to `audit_logs`:

```ts
export const AuditLogModel = new AmbitenModel<AuditLog>({
  collectionName: "audit_logs",
  schema: auditLogSchema,
  provider: client
});
```

Each tenant database now contains two logical collections:

```text
tenant database
├── users
└── audit_logs
```

## Step 2 — Establish one workflow boundary

The service uses `UserModel.runInTransaction(...)`:

```ts
return UserModel.runInTransaction(async () => {
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    createdAt: new Date()
  });

  const audit = await AuditLogModel.create({
    action: "USER_CREATED",
    userEmail: input.email,
    createdAt: new Date()
  });

  return { user, audit };
});
```

The boundary resolves a provider-managed session and makes it available in `AmbitenContext`. Both normal model `create()` calls obtain the same active session through their effective model context.

Do not manually create and pass a session through every service method. The execution boundary already carries it.

## Step 3 — Commit and rollback

A successful request commits both writes. The `simulateFailure` option throws after the user write but before the audit write:

```text
Transaction begins
      ↓
UserModel.create()
      ↓
throw Error
      ↓
transaction does not commit
```

The user write is rolled back because it participated in the enclosing boundary.

## HTTP route

Mount a tenant-aware route:

```text
POST /users/transactional
```

It accepts `name`, `email`, and optional `simulateFailure`. The route translates HTTP input and output; it does not own `ClientSession` creation or transaction lifecycle.

Keep `enableTransactions: true` off the Express adapter in this tutorial. That would be an execution-wide transaction style. Tutorial 8 deliberately teaches an explicit workflow transaction.

## Run and test

```bash
pnpm install
pnpm typecheck
pnpm dev
```

Successful transaction for Tenant A:

```bash
curl -X POST http://localhost:3000/users/transactional -H "x-tenant-id: tenant-a" -H "Content-Type: application/json" -d '{"name":"Maya","email":"maya@example.com"}'
```

Expected response includes tenant identity and `sessionActive: true`, along with a created user and `USER_CREATED` audit record.

Force a rollback:

```bash
curl -X POST http://localhost:3000/users/transactional -H "x-tenant-id: tenant-a" -H "Content-Type: application/json" -d '{"name":"Rollback User","email":"rollback@example.com","simulateFailure":true}'
```

The response contains `Intentional transaction failure.` and Tenant A must not contain `rollback@example.com` afterward.

## Runtime flow

```text
HTTP Request
      ↓
Express Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext: tenantId
      ↓
Transaction Boundary
      ↓
AmbitenContext: tenantId + session
      ↓
UserModel + AuditLogModel
      ↓
Effective ModelContext: tenantId + session
      ↓
Tenant Database
      ↓
commit / rollback
```

## Common mistakes

- Starting one transaction per model operation instead of one workflow transaction.
- Enabling adapter-wide transactions and nesting explicit transactions without a reason.
- Expecting email, HTTP calls, queues, uploads, or payments to roll back with MongoDB.
- Testing against standalone MongoDB.
- Assuming arbitrary raw driver calls participate without receiving the active session.

## Checkpoint

The execution context now carries both tenant identity and an active transaction session. Tenant infrastructure answers where the work occurs; the transaction boundary answers which database operations form one atomic unit.

## Next tutorial

Continue to Tutorial 9 — Middleware and Lifecycle, where persistence policy moves into schema and middleware behavior.
