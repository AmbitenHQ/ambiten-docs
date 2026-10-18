---
title: Advanced Usage
description: Design Ambiten applications around execution context, transactions, tenant infrastructure, workers, observability, and resource ownership.
---

# Advanced Usage

Advanced Ambiten applications coordinate database operations across requests, services, tenants, workers, and background tasks.

The main design questions are:

- Where does each execution context begin?
- Which tenant and database resources belong to it?
- Which operations must share a transaction?
- What information crosses a process boundary?
- Who owns connection management and shutdown?

<AdvancedUsageOverview />

Ambiten provides the runtime mechanisms for these responsibilities. Application architecture determines how they are combined.

Examples on this page assume that the runtime has already been initialized and that application models declare the fields used in their operations.

## Runtime Boundaries

Separate application infrastructure from the state associated with one execution.

| Scope | Examples | Ownership |
| --- | --- | --- |
| Application process | Runtime, providers, tenant registry, database clients, Redis, logger | Application startup and shutdown |
| Request or job | Tenant ID, request ID, database scope, operation metadata | Adapter or explicit context boundary |
| Transaction | MongoDB session and transaction lifecycle | The code that starts the transaction |
| Distributed message | Serializable identity, correlation information, and payload | Producer and consumer contract |

Initialize shared infrastructure before accepting work.

Create an execution context for each request, job, or other independently handled operation.

## Configuration and Runtime State

Schema definitions, model options, and tenant resolver modules belong to application configuration.

Request identities, active sessions, and job-specific metadata belong to execution state.

For example, configuration can reference modules:

```json
{
  "schema": {
    "path": "./src/schemas/user.schema.ts",
    "exportName": "userSchema"
  },
  "model": {
    "path": "./src/models/user.model.ts",
    "exportName": "userModelOptions"
  }
}
```

Bootstrap loads those definitions and constructs the schema and model.

Runtime schema defaults are evaluated later, when documents are validated. A context default reads the active `AmbitenContext`; it does not capture a tenant during bootstrap.

Keep shared model and schema configuration stable while requests execute.

See [Configuration Modules](/advanced/configuration-modules) and [Schema](/models/schema).

## Explicit Context Management

Framework adapters establish context for supported request lifecycles.

For workers, scripts, scheduled tasks, and other entry points, establish it explicitly:

```ts
import { AmbitenContext } from "@ambiten/core";

await AmbitenContext.run(
  {
    tenantId: "tenant5",
    requestId: "maintenance-001"
  },
  async () => {
    await UserModel.find({});
  }
);
```

Await the returned promise when the caller must wait for the operation to finish.

### Nested contexts inherit state

`AmbitenContext.run()` merges the supplied fields with the active parent context.

This allows a nested operation to add metadata while retaining the current tenant and session.

It also means that supplying a different `tenantId` does not automatically remove an inherited session, database name, collection name, or other state.

Keep tenant and database scope consistent throughout a transaction. Start independent tenant work from an appropriate execution boundary.

The merge is shallow. Nested metadata objects can still contain shared references.

### Operation overrides and context defaults

Model operation options and `AmbitenContext` serve related but distinct purposes.

A per-operation tenant or database override does not necessarily replace an existing ambient context. Schema context defaults and instrumentation may still read that active context.

Keep operation overrides aligned with the execution context so database routing, document defaults, and diagnostic metadata describe the same execution.

## Transaction Orchestration

Use a transaction when multiple database operations must commit as one unit.

`AmbitenContext.withTransaction()` resolves a MongoDB client for the active execution, creates a session when needed, and exposes that session through the context.

For example:

```ts
import { AmbitenContext } from "@ambiten/core";

await AmbitenContext.run(
  {
    tenantId: "tenant5",
    requestId: "registration-001"
  },
  async () => {
    await AmbitenContext.withTransaction(async () => {
      const user = await UserModel.create({
        username: "Alice",
        email: "alice@example.com"
      });

      await OrderModel.create({
        userId: user._id,
        status: "pending"
      });
    });
  }
);
```

The models must resolve collections through the MongoDB client that owns the transaction session.

Bootstrap configures the transaction resolver. Applications that initialize providers manually must configure the corresponding context integration, for example through `configureAmbitenContext(provider)`.

MongoDB multi-document transactions require a supported replica-set or sharded-cluster deployment. A standalone MongoDB deployment does not support them.

### Sequential operations

Await operations sequentially within one transaction.

The MongoDB Node.js driver does not support parallel operations inside a single transaction. Avoid `Promise.all()` for operations sharing that session.

Parallel application work should use independent execution scopes and sessions where appropriate.

### Nested transactional calls

When `AmbitenContext` already contains a session, `withTransaction()` reuses it.

A nested call does not create a savepoint or independently commit its work. The outer transaction owner controls the outcome.

The current implementation checks for an existing session; it does not verify that the supplied session already has an active transaction.

Placing a session in context is therefore not equivalent to starting a transaction.

### Retry behavior

When available, `AmbitenContext.withTransaction()` uses the MongoDB driver's `session.withTransaction()` implementation.

The driver can retry the callback for certain transaction errors. Write callbacks so repeated execution does not duplicate external side effects.

Keep email delivery, HTTP calls, and queue publication outside retryable transaction callbacks. For reliable event delivery, consider recording an outbox entry in the same database transaction and processing it separately.

### Hooks and events are not commit notifications

A model operation can complete before an enclosing transaction commits.

Schema post hooks, model middleware, instrumentation, cache activity, and published model events must not be treated as proof that the outer transaction committed.

MongoDB rollback does not undo effects already performed outside MongoDB.

For transactional reads, leave query-result caching disabled so the read uses the transaction's database session.

## Manual Transaction Control

The manual helper accepts a session followed by an operation:

```ts
runManualTransaction(session, operation);
```

It does not create the session or automatically place it in `AmbitenContext`.

For example, at a boundary with no existing transaction:

```ts
import {
  AmbitenContext,
  runManualTransaction
} from "@ambiten/core";

await AmbitenContext.run(
  {
    tenantId: "tenant5",
    requestId: "manual-transaction-001"
  },
  async () => {
    const provider = runtime.getMongoClient();

    const session = await provider.startSession({
      tenantId: "tenant5"
    });

    await runManualTransaction(
      session,
      async (activeSession) => {
        await AmbitenContext.run(
          {
            session: activeSession
          },
          async () => {
            const user = await UserModel.create({
              username: "Alice",
              email: "alice@example.com"
            });

            await OrderModel.create({
              userId: user._id,
              status: "pending"
            });
          }
        );
      }
    );
  }
);
```

The helper starts the transaction, commits successful work, aborts failed work, and ends the session.

Unlike the driver's convenient transaction API, this helper does not implement automatic transaction retries.

Use it when the application intentionally owns that lower-level orchestration.

## Tenant Identity and Tenant Infrastructure

Ambiten separates the identity of an execution from its database configuration.

| Component | Question it answers |
| --- | --- |
| Request-facing tenant resolver | Which tenant does this request identify? |
| `AmbitenContext` | Which tenant belongs to this execution? |
| `TenantConfigResolver` | What database configuration belongs to an unknown tenant? |
| `MultiTenantManager` | Which tenant configurations and clients are registered in this runtime? |

A request or job usually needs a tenant identifier.

The receiving application's infrastructure resolves the MongoDB URI, database name, client, and registration state associated with that identifier.

## Tenant Isolation Strategies

Different storage designs require different enforcement.

| Strategy | Resource organization | Application responsibility |
| --- | --- | --- |
| Database per tenant | Each tenant resolves to a database. | Control database selection, credentials, indexes, and lifecycle. |
| Collection per tenant | Tenants use distinct collections. | Enforce collection selection and consistent collection maintenance. |
| Shared collections | Documents include tenant-identifying fields. | Enforce tenant predicates across every relevant read and write. |
| Hybrid | Different tenants use different storage arrangements. | Maintain explicit routing and policy for each arrangement. |

The tenant manager's configuration naturally supports resolving a tenant URI and database name.

Separate database names do not automatically mean separate servers, credentials, or physical infrastructure.

### Shared collections require explicit enforcement

A `tenantId` field or schema context default does not automatically add tenant filters to queries.

A default only fills a missing value. It does not establish that a supplied value belongs to the authenticated tenant.

Shared-collection isolation must cover reads, updates, deletes, aggregations, bulk operations, and direct driver access.

## Dynamic Tenant Discovery

With multi-tenancy enabled, install a resolver function:

```ts
import {
  MultiTenantManager,
  type TenantConfigResolver
} from "@ambiten/core";

const resolveTenantConfig: TenantConfigResolver = (
  tenantId
) => {
  if (tenantId !== "tenant5") {
    return undefined;
  }

  return {
    uri: "mongodb://localhost:27017/my-app_tenant5",
    dbName: "my-app_tenant5",
    metadata: {
      tier: "enterprise",
      region: "eu-central"
    }
  };
};

MultiTenantManager.setTenantConfigResolver(
  resolveTenantConfig
);
```

The function can be asynchronous when configuration comes from a control database or service.

Return `undefined` or `null` when the tenant is not found. Throw when the configuration source fails.

The resolver result contains `uri`, optional `dbName`, and optional `metadata`. Registration state and MongoDB clients belong to the manager.

For configuration-driven bootstrap, reference the function through `multiTenant.tenantConfigResolverModule`.

See [Dynamic Tenants](/multi-tenancy/dynamic-tenants).

### Discovery and connection are separate

`resolveTenant()` can discover a tenant and register its configuration lazily.

`getClient()` resolves the tenant and opens a connection when needed.

| Method | Behavior |
| --- | --- |
| `getTenant(id)` | Looks only in the local registry. |
| `resolveTenant(id)` | Uses the local registry or the configured external resolver. |
| `getClient(id)` | Obtains the tenant client, connecting a lazy tenant when necessary. |

`getClient()` returns `null` when no tenant can be resolved. Connection and resolver failures can reject the operation.

Normal model operations can use the active tenant context to resolve these resources. Repeating discovery and client lookup in every controller is usually unnecessary.

### Registered configuration is process-local

Discovered tenants remain registered in the current process.

The manager does not automatically refresh existing registrations when an external source changes. Credential rotation or tenant relocation requires coordinated application handling.

Each application process or worker maintains its own registry and clients.

`getAllTenants()` lists locally registered tenants. It does not enumerate every tenant in an external service.

## Background Workers

Initialize the worker's runtime before it begins consuming jobs.

Each job should provide enough validated information to establish its own context.

```ts
import { AmbitenContext } from "@ambiten/core";

interface ProcessUserJob {
  id: string;
  tenantId: string;
  email: string;
}

async function processJob(
  job: ProcessUserJob
): Promise<void> {
  if (!job.tenantId.trim()) {
    throw new Error("Job tenantId is required.");
  }

  await AmbitenContext.run(
    {
      tenantId: job.tenantId,
      requestId: `job-${job.id}`
    },
    async () => {
      await UserModel.updateOne(
        {
          email: job.email
        },
        {
          $set: {
            processed: true
          }
        }
      );
    }
  );
}
```

This example assumes the application model includes `email` and `processed`.

Validate messages at the queue boundary and design job effects for the queue's retry and delivery behavior.

A TypeScript interface describes the expected message shape; it does not validate received data at runtime.

## Scheduled Tasks

Scheduled work should establish a context for each tenant execution.

A reusable application helper can accept the work to perform:

```ts
import { randomUUID } from "node:crypto";
import { AmbitenContext } from "@ambiten/core";

async function runForTenants(
  tenantIds: readonly string[],
  task: () => Promise<void>
): Promise<void> {
  for (const tenantId of tenantIds) {
    await AmbitenContext.run(
      {
        tenantId,
        requestId: `scheduled-${randomUUID()}`
      },
      task
    );
  }
}
```

`task` is an application callback, not a built-in Ambiten model method.

Call this helper from the scheduler's independent execution boundary, outside another tenant's transaction.

Obtain the tenant list from the appropriate source. A process-local registry may not include tenants that this worker has never encountered.

Use bounded concurrency when increasing scheduled throughput.

## Detached Work and Queue Boundaries

A timer created inside an asynchronous context can inherit that context.

This does not make it safe to continue using the original request's transaction session after the request or transaction has finished.

For work that must survive independently, create a serializable job containing the required identity and payload:

```ts
interface UserJobMessage {
  id: string;
  tenantId: string;
  originatingRequestId?: string;
  payload: {
    email: string;
  };
}
```

The consumer validates the message and establishes a new execution context.

Carry identifiers and correlation information across the boundary. Do not serialize MongoDB clients, sessions, or the complete context object.

AsyncLocalStorage state does not travel through a queue, network request, or worker-thread message.

## Cross-Service Execution

Services must propagate required identity explicitly.

For example, within an authenticated execution:

```ts
const context = AmbitenContext.get();

if (!context.tenantId) {
  throw new Error("Tenant context is required.");
}

const headers: Record<string, string> = {
  "x-tenant-id": context.tenantId
};

if (context.requestId) {
  headers["x-request-id"] = context.requestId;
}

const response = await fetch(
  "https://users.internal/api/users",
  {
    headers
  }
);

if (!response.ok) {
  throw new Error(
    `User service returned HTTP ${response.status}.`
  );
}
```

This illustrates context headers only. The service-to-service authentication mechanism remains part of the application's transport configuration.

The receiving service verifies the caller's authority and establishes its own context.

A propagated request ID provides correlation. It does not extend a MongoDB transaction across services.

## Framework Adapter Boundaries

Use the framework adapter as the primary context boundary for supported request lifecycles.

Install authentication and other required request processing in the appropriate order, then let the adapter establish the execution context before application logic runs.

Domain services can read:

```ts
const {
  tenantId,
  requestId
} = AmbitenContext.get();
```

They do not need a framework request object solely to obtain these identifiers.

### Express transaction boundaries

Establish transactions around the application operation that must be awaited:

```ts
await AmbitenContext.withTransaction(async () => {
  await UserModel.create({
    username: "Alice",
    email: "alice@example.com"
  });

  await OrderModel.create({
    customerEmail: "alice@example.com",
    status: "pending"
  });
});
```

The current Express adapter passes control onward through `next()`. Returning from `next()` does not mean downstream asynchronous route work has finished.

Keep the adapter's `enableTransactions` option disabled when using explicit route or service transaction boundaries. An adapter-level transaction must not be assumed to cover the full asynchronous Express handler.

## Query Discipline

Query efficiency remains an application responsibility.

The model's `find()` signature is:

```ts
find(filter, context?, queryOptions?);
```

Its second argument is execution context, not MongoDB `FindOptions`. Passing a projection there does not configure a projected query.

For a bounded projection through the model API, use an aggregation:

```ts
const users = await UserModel.aggregate([
  {
    $match: {
      isDeleted: false
    }
  },
  {
    $sort: {
      _id: 1
    }
  },
  {
    $limit: 50
  },
  {
    $project: {
      _id: 0,
      username: 1,
      email: 1
    }
  }
]);
```

This example assumes the model uses an `isDeleted` field.

Design indexes for the actual filters and sorting used by the application. Bound result sizes and review expensive aggregation stages.

Direct MongoDB driver queries can use driver-specific options, but they bypass Ambiten model middleware and schema hooks.

## Observability and Instrumentation

Model operations such as `find()` and `create()` already use Ambiten's query instrumentation.

For application code that calls the MongoDB driver directly, `measureQuery()` accepts a metadata object followed by an asynchronous executor.

```ts
import {
  AmbitenContext,
  measureQuery
} from "@ambiten/core";

await AmbitenContext.run(
  {
    tenantId: "tenant5",
    requestId: "query-001",
    logger: runtime.getLogger()
  },
  async () => {
    const db = await runtime.getMongoClient().db({
      tenantId: "tenant5"
    });

    return measureQuery(
      {
        operation: "find",
        collectionName: "users"
      },
      async () => {
        return db.collection("users")
          .find(
            {},
            {
              projection: {
                username: 1,
                email: 1
              }
            }
          )
          .limit(50)
          .toArray();
      }
    );
  }
);
```

`measureQuery()` requires an active Ambiten context.

It records execution information such as tenant ID, request ID, duration, outcome, and query-budget counters.

Wrapping an already instrumented model operation measures it again and increments the instrumentation budget again. Use a separate application timing mechanism when measuring an entire service workflow.

### Context logging

A bootstrap logger and a context logger are separate references.

Supply a logger in the execution context when query instrumentation should use it, or explicitly obtain the runtime logger for application messages:

```ts
const logger = runtime.getLogger();

const {
  tenantId,
  requestId
} = AmbitenContext.get();

logger.info("User operation completed", {
  tenantId,
  requestId,
  operation: "UserModel.create"
});
```

### Observer callbacks

Query observer callbacks are scheduled asynchronously. Their completion is not awaited as part of the database operation.

Handle failures inside asynchronous observer implementations.

Observers provide telemetry; they are not transaction-commit hooks.

### Sensitive query metadata

Instrumentation may include filters, updates, or aggregation pipelines.

Apply appropriate redaction and access controls to diagnostic output. Use identifiers and sanitized metadata instead of passwords, tokens, connection credentials, or complete request payloads.

## Runtime Statistics

Inspect the current tenant registry:

```ts
const stats = MultiTenantManager.getStats();
```

For example:

```ts
{
  registeredTenants: 4,
  connectedTenants: 1,
  lazyTenants: 3,
  dynamicResolverEnabled: true
}
```

These values describe the current process.

`connectedTenants` counts registered entries with a stored client. It is not a database health check or an active-request count.

The statistics also exclude the bootstrap provider's separate main connection.

Use them alongside connection failures, operation latency, query errors, and workload measurements.

## Connection Management and Scaling

Reuse runtime clients across ordinary operations.

Opening and closing a MongoDB client for each request adds connection work and prevents effective reuse.

For tenant infrastructure, consider:

- The number of application processes and replicas.
- The number of tenants encountered by each process.
- Per-tenant client and pool usage.
- First-use connection latency.
- Tenant workload distribution.
- Registry growth and connection retirement.

The current manager shares concurrent external configuration lookups for the same tenant ID. It does not provide equivalent deduplication for concurrent first-time client creation.

It also does not provide automatic idle-client eviction.

Account for these behaviors when testing simultaneous first access and large tenant populations.

Closing or replacing tenant clients requires application coordination so active operations are not interrupted.

## Middleware and Operation Policy

Register schema hooks and model middleware during startup.

For example:

```ts
const userSchema = runtime.getSchema();

userSchema.pre("find", async (context) => {
  if (!context.tenantId) {
    throw new Error("Missing tenant context.");
  }
});
```

This checks tenant presence for that hook. It does not authorize a user or enforce every model operation.

Choose the layer that owns the policy:

| Policy | Appropriate layer |
| --- | --- |
| Caller authentication | Framework or transport security |
| Tenant access authorization | Application security boundary |
| Request tenant resolution | Adapter resolver |
| Tenant database discovery | `TenantConfigResolver` and manager |
| Document normalization | Model middleware before validation |
| Model operation checks | Relevant model middleware or schema hooks |
| Connection ownership | Runtime and application lifecycle |

For `create()`, schema pre-create hooks run after initial document validation. Required fields must already be present or supplied by valid defaults before that point.

Use model middleware before validation when normalization must happen first.

## Security and Tenant Isolation

Resolving a tenant identifier does not establish authorization.

The application must verify that the authenticated caller or trusted job producer is permitted to act for the selected tenant.

Database and collection scope also require attention. The shared adapter runtime can read database and collection names from configured headers.

Treat those values as untrusted input unless the application controls and validates them. Ensure they cannot override an authorized tenant's intended database or collection scope.

Schema defaults, request IDs, and tenant existence checks are not substitutes for access control.

## Failure Semantics

Keep different failure conditions distinguishable.

| Condition | Expected handling |
| --- | --- |
| External tenant is absent | Resolver returns `undefined` or `null`. |
| Tenant registry service fails | Resolver throws or rejects. |
| Resolver returns invalid configuration | Configuration validation rejects it. |
| MongoDB cannot connect | Client acquisition rejects. |
| Request tenant identity is missing | Request or job boundary rejects the execution. |
| Caller lacks tenant access | Application authorization rejects the operation. |

Map these failures to the application's HTTP, queue, or worker error contract.

Do not convert every resolver failure into “tenant not found,” and do not silently redirect an unresolved tenant to an unrelated database.

Retry temporary failures according to application policy. Permanent identity or configuration failures need different handling.

## Package Boundaries

Adapters, the shared adapter runtime, and Core must resolve compatible public package entry points.

Use:

```ts
import { AmbitenContext } from "@ambiten/core";

import {
  createExpressAdapter
} from "@ambiten/adapter-express";
```

Internal `dist` imports can bypass the intended package exports.

Verify that the application and adapters resolve compatible Core installations. Separate module instances can lead to separate context stores.

ESM and CommonJS support should be exercised through actual consumer entry points.

## Integration Testing

Test behavior across the boundaries the deployed application uses.

Useful cases include:

- Concurrent requests for different tenants retain their own context.
- Context remains available after awaited service and model calls.
- An unknown tenant can be discovered and connected.
- Missing or unauthorized tenants do not reach unrelated resources.
- A failed transaction rolls back its database writes.
- Retried work does not duplicate external effects.
- Worker messages establish the intended tenant context.
- Schema defaults read the active execution identity.
- Shutdown drains work before connections close.

For package releases, also test built and packed artifacts in isolated ESM and CommonJS consumers.

Source-level tests alone do not verify the package exports, dependency resolution, or emitted files used by external applications.

## Graceful Shutdown

Shutdown is an application lifecycle operation.

Coordinate it in this order:

1. Stop accepting new requests and jobs.
2. Wait for active work to finish.
3. Stop recurring tasks, consumers, and application-owned services.
4. Close tenant clients owned by the application.
5. Await `runtime.shutdown()`.

In v1.3.0, `runtime.shutdown()` disconnects the shared Redis client, closes the configured database provider, and invokes logger cleanup.

It does not automatically close the HTTP server, explicitly close all clients stored in `MultiTenantManager`, or stop every application scheduler.

`removeTenant()` and `clearTenants()` remove registry entries without closing their clients.

Avoid forcing process exit before cleanup and buffered logging have completed.

See [AmbitenBootstrapFactory](/advanced/bootstrap-cli) for a complete startup and shutdown example.

## Operational Review

Before deploying an advanced application, verify the responsibilities that matter for its workload:

| Area | What to verify |
| --- | --- |
| Startup | Required infrastructure is ready before work is accepted. |
| Context | Request and job identities remain correct across asynchronous work. |
| Tenancy | Routing and authorization agree on the allowed resources. |
| Transactions | Session ownership, callback lifetime, and retries are understood. |
| Workers | Messages are validated and repeated delivery is handled. |
| Connections | Client growth and first-use concurrency are measured. |
| Observability | Telemetry is correlated, bounded, and appropriately redacted. |
| Shutdown | Work is drained before owned resources are closed. |
| Packaging | The application's actual module format and package versions are tested. |

## Related Pages

- [Context](/core/context)
- [Transactions](/core/transactions)
- [Instrumentation](/core/instrumentation)
- [Middleware](/core/middleware)
- [Schema](/models/schema)
- [Configuration Modules](/advanced/configuration-modules)
- [AmbitenBootstrapFactory](/advanced/bootstrap-cli)
- [CLI Init](/advanced/cli-init)
- [Performance Tuning](/advanced/performance-tuning)
- [Multi-Tenancy Overview](/multi-tenancy/overview)
- [Tenant Resolution](/multi-tenancy/tenant-resolver)
- [MultiTenantManager](/multi-tenancy/multi-tenant-manager)
- [Dynamic Tenants](/multi-tenancy/dynamic-tenants)
- [Framework Adapters](/multi-tenancy/framework-adapters)
- [Runtime Execution Flow](/architecture/runtime-execution-flow)
- [Architecture](/architecture/whitepaper)