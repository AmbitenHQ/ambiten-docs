---
title: Schema
description: Define document structure, validation, runtime defaults, middleware, and lifecycle configuration with AmbitenSchema.
---

# Schema

`AmbitenSchema` defines the document structure and persistence behavior associated with an `AmbitenModel`.

A schema can define:

- Field types and required values.
- Literal and runtime-generated defaults.
- Custom validation.
- Middleware.
- Index declarations.
- Relationships and virtual fields.
- Lifecycle configuration.

The model coordinates operations using that schema, the active execution context, and the appropriate database resources.

Schemas remain independent of HTTP routing, tenant discovery, authentication, and connection management.

## What AmbitenSchema Represents

Each schema field uses an options object:

```ts
import { AmbitenSchema } from "@ambiten/core";

const userSchema = new AmbitenSchema({
  name: {
    type: "string",
    required: true,
  },
  email: {
    type: "string",
    required: true,
  },
  createdAt: {
    type: "date",
    default: {
      $runtime: "now",
    },
  },
  deletedAt: {
    type: "date",
  },
  isDeleted: {
    type: "boolean",
    default: false,
  },
});
```

Use `name: { type: "string" }`, rather than the older `name: "string"` shorthand.

The constructor normalizes and registers the supplied definition. A separate `registerSchema()` call is not required.

The same definition can be constructed through the `Schema` factory:

```ts
import { Schema } from "@ambiten/core";

const userSchema = Schema.create({
  name: {
    type: "string",
    required: true,
  },
  email: {
    type: "string",
    required: true,
  },
});
```

`Schema.create(definition)` constructs a schema instance. It does not create a MongoDB document.

The instance-level `schema.create(data)` helper on `Schema` performs in-memory validation and schema hooks. Use a model's `create()` method for database persistence.

## Structural and Behavioral Responsibilities

| Concern | Schema responsibility |
| --- | --- |
| Structure | Declare document fields and their types. |
| Defaults | Supply missing values during validation. |
| Validation | Check required fields, field types, and custom rules. |
| Middleware | Register behavior around supported model operations. |
| Indexes | Store index declarations that can be applied to a collection. |
| Lifecycle | Store configuration consumed by lifecycle services. |

A schema definition can be shared across requests and tenants. Execution-specific values should remain in the active context and operation payload.

## Field Definitions

The principal field options are:

```ts
{
  type: "string",
  required: true,
  default: "untitled"
}
```

| Option | Behavior |
| --- | --- |
| `type` | Checks a supplied or defaulted value against the configured type. |
| `required` | Rejects an `undefined` value after defaults have been applied. |
| `default` | Supplies a value when the document field is `undefined`. |

The supported type names are:

| Type name | Corresponding constructor | Accepted value |
| --- | --- | --- |
| `"string"` | `String` | A string. |
| `"number"` | `Number` | A finite number. |
| `"boolean"` | `Boolean` | A boolean. |
| `"date"` | `Date` | A valid `Date` instance. |
| `"array"` | `Array` | An array. |
| `"object"` | `Object` | A plain object, including an object with a null prototype. |

Programmatic definitions can use constructors:

```ts
const userSchema = new AmbitenSchema({
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: {
      $runtime: "now",
    },
  },
});
```

JSON definitions use the string type names because JSON cannot represent constructors.

Additional constructors can be used programmatically; their values are checked using `instanceof`.

Field type validation does not automatically convert input. For example:

- `"42"` is not a number.
- An ISO date string is not a `Date` instance.
- `false` is not a date.
- `null` is not accepted by the built-in date or object type checks.

Convert incoming values before validation when conversion is part of the application's input policy.

Array and object type checks do not automatically validate array elements or nested object properties. Add explicit validation for those requirements.

## Structural Typing

Use a document type with the corresponding schema and model:

```ts
import { AmbitenSchema } from "@ambiten/core";
import type { Document } from "@ambiten/core";

interface User extends Document {
  name: string;
  email: string;
  createdAt?: Date;
  deletedAt?: Date;
  isDeleted?: boolean;
}

const userSchema = new AmbitenSchema<User>({
  name: {
    type: "string",
    required: true,
  },
  email: {
    type: "string",
    required: true,
  },
  createdAt: {
    type: "date",
    default: {
      $runtime: "now",
    },
  },
  deletedAt: {
    type: "date",
  },
  isDeleted: {
    type: "boolean",
    default: false,
  },
});
```

Defaulted properties are optional in this input-facing example so callers can omit them when creating documents.

TypeScript declarations and runtime validation serve different purposes. An interface does not generate a runtime schema or change the behavior of its field validators.

## Literal Defaults

Literal defaults must contain JSON-compatible data:

```ts
const settingsSchema = Schema.create({
  enabled: {
    type: "boolean",
    default: false,
  },
  attempts: {
    type: "number",
    default: 0,
  },
  label: {
    type: "string",
    default: "",
  },
  tags: {
    type: "array",
    default: [],
  },
  metadata: {
    type: "object",
    default: {},
  },
});
```

Defaults apply only when the document value is `undefined`.

Existing values such as `false`, `0`, `""`, and `null` are not replaced. They remain subject to the field's validation rules.

Array and object defaults are copied for each document, including their nested JSON values. Documents do not share the same default array or object.

Literal defaults cannot contain functions, `Date` instances, circular references, or other non-JSON values.

This restriction also applies to programmatic definitions and imported schema modules. Use a runtime descriptor for generated values.

## Runtime Defaults

Runtime descriptors defer value generation until a missing field is populated during validation.

| Descriptor | Result |
| --- | --- |
| `{ "$runtime": "now" }` | A new `Date`. |
| `{ "$runtime": "uuid" }` | A generated UUID string. |
| `{ "$runtime": "context", "key": "tenantId" }` | The active context's tenant ID. |

For example:

```ts
import { AmbitenContext, Schema } from "@ambiten/core";
import type { Document } from "@ambiten/core";

const runtimeSchema = Schema.create<Document>({
  publicId: {
    type: "string",
    default: {
      $runtime: "uuid",
    },
  },
  tenantId: {
    type: "string",
    required: true,
    default: {
      $runtime: "context",
      key: "tenantId",
    },
  },
  createdAt: {
    type: "date",
    required: true,
    default: {
      $runtime: "now",
    },
  },
});

async function prepareDocument() {
  const document: Document = {};

  await AmbitenContext.run(
    {
      tenantId: "tenant5",
    },
    async () => {
      await runtimeSchema.validateAsync(document);
    }
  );

  return document;
}
```

This example validates a document without connecting to MongoDB.

Required fields may receive defaults before the required-field check runs.

The allowed runtime context keys are:

- `tenantId`
- `requestId`
- `dbName`
- `collectionName`

If a requested context value is unavailable, default resolution throws. This also applies when the field itself is not marked `required`.

Runtime context defaults read the active `AmbitenContext`. They do not independently discover tenants or infer values from a model's collection name.

Keep explicit model-operation overrides and the active context consistent when using context-derived document fields.

A default does not overwrite a supplied value. For example, a supplied `tenantId` will not automatically be replaced with the context's tenant ID. Apply the application's ownership checks when accepting tenant fields from clients.

Unknown runtime operations, unsupported context keys, and malformed descriptors are rejected during schema registration.

See [Runtime Defaults](/models/runtime-defaults) for additional examples.

## Inline JSON Configuration

The `schema` property in `ambiten.config.json` can contain the document definition directly:

```json
{
  "configVersion": "1.0.0",
  "projectName": "my-app",
  "connection": {
    "uri": "mongodb://localhost:27017/my-app"
  },
  "schema": {
    "name": {
      "type": "string",
      "required": true
    },
    "email": {
      "type": "string",
      "required": true
    },
    "createdAt": {
      "type": "date",
      "default": {
        "$runtime": "now"
      }
    },
    "deletedAt": {
      "type": "date"
    },
    "isDeleted": {
      "type": "boolean",
      "default": false
    }
  },
  "model": {
    "collectionName": "users"
  }
}
```

These files have different purposes:

| File or property | Purpose |
| --- | --- |
| `ambiten.config.json` | Application configuration consumed by bootstrap. |
| Its `schema` property | The document definition used to construct the schema instance. |
| `ambiten.config.schema.json` | JSON Schema rules describing valid application configuration. |

An Ambiten document definition is not a general-purpose JSON Schema document. Use Ambiten's supported field options rather than assuming arbitrary JSON Schema keywords are executed.

## External Schema Modules

A schema definition can live in a source module instead of expanding the JSON configuration.

For example:

```ts
// src/schemas/user.schema.ts
import type { SchemaDefinition } from "@ambiten/core";

export const userSchemaDefinition = {
  name: {
    type: "string",
    required: true,
  },
  email: {
    type: "string",
    required: true,
  },
  createdAt: {
    type: "date",
    default: {
      $runtime: "now",
    },
  },
  deletedAt: {
    type: "date",
  },
  isDeleted: {
    type: "boolean",
    default: false,
  },
} satisfies SchemaDefinition;
```

Reference that export through the top-level `schema` property:

```json
{
  "configVersion": "1.0.0",
  "projectName": "my-app",
  "connection": {
    "uri": "mongodb://localhost:27017/my-app"
  },
  "schema": {
    "path": "./src/schemas/user.schema.ts",
    "exportName": "userSchemaDefinition"
  },
  "model": {
    "collectionName": "users"
  },
  "features": {
    "schemas": "./src/schemas",
    "models": "./src/models"
  }
}
```

The module reference selects the runtime definition. The `features.schemas` and `features.models` paths describe scaffolding directories; they do not automatically select or load every file in those directories.

The module contract is:

- `path` identifies the module file.
- `exportName` selects an export and defaults to `"default"`.
- The selected export must be a plain schema definition object.
- A schema instance or factory function is not accepted as that export.
- Inline field definitions cannot be mixed with a module reference.

For JSON configuration, paths are relative to the configuration file. Module references supplied through programmatic configuration are resolved relative to `process.cwd()`.

A schema module may use programmatic field constructors, but defaults still follow the literal-or-runtime-descriptor contract.

Attach custom validators, hooks, and other instance behavior to the actual schema instance during application setup. Exporting a definition object does not automatically execute instance-registration methods.

### TypeScript and Production Modules

Ambiten loads referenced modules using native `import()`.

A `.ts` reference requires an application process that supports TypeScript imports. For example, development can use:

```bash
pnpm add -D tsx
node --import tsx src/main.ts
```

A CommonJS require hook alone does not provide TypeScript support for native module imports.

For a production build that emits the module to `dist/schemas/user.schema.js`, use:

```json
{
  "path": "./dist/schemas/user.schema.js",
  "exportName": "userSchemaDefinition"
}
```

This object replaces the `schema` module reference. Deploy the compiled module and its dependencies, and keep the path relative to the deployed configuration file.

## Validation

Schema validation checks a document in this order:

1. Reject unknown fields when the schema definition is non-empty.
2. Apply defaults to fields whose values are `undefined`.
3. Check required fields.
4. Check configured field types.
5. Execute registered custom validators.

`_id` is permitted by the unknown-field check because MongoDB may supply it.

An empty definition does not enforce structural field checks. It can still have custom validators.

Validate directly with:

```ts
async function validateUser() {
  const document: User = {
    name: "John",
    email: "john@example.com",
  };

  await userSchema.validateAsync(document);

  return document;
}
```

Validation applies defaults to the supplied document in place. It does not return a newly constructed document.

Use:

```ts
userSchema.validate(document);
```

for synchronous validation, or:

```ts
await userSchema.validateAsync(document);
```

when custom validators may be asynchronous.

The synchronous method rejects an asynchronous validator.

A required string can still be empty because `required` checks for `undefined`. Add a custom validator when a field must contain non-empty text.

### Custom Validators

Register a validator on the schema instance:

```ts
userSchema.validator("name", (value) => {
  return typeof value === "string" && value.trim().length > 0;
});

userSchema.validator("email", (value) => {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
});
```

The email example is a basic format check.

A validator receives the field value and, optionally, the document. Returning `false` causes validation to fail.

Keep validators free of side effects.

In the current v1.3.0 implementation, `AmbitenModel.create()` performs synchronous schema validation before its asynchronous validation call. Consequently, an asynchronous schema validator can fail in the synchronous pass. Use synchronous schema validators for that create path; standalone `validateAsync()` supports asynchronous validators.

### Validation Across Model Operations

Document creation validates the document before insertion.

Do not assume that every operation performs the same full-document validation. For example, `updateOne()` processes an update document and hooks without automatically validating the complete resulting document.

Apply operation-appropriate checks to partial updates and other write paths.

## Schema and Model Typing

Use the same document type for the schema and its model:

```ts
import { AmbitenModel } from "@ambiten/core";
import type { DbProvider } from "@ambiten/core";

function createUserModel(provider: DbProvider) {
  return new AmbitenModel<User>({
    collectionName: "users",
    schema: userSchema,
    provider,
  });
}
```

The provider supplies database access. The schema supplies the document contract and registered behavior.

The type parameter helps keep application code consistent, while the runtime schema performs the configured validation.

## Schema Does Not Own Execution Context

A schema does not identify requests, discover tenants, or choose MongoDB clients.

Adapters or explicit `AmbitenContext.run()` calls establish application execution context. Model operations resolve their effective context using supported per-call values, active runtime values, and model defaults.

Schema hooks receive operation information from the model.

Runtime default descriptors are different: a context descriptor reads its allowed value directly from the active `AmbitenContext`.

Do not capture request-specific context while defining or importing a shared schema module. Use a runtime descriptor or operation hook so the value is read during the relevant execution.

## ModelContext and Schema Execution

`ModelContext` carries operation-facing values such as:

- `tenantId`, `dbName`, and `collectionName`.
- An explicit database instance.
- A transaction session.
- Operation configuration.
- `withDeleted`, `onlyDeleted`, and `hardDelete`.

Schema middleware receives an `AmbitenMiddlewareContext` populated by the model, including the operation, collection name, applicable tenant and session information, and operation payload.

Payloads depend on the operation. A create hook can receive `doc`; an update hook can receive `filter` and `update`; a post hook can receive `result`.

Middleware should inspect the fields relevant to its operation rather than assuming every hook contains a document.

## Middleware Registration

Register schema hooks using `pre()` and `post()`:

```ts
userSchema.pre("create", (ctx) => {
  console.log("Creating user", {
    tenantId: ctx.tenantId,
    collectionName: ctx.collectionName,
  });
});

userSchema.post("create", (ctx) => {
  console.log("User created", {
    tenantId: ctx.tenantId,
    collectionName: ctx.collectionName,
    id: ctx.doc?._id,
  });
});
```

Handlers may be synchronous or asynchronous and execute in registration order.

Register hooks during setup before operations begin. Repeatedly registering hooks inside request handlers adds behavior to the shared schema instance.

### Validation and Hook Order

For the current model create path:

1. Resolve the collection and operation resources.
2. Run model-level before middleware.
3. Apply schema defaults and validation.
4. Run schema `pre("create")` hooks.
5. Insert the document.
6. Run schema `post("create")` hooks.
7. Continue model-level after processing.

Schema pre-create hooks run before insertion, but after validation.

Therefore, a required field cannot depend on a schema pre-create hook to supply its initial value. Use a default or populate it before schema validation.

When normalization must happen before validation, model-level before middleware can perform it:

```ts
UserModel.before("create", (ctx) => {
  if (ctx.doc && typeof ctx.doc.email === "string") {
    ctx.doc.email = ctx.doc.email.trim().toLowerCase();
  }
});
```

Here, `UserModel` is the initialized model using `userSchema`.

Changes made by a schema pre-create hook are not automatically followed by another full validation pass.

## Runtime-Aware Middleware

Hooks can use the operation state supplied by the model:

```ts
userSchema.post("create", (ctx) => {
  console.log("Created user", {
    tenantId: ctx.tenantId,
    collectionName: ctx.collectionName,
    requestId: AmbitenContext.get().requestId,
  });
});
```

The hook's tenant identity comes from the model operation. The schema does not resolve the tenant itself.

Read other runtime values from `AmbitenContext` when needed, rather than assuming they are all properties of the middleware payload.

## Middleware and Transactions

An active transaction session can be propagated into model operations and their hook contexts.

The surrounding transaction boundary owns session lifecycle, commit, and rollback.

Schema middleware executes within that operation, but a post-create hook indicates that insertion completed within the operation. It does not necessarily indicate that an enclosing transaction has committed.

External effects such as sending messages or calling services are not rolled back by a MongoDB transaction. Coordinate such effects with the application's transaction policy.

## Runtime Participation

<SignalFlow
  aria-label="Schema participation in document creation"
  :items='[
    "Model and Context",
    "Collection Resolution",
    "Defaults and Validation",
    "Schema Pre Hooks",
    "Insert and Post Hooks"
  ]'
/>

This represents the create path, not a universal sequence for every model operation.

The schema participates in validation and registered behavior. The model coordinates resource resolution and persistence.

Schema validation does not guarantee that no database connection or collection resolution has occurred before a document is rejected.

## Indexes and Additional Field Metadata

Additional field options can be retained as metadata, but their presence does not automatically implement validation or database behavior.

For example, `unique: true` on a field does not by itself create a MongoDB unique index.

Declare indexes explicitly:

```ts
userSchema.index(
  {
    email: 1,
  },
  {
    unique: true,
  }
);
```

Apply them to the intended collection during infrastructure setup:

```ts
await userSchema.applyIndexes(collection);
```

Here, `collection` is the MongoDB collection selected by that setup process.

`index()` stores the declaration. `applyIndexes()` issues the index-creation calls. Do not assume that constructing a schema automatically applies its indexes.

In a database-per-tenant design, index setup must cover each intended tenant collection.

## Collection Ownership

A schema does not choose the MongoDB collection.

The model supplies the collection boundary:

```ts
const UserModel = new AmbitenModel<User>({
  collectionName: "users",
  schema: userSchema,
  provider,
});
```

Here, `provider` is the application's configured `DbProvider`.

A supported operation-level collection override is resolved by the model, not by changing the schema definition.

## Provider Independence

A schema can be used with different database providers and tenant infrastructure arrangements.

Its field definitions do not need to know the MongoDB URI, connection client, or tenant discovery strategy.

Constructing or directly validating a schema does not require a MongoDB connection. Persisting through a model requires the appropriate database infrastructure.

## Tenant Independence

The same schema definition can serve multiple tenants.

Tenant-specific database selection belongs to the model runtime and infrastructure configuration.

If a document must store its tenant ID, declare that field explicitly and supply a value or context default. Database routing does not automatically add tenant fields to documents.

Keep mutable request state out of shared schema instances.

## Creation and Deletion Fields

Creation and deletion timestamps describe different events:

| Field | New document | Soft-deleted document |
| --- | --- | --- |
| `createdAt` | Creation date. | Original creation date. |
| `isDeleted` | `false`. | `true`. |
| `deletedAt` | Absent. | Deletion date. |

Use:

```ts
{
  createdAt: {
    type: "date",
    default: {
      $runtime: "now",
    },
  },
  deletedAt: {
    type: "date",
  },
  isDeleted: {
    type: "boolean",
    default: false,
  },
}
```

Do not default `deletedAt` to `false` or to the current date.

A new document should not have a deletion timestamp. Set it when a deletion operation actually occurs.

An optional date field may be absent, but a supplied `null` still fails the current date type check. A TypeScript annotation or an additional `nullable` property does not change that validator.

The current model restore path writes `deletedAt: null`. If a restored document is later passed through full schema validation, that representation conflicts with a strict date field. Align the lifecycle representation and validation policy when handling restored documents.

Changing a schema default affects future validation. It does not remove deletion timestamps already stored in MongoDB.

## Soft-Delete Operation Context

Operation controls such as:

- `withDeleted`
- `onlyDeleted`
- `hardDelete`

belong to the model operation context.

They allow supported model operations to vary their behavior without mutating the shared schema.

Declaring `isDeleted` and `deletedAt` fields does not, by itself, configure every soft-delete query or lifecycle behavior. Use the corresponding model or plugin functionality.

See [Soft Delete](/features/soft-delete) for lifecycle operations.

## Lifecycle Policies

Schemas can store garbage-collection configuration:

```ts
const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;

userSchema.setGCConfig({
  ttlField: "createdAt",
  expiresIn: String(thirtyDaysInMilliseconds),
  softDelete: true,
});
```

The current `AmbitenModel.runGC()` implementation converts `expiresIn` with `Number()` and subtracts it from `Date.now()`.

For this path, supply a numeric millisecond string. A duration label such as `"30d"` is not parsed into a duration.

`setGCConfig()` stores configuration. It does not start a scheduler or immediately delete documents.

Schema lifecycle configuration and `model.gcConfig` use different contracts. Do not interchange `ttlField` and `expiresIn` with the model options' numeric `ttl` configuration.

## Garbage Collection Relationship

The schema declares lifecycle settings. The model and lifecycle services execute them.

Configure lifecycle settings before model registration when runtime discovery depends on the model's registered GC configuration.

Scheduling, tenant scope, database access, and operational cleanup remain responsibilities of the surrounding runtime.

In a multi-tenant application, ensure that lifecycle work executes against the intended tenant databases.

## Static Definition, Dynamic Execution

A schema can be constructed once and reused across requests, workers, and background operations.

Its definition remains reusable while defaults and hooks evaluate during the relevant execution.

A `$runtime: "now"` default therefore produces a value when needed; it does not capture the time at which the schema module was imported.

Revalidating a document whose field already has a value does not regenerate that default.

## Concurrent Execution

Shared schema instances can participate in concurrent operations.

Keep execution-specific state in:

- The document or operation payload.
- The effective model context.
- `AmbitenContext`.

Do not store a current tenant ID, request ID, or transaction session as mutable state on the shared schema.

Configure definitions, hooks, validators, and lifecycle settings during setup rather than changing them per request.

## Framework Independence

Schema definitions and hooks should not require Express, Fastify, NestJS, GraphQL, or Lambda request objects.

Adapters and other execution boundaries establish context. The model supplies operation information to the schema.

This allows the same persistence behavior to be reused across HTTP handlers, workers, and other application entry points.

## Recommended Design Approach

Keep schema behavior focused on:

- Document structure.
- Defaults and validation.
- Persistence-related hooks.
- Explicit index declarations.
- Lifecycle configuration.

Keep routing, authentication, tenant discovery, connection creation, and application workflow orchestration in their appropriate layers.

Use plain definition objects when configuring schemas through JSON module references. Use schema instances when registering validators, hooks, indexes, and lifecycle behavior programmatically.

## Middleware Design

Keep middleware small, operation-specific, and safe to execute in the relevant lifecycle phase.

In particular:

- Check whether the operation supplies `doc`, `docs`, `filter`, or `update`.
- Populate required values before validation.
- Use runtime defaults for supported generated values.
- Keep custom validators free of side effects.
- Distinguish operation completion from transaction commit.
- Avoid storing request state on shared schema objects.

## Relationship with AmbitenModel

<SignalFlow
  aria-label="Schema and model relationship"
  :items='[
    "Schema Definition",
    "AmbitenSchema",
    "AmbitenModel"
  ]'
/>

`AmbitenSchema` defines document rules and registered behavior.

`AmbitenModel` coordinates operation context, database access, hooks, and persistence using that schema.

The schema does not replace the model's operation pipeline.

## Relationship with AmbitenClient

`AmbitenClient` and database providers supply infrastructure capabilities.

The schema supplies field rules, defaults, validators, and hooks.

The model coordinates these layers during an operation. Schema methods such as `applyIndexes()` require an explicitly supplied collection when they perform database work.

## What AmbitenSchema Does Not Own

A schema does not own:

- Request ingress or authentication.
- Creation of the application's execution boundary.
- Tenant identification or authorization.
- Dynamic tenant discovery.
- MongoDB client lifecycle.
- Database routing.
- Collection selection.
- Transaction commit or rollback.
- Application workflow orchestration.

## Runtime Responsibilities

| Layer | Role |
| --- | --- |
| `AmbitenContext` | Active execution state. |
| `ModelContext` | Supported model-operation values and overrides. |
| `AmbitenSchema` | Document rules, defaults, and registered behavior. |
| `AmbitenModel` | Operation coordination and persistence execution. |
| Database provider | Access to the required database resources. |
| MongoDB | Document storage and database-enforced constraints. |

## Design Principles

<AmbitenSchemaPrinciples />

Schema definitions remain reusable while defaults and hooks participate in the current execution.

Keep the definition, operation context, and infrastructure responsibilities explicit so schema behavior remains predictable across requests and tenants.

## Related Pages

- [Runtime Defaults](/models/runtime-defaults)
- [AmbitenModel](/models/ambiten-model)
- [Defining Models](/models/defining-models)
- [Context Binding](/models/context-binding)
- [Provider Contract](/models/provider-contract)
- [Middleware](/core/middleware)
- [Context](/core/context)
- [Transactions](/core/transactions)
- [Soft Delete](/features/soft-delete)
- [AmbitenClient](/reference/api/ambiten-client)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Architecture](/architecture/whitepaper)
