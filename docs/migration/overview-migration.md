# Migration

Migration to Ambiten is not necessarily a rewrite.

It is a transition toward clearer execution boundaries around MongoDB access, context propagation, model operations, tenant infrastructure, transactions, middleware, and instrumentation.

The goal is to preserve existing MongoDB data and application behavior where possible while progressively moving execution concerns into a more explicit runtime structure.

Ambiten is designed for incremental adoption.

<DocOverviewCards
  eyebrow="Migration Path"
  title="Adopt Ambiten one execution boundary at a time."
  description="Preserve existing MongoDB data while progressively introducing AmbitenClient, models, context binding, tenant infrastructure, transactions, middleware, and instrumentation."
  accent="#d38a49"
  :signals='[
    "Existing collections",
    "AmbitenClient",
    "AmbitenModel",
    "Context",
    "Transactions"
  ]'
  :cards='[
    {
      "label": "Preserve",
      "title": "Keep existing MongoDB data",
      "text": "Collections, indexes, and documents can usually remain unchanged while Ambiten is introduced around the existing persistence layer."
    },
    {
      "label": "Adopt",
      "title": "Introduce runtime structure progressively",
      "text": "Start with direct AmbitenClient usage or model-based access, then add context, transactions, tenant infrastructure, and adapters where they are useful."
    },
    {
      "label": "Clarify",
      "title": "Separate execution from infrastructure",
      "text": "Execution state, model operation state, tenant infrastructure, transaction ownership, and persistence behavior become distinct responsibilities."
    }
  ]'
  :flow='[
    {
      "label": "Step 1",
      "title": "Adopt Ambiten access"
    },
    {
      "label": "Step 2",
      "title": "Introduce models"
    },
    {
      "label": "Step 3",
      "title": "Establish context"
    },
    {
      "label": "Step 4",
      "title": "Adopt runtime features"
    }
  ]'
/>

## What changes during migration

Most MongoDB applications already have:

```text
collections
indexes
document structures
query flows
service boundaries
transaction patterns
```

Migration changes how execution is coordinated around those systems.

Instead of allowing tenant identity, database selection, transaction sessions, query policy, and instrumentation metadata to move through application code in unrelated ways, Ambiten provides clearer runtime boundaries for carrying and resolving that state.

A model-driven execution path can become:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Infrastructure Resolution
      ↓
AmbitenClient
      ↓
MongoDB
```

Not every application needs every layer immediately.

## Migration does not require one starting point

Ambiten supports progressive adoption.

A low-level MongoDB application can begin with:

```text
Application
      ↓
AmbitenClient
      ↓
MongoDB
```

A model-oriented application may instead begin with:

```text
Application
      ↓
AmbitenModel
      ↓
AmbitenClient
      ↓
MongoDB
```

Runtime context can then be introduced where execution state needs to flow across operations:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application
      ↓
AmbitenModel
```

This allows migration to follow the architecture that already exists rather than forcing every project through the same sequence.

## A common migration progression

One common path is:

```text
Existing MongoDB Access
      ↓
AmbitenClient
      ↓
AmbitenSchema + AmbitenModel
      ↓
AmbitenContext
      ↓
Tenant Infrastructure
      ↓
Transaction Boundaries
      ↓
Adapters / Instrumentation
```

Another application may introduce only part of that stack.

The important goal is to make each adopted boundary explicit and testable.

## Introducing AmbitenClient

Existing direct MongoDB code can migrate incrementally through `AmbitenClient`.

```ts
import {
  AmbitenClient
} from "@ambiten/core";

const client =
  new AmbitenClient({
    uri:
      process.env.MONGODB_URI,

    options: {
      dbName: "my-app"
    }
  });

await client.connect();
```

Direct client usage remains a supported Ambiten execution model.

Applications do not need to introduce schemas, models, adapters, or multi-tenancy before Ambiten becomes useful.

## Introducing models

When reusable model behavior is useful, wrap existing collections with `AmbitenSchema` and `AmbitenModel`.

```ts
const UserModel =
  new AmbitenModel({
    collectionName: "users",
    schema: userSchema,
    provider: client
  });
```

An existing MongoDB collection usually does not need to be recreated simply because it is now accessed through Ambiten.

However, review schema assumptions, lifecycle behavior, middleware, and document conventions before treating an existing collection as fully equivalent to a new Ambiten model.

Direct driver calls can then be replaced progressively where model behavior is beneficial.

## Introducing context

Once operations need execution-scoped state, introduce `AmbitenContext`.

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a"
  },
  async () => {
    await UserModel.find({});
  }
);
```

`AmbitenContext` carries the broader execution state.

During model execution, `AmbitenModel` derives the persistence-facing state used by the operation:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

This distinction matters.

```text
AmbitenContext
= execution-scoped runtime state

ModelContext
= persistence-facing operation state
```

Context therefore does not simply replace every parameter previously passed through application code.

It carries state that genuinely belongs to the execution.

## Moving tenant handling

Older systems may pass tenant identity through multiple service methods:

```ts
await UserService.create(
  data,
  tenantId
);
```

A runtime-bound execution can instead establish tenant identity once:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a"
  },
  async () => {
    await UserModel.create(
      data
    );
  }
);
```

The model can then inherit the tenant identity through its Effective `ModelContext`.

Tenant identity and tenant infrastructure should remain separate:

```text
Who is this execution for?
→ TenantResolver

Carry tenant identity
→ AmbitenContext

Where does the tenant live?
→ TenantConfigResolver /
  MultiTenantManager

Give me the MongoClient
→ TenantClientResolver /
  MultiTenantManager
```

Tenant-aware execution does not replace authentication or authorization.

## Moving transaction handling

Legacy applications often pass MongoDB sessions manually.

Before:

```ts
await UserModel.create(
  data,
  {
    session
  }
);

await AuditModel.create(
  log,
  {
    session
  }
);
```

An explicit Ambiten transaction boundary can carry the session through the execution:

```ts
await AmbitenContext.withTransaction(
  async () => {
    await UserModel.create(
      data
    );

    await AuditModel.create(
      log
    );
  }
);
```

The session flow becomes:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Participating Operations
```

The enclosing transaction boundary owns:

```text
start
commit
rollback
completion
```

Participating Ambiten operations can reuse that session without every application layer manually forwarding it.

This applies to participating MongoDB work.

External APIs, queues, filesystems, object storage, and other side effects do not automatically become part of the MongoDB transaction.

## Migrating from Mongoose

A Mongoose migration usually involves both data-access APIs and execution behavior.

For example, an existing application may combine tenant filtering and explicit session propagation:

```ts
await User.findOneAndUpdate(
  {
    _id: id,
    tenantId
  },
  data,
  {
    session
  }
);
```

An Ambiten model operation may instead execute inside an already established tenant and transaction context:

```ts
await UserModel.findOneAndUpdate(
  {
    _id: id
  },
  data
);
```

Whether the tenant identifier should remain in the query depends on the application's tenant topology.

For example:

```text
Database-per-tenant
→ tenant separation may occur through infrastructure resolution
```

while:

```text
Shared collection
→ tenant discrimination may still need to appear in the filter
```

Migration should therefore preserve the application's actual isolation model rather than mechanically removing tenant fields from queries.

## Migrating from Prisma

Prisma and Ambiten use different abstractions.

Prisma structures access around a generated client and schema model.

Ambiten structures MongoDB execution around clients, models, runtime context, and infrastructure resolution.

A simple operation may look similar at the surface.

Before:

```ts
await prisma.user.create({
  data
});
```

After:

```ts
await UserModel.create(
  data
);
```

But this should not be treated as a one-to-one API migration.

If Prisma is being used with MongoDB, review:

```text
schema definitions
generated types
relation assumptions
transactions
indexes
query semantics
middleware
application services
```

before replacing Prisma access.

Ambiten is specifically oriented around MongoDB runtime execution rather than acting as a general replacement for every Prisma architecture.

## Preserving existing data

Ambiten operates against MongoDB infrastructure.

Existing:

```text
collections
indexes
documents
document identifiers
```

can usually remain intact.

Migration happens primarily around how those resources are accessed and how execution state reaches persistence operations.

That does not mean every existing application convention should remain unchanged.

Review:

```text
schema expectations
soft-delete fields
tenant topology
index strategy
transaction assumptions
connection lifecycle
middleware behavior
```

as each model is migrated.

## Migrating middleware

Existing persistence hooks can often move toward Ambiten schema middleware where the behavior belongs close to the data boundary.

For example:

```ts
userSchema.pre(
  "updateOne",
  async (ctx) => {
    ctx.update.$set = {
      ...(ctx.update.$set || {}),
      updatedAt:
        new Date()
    };
  }
);
```

Good middleware candidates include:

```text
normalization
timestamps
persistence metadata
soft-delete behavior
query shaping
persistence-level policy
```

Application authentication, authorization, payment policy, approval workflows, and unrelated business rules should not be moved into middleware merely because middleware exists.

## Migrating instrumentation

Legacy applications may scatter logging around data access:

```ts
console.log(
  "Creating user"
);

await UserModel.create(
  data
);
```

Instrumentation can instead use structured execution information where appropriate.

```ts
await measureQuery(
  {
    operation:
      "create",

    collectionName:
      "users",

    extra: {
      feature:
        "user.create"
    }
  },
  async () => {
    return UserModel.create(
      data
    );
  }
);
```

`AmbitenContextState` can carry runtime metadata such as:

```text
tenantId
requestId
dbName
loggerMeta
debug
meta
observer
budget
```

Ambiten makes execution metadata available to instrumentation.

The logging, tracing, metrics, or telemetry backend remains responsible for transporting and storing those signals.

## Gradual replacement strategy

Migration does not need to happen all at once.

Existing MongoDB access and Ambiten-based access can coexist while individual execution paths are migrated.

For example:

```text
Legacy Path A
→ MongoDB Driver

Migrated Path B
→ AmbitenModel
→ AmbitenClient
→ MongoDB
```

This can reduce migration risk.

However, care is required when old and new access patterns participate in the same transaction or tenant-sensitive workflow.

A legacy driver operation will not automatically inherit Ambiten context merely because nearby Ambiten model operations do.

If the two paths share a transaction, session participation must remain explicit and compatible.

## Recommended migration order

A practical migration sequence is:

```text
1. Inventory current MongoDB access

2. Introduce AmbitenClient where useful

3. Introduce AmbitenSchema and AmbitenModel

4. Validate existing collection behavior

5. Establish AmbitenContext around execution boundaries

6. Move tenant identity into execution context

7. Configure tenant infrastructure where required

8. Replace manual session propagation with transaction boundaries

9. Migrate persistence-oriented middleware

10. Introduce instrumentation

11. Replace remaining legacy access progressively

12. Validate runtime behavior before removing the old path
```

Not every application needs every step.

## Validate each migration stage

A successful build is not enough to prove a migration is correct.

Verify behavior such as:

```text
database resolution
collection resolution
context propagation
tenant resolution
transaction participation
middleware execution
soft-delete behavior
connection reuse
shutdown behavior
```

For multi-tenant systems, verify the actual isolation model as well.

Examples include:

```text
tenant A resolves only intended infrastructure

tenant B resolves its own infrastructure

shared-collection filters include required tenant constraints

dynamic tenant discovery resolves expected configuration
```

## Common migration mistakes

One common mistake is trying to migrate the entire persistence layer at once.

Incremental migration makes runtime differences easier to isolate and test.

Another mistake is assuming:

```text
using AmbitenContext
=
all infrastructure is now automatic
```

Context carries execution state.

The model, provider, tenant infrastructure, and transaction boundary still have distinct responsibilities.

Another common issue is mixing manual session handling and runtime-managed transaction participation without a clear ownership model.

For a transaction, decide which boundary owns:

```text
session creation
transaction start
commit
rollback
completion
```

Tenant-aware systems should also avoid treating tenant identity as equivalent to authorization.

Finally, do not recreate process-level infrastructure for every request.

Prefer reuse of:

```text
AmbitenClient
MongoClient
models
schemas
providers
MultiTenantManager
```

while keeping execution-specific state inside:

```text
AmbitenContext
```

## Mental model

Before migration, execution state may travel through application layers:

```text
Controller
      ↓ tenantId / session / db
Service
      ↓ tenantId / session / db
Repository
      ↓ tenantId / session / db
MongoDB
```

After introducing Ambiten runtime boundaries:

```text
Execution Boundary
      ↓
AmbitenContext
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Infrastructure Resolution
      ↓
MongoDB
```

The shift is not:

```text
manual everything
→ automatic everything
```

It is:

```text
scattered responsibility
→ explicit runtime responsibility
```

## Summary

Migration to Ambiten is a transition toward a more explicit MongoDB execution model.

Existing data can usually remain in place while applications progressively introduce:

```text
AmbitenClient
AmbitenSchema
AmbitenModel
AmbitenContext
tenant infrastructure
transaction boundaries
middleware
instrumentation
adapters
```

The central migration model is:

```text
Preserve MongoDB Data
      ↓
Adopt Ambiten Access
      ↓
Establish Execution Context
      ↓
Bind Model Operations
      ↓
Resolve Infrastructure
      ↓
MongoDB
```

Ambiten does not require every application to adopt the entire runtime at once.

The goal is to introduce the amount of structure required by the system while keeping execution responsibilities clear as the application grows.

### Related pages

- [Migrating from Abimongo](/migration/abimongo)
- [AmbitenModel](/models/ambiten-model)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Execution Guarantees](/architecture/execution-guarantees)