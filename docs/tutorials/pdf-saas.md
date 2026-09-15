<TutorialHero />

This tutorial builds a tenant-aware Document-to-PDF SaaS application designed to demonstrate how Ambiten behaves as a runtime system across a complete product workflow.

Rather than focusing only on CRUD operations, the tutorial follows execution from the framework boundary through `AmbitenContext`, application logic, `AmbitenModel`, Effective `ModelContext`, schema middleware, infrastructure resolution, and MongoDB.

The application includes tenant-aware execution, tier-based usage limits, explicit transactional workflows, middleware-driven persistence policy, and runtime instrumentation.

## Product requirements

The application supports three user tiers:

| Tier | Access Model | Behavior |
|---|---|---|
| Free | Anonymous or basic users | Limited conversions |
| Premium | Registered users | Higher conversion limits |
| Ultimate | Paid users | Full access |

The system must:

- identify the tenant for each execution
- preserve tenant identity through the runtime
- track conversion usage
- enforce plan limits
- record conversion activity
- keep model operations transaction-aware where required
- expose useful execution metadata for instrumentation
- avoid manually forwarding tenant IDs and sessions through every application function

Authentication and authorization remain application responsibilities.

Tenant resolution answers:

```text
Which tenant is this execution for?
```

Authorization answers:

```text
May this caller perform this action for that tenant?
```

The tutorial keeps those concerns separate.

## Runtime architecture

The application follows this execution path:

```text
HTTP Request
      ↓
Express
      ↓
Ambiten Express Adapter
      ↓
Adapter Runtime
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Route Handler
      ↓
Tier Policy
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Schema / Middleware
      ↓
Infrastructure Resolution
      ↓
AmbitenClient / DbProvider
      ↓
MongoDB
```

The route handlers remain focused on product behavior while Ambiten coordinates execution state and persistence concerns underneath the workflow.

The important distinction is:

```text
AmbitenContext
= execution-scoped runtime state

Effective ModelContext
= persistence-facing state for one model operation
```

During model execution:

```text
explicit operation ModelContext
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

## Install and scaffold

If you already have an Ambiten application, you can add the tutorial files directly.

Otherwise scaffold the project using your Ambiten project setup and install the application dependencies:

```bash
pnpm add express multer
```

The tutorial uses the Express adapter:

```bash
pnpm add @ambiten/adapter-express
```

A minimal project structure is:

```text
src/
  main.ts

  core/
    db.ts

  models/
    user.model.ts
    conversion.model.ts

  policies/
    tier-policy.ts
```

## Establish process-level database infrastructure

MongoDB clients should normally live for the lifetime of the application process rather than being recreated for every request.

```ts
// src/core/db.ts

import {
  AmbitenClient
} from "@ambiten/core";

export const db = new AmbitenClient({
  uri: process.env.MONGODB_URI,
  options: {
    dbName: "pdf-saas"
  }
});

export async function connectDatabase() {
  await db.connect();

  return db;
}
```

The client is created once.

```text
PROCESS LIFETIME

AmbitenClient
MongoClient
providers
tenant infrastructure
runtime configuration
```

Execution-specific values such as tenant identity and transaction sessions remain outside this shared infrastructure.

```text
EXECUTION LIFETIME

AmbitenContext
tenantId
requestId
dbName
session
runtime metadata
```

## User model

The model can also be constructed once and reused.

```ts
// src/models/user.model.ts

import {
  AmbitenSchema,
  AmbitenModel
} from "@ambiten/core";

import {
  db
} from "../core/db";

export type UserTier =
  | "free"
  | "premium"
  | "ultimate";

export interface User {
  email?: string;
  tier: UserTier;
  paid: boolean;
  createdAt: Date;
}

export const userSchema =
  new AmbitenSchema<User>({
    email: String,
    tier: String,
    paid: Boolean,
    createdAt: Date
  });

export const UserModel =
  new AmbitenModel<User>({
    collectionName: "users",
    schema: userSchema,
    provider: db
  });
```

`UserModel` is reusable process-level model infrastructure.

The model does not permanently belong to one tenant.

Instead, execution-specific state is resolved when an operation runs.

Conceptually:

```text
AmbitenContext
      ↓
UserModel
      ↓
mergeCtx()
      ↓
Effective ModelContext
      ↓
Provider
```

## Conversion model

The conversion model records PDF conversion activity.

```ts
// src/models/conversion.model.ts

import {
  AmbitenSchema,
  AmbitenModel
} from "@ambiten/core";

import {
  db
} from "../core/db";

import type {
  UserTier
} from "./user.model";

export interface Conversion {
  userId: string;
  fileName: string;
  status:
    | "pending"
    | "completed"
    | "failed";
  tierUsed: UserTier;
  createdAt: Date;
}

export const conversionSchema =
  new AmbitenSchema<Conversion>({
    userId: String,
    fileName: String,
    status: String,
    tierUsed: String,
    createdAt: Date
  });
```

A schema middleware hook can enforce persistence-related behavior.

```ts
conversionSchema.pre(
  "create",
  async (ctx) => {
    if (!ctx.tenantId) {
      throw new Error(
        "Tenant context is required."
      );
    }

    if (ctx.doc) {
      ctx.doc.createdAt =
        new Date();
    }
  }
);
```

Then create the reusable model:

```ts
export const ConversionModel =
  new AmbitenModel<Conversion>({
    collectionName:
      "conversions",

    schema:
      conversionSchema,

    provider:
      db
  });
```

The schema remains reusable.

The active execution supplies runtime state when model operations occur.

```text
Static Schema
      +
Effective ModelContext
      ↓
Runtime Middleware Behavior
```

This keeps the principle:

```text
Static definition.
Dynamic execution.
```

## Tier policy

Business rules such as subscription limits belong in application policy rather than database infrastructure.

```ts
// src/policies/tier-policy.ts

import type {
  UserTier
} from "../models/user.model";

export function getTierLimit(
  tier: UserTier
): number {
  if (tier === "ultimate") {
    return Number.POSITIVE_INFINITY;
  }

  if (tier === "premium") {
    return 100;
  }

  return 5;
}
```

This keeps product policy separate from runtime coordination.

Ambiten provides the execution boundary.

The application decides what the business rules mean.

## Application setup

Initialize the application and connect shared infrastructure once.

```ts
// src/main.ts

import express from "express";
import multer from "multer";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";

import {
  AmbitenBootstrapFactory,
  AmbitenContext,
  measureQuery
} from "@ambiten/core";

import {
  connectDatabase
} from "./core/db";

import {
  UserModel
} from "./models/user.model";

import {
  ConversionModel
} from "./models/conversion.model";

import {
  getTierLimit
} from "./policies/tier-policy";

const app = express();

const upload = multer({
  dest: "uploads/"
});

app.use(express.json());

await connectDatabase();

await AmbitenBootstrapFactory.create({
  config:
    "./ambiten.config.json"
});

const adapter =
  createExpressAdapter();
```

The framework adapter establishes an execution boundary around downstream application work.

Install it with tenant resolution:

```ts
await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",

    validate: async (
      tenantId
    ) => {
      return Boolean(tenantId);
    }
  }
});
```

There is deliberately no default tenant fallback here.

If tenant-aware execution is required and tenant resolution fails, the request should not silently continue as another tenant.

The adapter establishes:

```text
Request
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Application Handler
```

The adapter resolves identity.

It does not replace authentication or authorization.

## Tenant infrastructure

Resolving the tenant identifier is only the first half of multi-tenant execution.

```text
Request
      ↓
TenantResolver
      ↓
tenantId
```

Database infrastructure must also be able to resolve the MongoDB resources associated with that tenant.

Conceptually:

```text
tenantId
      ↓
TenantConfigResolver /
MultiTenantManager
      ↓
Tenant MongoClient
      ↓
Tenant Database
```

Your production configuration should establish that mapping through the application's tenant infrastructure.

The important separation is:

```text
Who is this execution for?
→ TenantResolver

Where does the tenant live?
→ TenantConfigResolver /
  MultiTenantManager

Give me the client.
→ TenantClientResolver /
  MultiTenantManager
```

The tutorial assumes that tenant infrastructure has been configured for the tenant IDs accepted by the adapter.

## Register a premium user

The registration workflow remains application-focused:

```ts
app.post(
  "/register",
  async (req, res) => {
    const user =
      await UserModel.create({
        email:
          req.body.email,

        tier:
          "premium",

        paid:
          false,

        createdAt:
          new Date()
      });

    res.json(user);
  }
);
```

The route does not manually pass the tenant ID to `UserModel`.

The model can inherit execution state through:

```text
AmbitenContext
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext
```

The resulting provider path can then resolve tenant-aware infrastructure.

## Upgrade to ultimate

The upgrade route changes product state.

```ts
app.post(
  "/upgrade",
  async (req, res) => {
    const {
      userId
    } = req.body;

    await UserModel.updateOne(
      {
        _id: userId
      },
      {
        $set: {
          tier: "ultimate",
          paid: true
        }
      }
    );

    res.json({
      success: true
    });
  }
);
```

The application expresses the business rule.

Runtime infrastructure remains below the route.

## Convert a document

The conversion workflow combines product policy, model execution, instrumentation, and an explicit transaction boundary.

```ts
app.post(
  "/convert",
  upload.single("file"),

  async (req, res) => {
    const userId =
      req.body.userId;

    const conversion =
      await AmbitenContext
        .withTransaction(
          async () => {
            const user =
              await UserModel
                .findOne({
                  _id: userId
                });

            if (!user) {
              throw new Error(
                "User not found."
              );
            }

            const limit =
              getTierLimit(
                user.tier
              );

            const conversions =
              await ConversionModel
                .find({
                  userId
                });

            if (
              conversions.length >=
              limit
            ) {
              throw new Error(
                "Conversion limit reached. Upgrade your plan."
              );
            }

            return measureQuery(
              {
                operation:
                  "create",

                collectionName:
                  "conversions",

                extra: {
                  feature:
                    "document.convert",

                  tier:
                    user.tier
                }
              },

              async () => {
                return ConversionModel
                  .create({
                    userId,

                    fileName:
                      req.file
                        ?.originalname ??
                      "unknown",

                    status:
                      "completed",

                    tierUsed:
                      user.tier,

                    createdAt:
                      new Date()
                  });
              }
            );
          }
        );

    res.json({
      success: true,
      conversion
    });
  }
);
```

This tutorial uses an **explicit transaction boundary** around the conversion workflow.

The adapter is therefore not also configured with:

```ts
enableTransactions: true
```

for this example.

The two transaction strategies are alternatives:

```text
Adapter-managed transaction
```

or:

```text
AmbitenContext.withTransaction(...)
```

They are not two layers that every application needs to combine.

## Transaction behavior

When the transaction begins:

```text
AmbitenContext.withTransaction()
      ↓
MongoDB ClientSession
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
Effective ModelContext.session
      ↓
Participating Model Operations
```

The transaction boundary owns:

```text
start
commit
rollback
completion
```

`UserModel` and `ConversionModel` participate in that execution.

They do not independently commit or roll back the surrounding transaction.

The central rule is:

```text
Boundary owns atomicity.

Context carries the session.

Model binds the session
to the operation.
```

## What the transaction does not include

MongoDB transaction participation does not automatically make every side effect atomic.

For example:

```text
PDF rendering
object storage
email delivery
payment APIs
message queues
external HTTP calls
```

do not automatically become part of the MongoDB transaction.

A production Document-to-PDF system may therefore use patterns such as:

```text
transactional database record
      ↓
commit
      ↓
background PDF generation
      ↓
object storage
      ↓
status update
```

depending on its durability requirements.

Keep MongoDB transactions focused and reasonably short.

## Runtime behavior

When `/convert` executes, the runtime path is:

```text
HTTP Request
      ↓
Express Adapter
      ↓
Tenant Resolution
      ↓
AmbitenContext
      ↓
Route Handler
      ↓
withTransaction()
      ↓
UserModel
      ↓
Effective ModelContext
      ↓
Provider Resolution
      ↓
MongoDB
      ↓
ConversionModel
      ↓
Schema Middleware
      ↓
Effective ModelContext
      ↓
Provider Resolution
      ↓
MongoDB
      ↓
Transaction Completion
      ↓
HTTP Response
```

`AmbitenContext` carries execution-scoped state.

It is not merely a request metadata object.

During model execution, `AmbitenModel` resolves the persistence-facing context:

```text
explicit operation context
        ↓
active AmbitenContext
        ↓
model defaults
        ↓
Effective ModelContext
```

Schema middleware participates in the model operation using that runtime-bound state.

The provider then resolves the MongoDB infrastructure required for the operation.

## Example request

A tenant-aware request may look like:

```text
POST /convert

x-tenant-id: company-a
Content-Type: multipart/form-data
```

The header identifies the tenant for the execution.

It does not by itself prove that the caller is authorized to act for that tenant.

A production application should normally perform:

```text
Authentication
      ↓
Tenant Resolution
      ↓
Authorization
      ↓
Application Logic
```

or an equivalent security flow appropriate for the application.

## Instrumentation

The conversion workflow uses:

```ts
measureQuery(...)
```

to attach structured information to the observed operation.

The active runtime can also contain execution metadata such as:

```text
tenantId
requestId
loggerMeta
debug
meta
observer
budget
```

This allows instrumentation to correlate behavior with an execution without embedding telemetry logic into every business function.

Ambiten provides the runtime metadata boundary.

The logging, tracing, metric, or telemetry backend remains responsible for transporting and storing those signals.

## Model and infrastructure responsibilities

The conversion route works because responsibilities remain separated.

```text
Express Adapter
→ execution ingress

TenantResolver
→ tenant identity

AmbitenContext
→ execution-scoped state

Route Handler
→ product workflow

Tier Policy
→ business limits

AmbitenModel
→ operation coordination
  and context binding

ModelContext
→ persistence-facing
  operation state

AmbitenSchema
→ persistence structure
  and middleware behavior

DbProvider
→ database/client/session
  contract

MultiTenantManager
→ tenant infrastructure

AmbitenClient
→ MongoDB capability

Transaction Boundary
→ transaction lifecycle

MongoDB
→ persistence
```

No single component needs to own the entire runtime.

## What this tutorial demonstrates

| Capability | Runtime responsibility |
|---|---|
| Framework integration | Express adapter |
| Execution state | `AmbitenContext` |
| Tenant identity | Tenant resolver |
| Model context binding | `AmbitenModel` |
| Persistence state | Effective `ModelContext` |
| Schema policy | `AmbitenSchema` middleware |
| Business policy | Tier policy |
| Transactions | `AmbitenContext.withTransaction()` |
| Instrumentation | `measureQuery()` |
| Tenant infrastructure | `MultiTenantManager` / provider |
| MongoDB capability | `AmbitenClient` |

The key distinction is that tenant-aware execution is not the same thing as automatic security isolation.

Correct isolation depends on the application's tenant topology, authorization model, database configuration, and infrastructure resolution.

## Production extensions

The same architecture can evolve into a larger SaaS system with:

```text
authentication
authorization
billing
payment processing
background workers
PDF rendering services
object storage
message queues
analytics
audit systems
administrative tooling
rate limiting
usage accounting
```

Those capabilities can be added around the same execution model.

For example:

```text
Request
      ↓
Authentication
      ↓
Tenant Resolution
      ↓
Authorization
      ↓
AmbitenContext
      ↓
Business Workflow
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Tenant Infrastructure
      ↓
MongoDB
```

Background work can establish its own execution boundary:

```text
Queue Message
      ↓
AmbitenContext.run(...)
      ↓
Worker Logic
      ↓
AmbitenModel
      ↓
Infrastructure Resolution
```

This is why Ambiten uses the term **execution-scoped** rather than assuming all runtime work originates from HTTP.

## Process reuse

The tutorial deliberately creates infrastructure once:

```text
AmbitenClient
UserModel
ConversionModel
schemas
runtime configuration
```

and reuses it across many executions.

It does not create a new MongoDB client for each route call.

The runtime separates:

```text
Reusable Infrastructure
```

from:

```text
Execution-Specific State
```

That distinction becomes increasingly important under concurrency.

## Summary

This tutorial demonstrates Ambiten inside a realistic SaaS workflow rather than as a collection of isolated database calls.

The complete model is:

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

For multi-tenancy:

```text
TenantResolver
      ↓
AmbitenContext.tenantId
      ↓
ModelContext.tenantId
      ↓
Tenant Infrastructure
      ↓
Tenant Database
```

For transactions:

```text
Transaction Boundary
      ↓
AmbitenContext.session
      ↓
ModelContext.session
      ↓
Participating Operations
```

The application remains responsible for product behavior, authentication, authorization, and external system coordination.

Ambiten coordinates the execution and persistence boundary.

The central mental model is:

```text
Boundary creates execution.

Context carries execution.

Model binds execution
to an operation.

ModelContext carries
operation state.

Infrastructure resolves
resources.

MongoDB performs
persistence.
```

That separation is what allows the same application architecture to remain understandable as product and infrastructure requirements grow.