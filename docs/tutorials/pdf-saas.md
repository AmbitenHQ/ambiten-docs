<TutorialHero />

This tutorial builds a tenant-aware document-to-PDF SaaS application designed to demonstrate how Ambiten behaves as a runtime system under real product workflows.

Rather than focusing only on CRUD operations, the tutorial shows how context propagation, transactions, middleware, instrumentation, and tenant isolation work together inside a production-style architecture.

The application includes multi-tenant execution, tier-aware usage limits, transaction-safe conversion records, middleware-driven policy enforcement, and instrumentation-aware runtime behavior.

## Product requirements

The application supports three user tiers:

| Tier | Access Model | Behavior |
|---|---|---|
| Free | Anonymous or basic users | Limited conversions |
| Premium | Registered users | Higher conversion limits |
| Ultimate | Paid users | Full access |

The system must remain tenant-aware, track conversion usage, enforce plan limits, record conversion activity, and keep runtime behavior observable without manually passing tenant or transaction state through every function.

## Runtime architecture

```text
Request
  ↓
Express Adapter
  ↓
AmbitenContext
  ↓
Tier Policy
  ↓
AmbitenModel
  ↓
Provider / AmbitenClient
  ↓
MongoDB
```

The route handlers stay focused on product behavior while the runtime coordinates infrastructure concerns underneath the execution flow.

## Install and scaffold

```bash
npx ambiten init pdf-saas --multi-tenant --logger --install

cd pdf-saas

npm install express multer
```

Fork the repository, clone it into your workspace, and open it in your preferred IDE.

If you are starting manually, create the following structure inside the project root:

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

## Establish a database connection

```ts
// src/core/db.ts
import { AmbitenClient } from "@ambiten/core";

export async function dbDriver() {
  const client = new AmbitenClient({
    uri: process.env.MONGODB_URI,
    options: {
      dbName: "pdf-saas"
    }
  });

  await client.connect();

  return client;
}
```

In production systems, the client should usually be initialized once and reused across the application lifecycle.

## User model

```ts
// src/models/user.model.ts
import { AmbitenSchema, AmbitenModel } from "@ambiten/core";
import { dbDriver } from "../core/db";

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

export const userSchema = new AmbitenSchema<User>({
  email: String,
  tier: String,
  paid: Boolean,
  createdAt: Date
});

export async function createUserModel() {
  const provider = await dbDriver();

  return new AmbitenModel<User>({
    collectionName: "users",
    schema: userSchema,
    provider
  });
}
```

The model remains focused on domain behavior while runtime scope is resolved dynamically through context.

## Conversion model

```ts
// src/models/conversion.model.ts
import {
  AmbitenSchema,
  AmbitenModel
} from "@ambiten/core";

import { dbDriver } from "../core/db";
import type { UserTier } from "./user.model";

export interface Conversion {
  userId: string;
  fileName: string;
  status: "pending" | "completed" | "failed";
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

conversionSchema.pre(
  "create",
  async (ctx) => {
    if (!ctx.tenantId) {
      throw new Error(
        "Tenant context is required."
      );
    }

    if (ctx.doc) {
      ctx.doc.createdAt = new Date();
    }
  }
);

export async function createConversionModel() {
  const provider = await dbDriver();

  return new AmbitenModel<Conversion>({
    collectionName: "conversions",
    schema: conversionSchema,
    provider
  });
}
```

Middleware enforces runtime policy without leaking infrastructure logic into routes or services.

## Tier policy

```ts
// src/policies/tier-policy.ts
import type { UserTier }
from "../models/user.model";

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

This policy layer stays intentionally small so product rules remain isolated from runtime orchestration.

## Application setup

```ts
// src/main.ts
import express from "express";
import multer from "multer";

import { createExpressAdapter } from "@ambiten/express";

import {
  AmbitenBootstrapFactory,
  AmbitenContext,
  measureQuery
} from "@ambiten/core";

import { createUserModel } from "./models/user.model";

import { createConversionModel } from "./models/conversion.model";

import { getTierLimit } from "./policies/tier-policy";

const app = express();

const upload = multer({
  dest: "uploads/"
});

app.use(express.json());

const adapter =
  createExpressAdapter();

await AmbitenBootstrapFactory.create({
  adapter,
  config: "./ambiten.config.json"
});

await adapter.install(app, {
  tenancy: {
    header: "x-tenant-id",
    fallback: "default"
  },
  enableTransactions: true
});
```

The adapter establishes the runtime boundary before application logic executes.

## Register a premium user

```ts
app.post(
  "/register",
  async (req, res) => {
    const UserModel =
      await createUserModel();

    const user =
      await UserModel.create({
        email: req.body.email,
        tier: "premium",
        paid: false,
        createdAt: new Date()
      });

    res.json(user);
  }
);
```

In this workflow, premium users are identified by registration while ultimate users represent paid accounts.

## Upgrade to ultimate

```ts
app.post(
  "/upgrade",
  async (req, res) => {
    const { userId } = req.body;

    const UserModel =
      await createUserModel();

    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          tier: "ultimate",
          paid: true
        }
      }
    );

    res.json({ success: true });
  }
);
```

The runtime keeps update behavior tenant-aware and transaction-capable without additional plumbing.

## Convert a document

```ts
app.post(
  "/convert",
  upload.single("file"),
  async (req, res) => {
    const userId = req.body.userId;

    const UserModel =
      await createUserModel();

    const ConversionModel =
      await createConversionModel();

    const conversion =
      await AmbitenContext.withTransaction(
        async () => {
          const user =
            await UserModel.findOne({
              _id: userId
            });

          if (!user) {
            throw new Error(
              "User not found."
            );
          }

          const limit =
            getTierLimit(user.tier);

          const conversions =
            await ConversionModel.find({
              userId
            });

          if (
            conversions.length >= limit
          ) {
            throw new Error(
              "Conversion limit reached. Upgrade your plan."
            );
          }

          return measureQuery(
            {
              operation: "create",
              collectionName:
                "conversions",
              extra: {
                feature:
                  "document.convert",
                tier: user.tier
              }
            },
            async () => {
              return ConversionModel.create({
                userId,
                fileName:
                  req.file?.originalname ??
                  "unknown",
                status: "completed",
                tierUsed: user.tier,
                createdAt: new Date()
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

## Runtime behavior

When `/convert` executes, the Express adapter establishes the runtime boundary and resolves tenant identity from the incoming request.

`AmbitenContext` stores request-scoped metadata, the transaction boundary becomes active, and both models execute inside the same runtime scope.

Middleware validates tenant state, instrumentation records structured telemetry, and the provider resolves the correct database connection before MongoDB persists the conversion record.

The route remains focused on product behavior while Ambiten coordinates execution concerns underneath it.

### Example request

```bash
POST /convert
x-tenant-id: company-a
Content-Type: multipart/form-data
```

## What this tutorial demonstrates

This tutorial demonstrates how Ambiten’s runtime model keeps infrastructure behavior centralized while application code stays focused on workflow logic.

| Capability | Runtime boundary |
|---|---|
| Adapter integration | Express adapter |
| Context propagation | `AmbitenContext` |
| Tenant isolation | `x-tenant-id` |
| Transactions | `withTransaction()` |
| Middleware policy | `conversionSchema.pre("create")` |
| Instrumentation | `measureQuery()` |
| Provider resolution | `AmbitenClient` |

## Production extensions

The same architecture can evolve into a larger SaaS platform by introducing authentication, payment processing, distributed workers, object storage, analytics, audit systems, and administrative tooling.

Because execution boundaries are already established through context, middleware, and instrumentation, these capabilities can be added without restructuring the core runtime model.

## Summary

This tutorial demonstrates Ambiten inside a realistic SaaS workflow rather than a simplified CRUD example.

Tenant isolation, transactions, middleware, provider resolution, and instrumentation all remain aligned through the runtime while application code stays focused on the product itself.

The result is a system where execution behavior stays predictable as the application grows in scale and complexity.
