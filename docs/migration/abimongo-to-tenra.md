# Migrating from Abimongo to Ambiten

Ambiten is the evolution of Abimongo.

Abimongo began as a MongoDB ODM and data-access abstraction layer. Ambiten continues that foundation while expanding it into a context-driven runtime for multi-tenant, transaction-aware, observable systems.

This migration is primarily about runtime structure, package identity, and execution behavior—not database reconstruction.

<DocOverviewCards 
eyebrow="Platform Evolution" title="Move from ODM-oriented infrastructure to a runtime-driven execution model." description="Migration keeps existing MongoDB collections and workflows intact while introducing context-aware execution, transaction propagation, instrumentation, and runtime portability." accent="#d38a49" :signals='["Package migration", "Runtime context", "Transactions", "Adapters", "Instrumentation"]'
:cards='[ 
 { "label": "Preserve", "title": "Keep existing MongoDB infrastructure", "text": "Collections, indexes, documents, and connection strategy can remain unchanged during migration." }, { "label": "Evolve", "title": "Move from ODM behavior to runtime orchestration", "text": "Tenant routing, sessions, middleware, and instrumentation become centralized runtime concerns." }, { "label": "Adopt", "title": "Migrate incrementally", "text": "Projects can replace package imports, runtime setup, and execution boundaries progressively instead of rewriting everything at once." } ]' :flow='[
 { "label": "Step 1", "title": "Replace packages" }, { "label": "Step 2", "title": "Update runtime setup" }, { "label": "Step 3", "title": "Move execution into context" }, { "label": "Step 4", "title": "Adopt runtime features" } ]'
/>

## What changed

The most visible change is the platform identity.

```text
Abimongo → Ambiten
```

The architectural direction has expanded as well.

Abimongo focused primarily on ODM-style modeling and MongoDB abstraction.

Ambiten extends that into a runtime system built around:

- context-aware execution
- multi-tenant runtime boundaries
- transaction propagation
- middleware lifecycle orchestration
- structured instrumentation
- adapter-driven portability

The original Abimongo packages remain part of the project's history, but future development continues under the Ambiten platform identity.

## What does not change

Your MongoDB data does not need to change.

Existing collections, indexes, documents, and database structure can remain intact while migration happens around runtime behavior and package structure.

Most migrations focus on:

- package imports
- runtime setup
- context boundaries
- transaction orchestration
- infrastructure naming

rather than data transformation.

## Package migration

Replace legacy Abimongo packages with Ambiten packages.

```bash
npm uninstall @abimongo/core
pnpm add @ambiten/core
```

Additional packages should move to the Ambiten namespace as well.

```bash
npm uninstall @abimongo/logger
pnpm add @ambiten/logger
```

Adapter packages follow the same structure:

```bash
pnpm add @ambiten/express
pnpm add @ambiten/fastify
pnpm add @ambiten/graphql
pnpm add @ambiten/nestjs
pnpm add @ambiten/lambda
```

## Import migration

Update imports from the Abimongo namespace to the Ambiten namespace.

```Diff
- import { AmbitenModel, AmbitenSchema } from "@abimongo/core";
+ import { AmbitenModel, AmbitenSchema } from "@ambiten/core";
```

Logger imports should also move to the new package identity.

```Diff
- import { logger } from "@abimongo/logger";
+ import { logger } from "@ambiten/logger";
```

## Naming migration

Replace remaining Abimongo naming across the codebase.

```Diff
- AbimongoClient
+ AmbitenClient
```

```Diff
- AbimongoContext
+ AmbitenContext
```

```Diff
- AbimongoModel
+ AmbitenModel
```

Projects that already adopted Ambiten-style class naming inside Abimongo packages may only need package-level migration.

## Configuration migration

Rename configuration files where necessary.

```Diff
- abimongo.config.json
+ Ambiten.config.json
```

A standard Ambiten configuration continues to define runtime concerns such as database access, tenancy, logging, GraphQL, Redis, or garbage collection.

```JSON
{
  "connection": {
    "uri": "mongodb://localhost:27017/my-app",
    "options": {
      "dbName": "my-app"
    }
  },
  "multiTenant": {
    "enabled": true
  }
}
```

## Runtime setup migration

Older Abimongo applications often centered around direct model or client usage.

Ambiten encourages a clearer runtime structure:

```PlainText
Bootstrap → Adapter → AmbitenContext → AmbitenModel → Provider → MongoDB
```

For full applications, prefer `AmbitenBootstrap` or `AmbitenBootstrapFactory`.

```ts
import { AmbitenBootstrapFactory } from "@ambiten/core";
import { createExpressAdapter } from "@ambiten/express";

const adapter = createExpressAdapter();

await AmbitenBootstrapFactory.create({
  adapter,
  config: "./Ambiten.config.json"
});
```

For lower-level or direct usage, initialize AmbitenClient explicitly.

```ts
import { AmbitenClient, AmbitenModel } from "@ambiten/core";

const client = new AmbitenClient({
  uri: process.env.MONGODB_URI,
  options: {
    dbName: "my-app"
  }
});

await client.connect();

const UserModel = new AmbitenModel({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
```

## Migrating tenant handling

Older implementations often threaded tenant state manually through services.

Before

```ts
await UserService.create(data, tenantId);
```

After

```ts
await AmbitenContext.run(
  { tenantId: "tenant-a" },
  async () => {
    await UserModel.create(data);
  }
);
```

Tenant identity becomes part of the runtime boundary instead of application method signatures.

## Migrating transactions

Manual session propagation should move toward runtime-managed transactions.

Before

```ts
await UserModel.create(user, { session });
await AuditModel.create(log, { session });
```

After

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create(user);
  await AuditModel.create(log);
});
```

The runtime keeps the active session attached to the execution scope automatically.

## Migrating instrumentation

Query logging and operational telemetry can also move into the runtime layer.

Before

```ts
console.log("Creating user");
await UserModel.create(data);
```

After

```ts
await measureQuery(
  {
    operation: "create",
    collectionName: "users",
    extra: {
      feature: "user.create"
    }
  },
  async () => {
    return UserModel.create(data);
  }
);
```

Instrumentation can now inherit tenant, request, database, duration, and execution metadata automatically.

## Recommended migration order

Migration should remain incremental.

```PlainText
1. Replace package names
2. Update imports
3. Rename configuration files
4. Update runtime setup
5. Move tenant handling into AmbitenContext
6. Replace manual transactions
7. Introduce instrumentation
8. Remove remaining Abimongo naming
```

This approach reduces operational risk and keeps production systems stable during transition.

## Common migration mistakes

The most common issue is mixing @abimongo/* and @ambiten/* packages inside the same runtime for long periods.

That can create duplicate runtime instances, mismatched types, or inconsistent execution behavior.

Another common mistake is migrating package names without validating runtime boundaries such as context propagation or transaction participation afterward.

Migration should simplify infrastructure behavior, not create two parallel runtime models.

## Mental model

```PlainText
Abimongo → ODM-oriented execution
Ambiten    → Runtime-oriented execution
```

That is the architectural shift behind the migration.

## Summary

Migrating from Abimongo to Ambiten is a transition from an ODM-focused platform identity to a runtime-driven execution system.

Existing MongoDB infrastructure can remain unchanged while execution behavior moves into context-aware runtime boundaries.

Abimongo remains the historical foundation.

Ambiten is the future-facing runtime platform built on top of that evolution.
