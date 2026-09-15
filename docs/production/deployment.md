# Deployment Guide

Deploying Ambiten is not only about starting an application server.

It means operating reusable MongoDB infrastructure alongside execution-scoped runtime state under real production conditions.

A production deployment should account for MongoDB topology, tenant infrastructure, connection reuse, transaction boundaries, instrumentation, worker execution, failure handling, and explicit runtime lifecycle management.

For guarantees inside an execution boundary, see [Execution Guarantees](/architecture/execution-guarantees).

<DocOverviewCards
  eyebrow="Production Runtime"
  title="Deploy Ambiten as an execution runtime, not only a MongoDB abstraction."
  description="Production deployment combines suitable MongoDB topology, reusable infrastructure, execution-scoped context, tenant-aware resource resolution, focused transactions, and observable runtime behavior."
  accent="#16a37b"
  :signals='[
    "MongoDB topology",
    "Tenant infrastructure",
    "Connection reuse",
    "Transactions",
    "Instrumentation",
    "Worker scope"
  ]'
  :cards='[
    {
      "label": "Topology",
      "title": "Database architecture shapes runtime behavior",
      "text": "Standalone, replica-set, and sharded MongoDB deployments provide different availability, transaction, and scaling characteristics."
    },
    {
      "label": "Execution",
      "title": "Runtime state remains execution-scoped",
      "text": "Tenant identity, request metadata, transaction sessions, and runtime metadata belong to AmbitenContext rather than shared mutable process state."
    },
    {
      "label": "Operations",
      "title": "Infrastructure must remain observable",
      "text": "Connection usage, tenant resolution, transaction behavior, failures, and instrumentation should remain measurable in production."
    }
  ]'
  :flow='[
    {
      "label": "Configure",
      "title": "Load runtime configuration"
    },
    {
      "label": "Initialize",
      "title": "Prepare reusable infrastructure"
    },
    {
      "label": "Execute",
      "title": "Establish execution boundaries"
    },
    {
      "label": "Observe",
      "title": "Monitor runtime behavior"
    }
  ]'
/>

## Deployment model

An Ambiten deployment contains both long-lived process infrastructure and short-lived execution state.

```text
PROCESS LIFETIME

AmbitenRuntime
AmbitenClient
MongoClient
MultiTenantManager
providers
runtime configuration
```

and:

```text
EXECUTION LIFETIME

AmbitenContext
tenantId
requestId
dbName
collectionName
session
logger metadata
runtime metadata
```

A typical request-driven application looks like:

```text
Client
      ↓
Application Instance
      ↓
Framework Adapter
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

An HTTP request is only one possible execution boundary.

Workers, scheduled jobs, queue consumers, CLI processes, and other workflows can establish execution state explicitly through `AmbitenContext.run(...)`.

## Application state

Ambiten keeps execution-specific runtime state out of shared mutable application state.

That includes values such as:

```text
tenantId
requestId
dbName
session
logger metadata
operation metadata
```

This is important for concurrent applications and horizontally scaled deployments.

It should not be interpreted as meaning that every Ambiten application is completely stateless.

Applications may still maintain:

```text
in-memory caches
local queues
rate-limit state
connection pools
runtime registries
application-specific process state
```

Whether those components are appropriate under horizontal scaling depends on the surrounding application architecture.

## Environment configuration

Production applications should keep environment-specific configuration outside application source where practical.

Typical variables may include:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=app_db
NODE_ENV=production
```

Applications using file-based runtime configuration can also use:

```text
ambiten.config.json
```

Production configuration should ensure:

- secrets are not committed to source control
- production and staging values remain clearly separated
- required variables are validated before startup
- tenant infrastructure configuration is loaded from an appropriate source
- runtime configuration remains deterministic across instances

Configuration files should not be assumed to contain secrets directly.

Use the secret-management facilities appropriate to the deployment platform.

## MongoDB topology

MongoDB topology affects availability, transaction capability, connection behavior, and operational complexity.

### Standalone

A standalone MongoDB deployment can be useful for:

```text
local development
testing
small controlled environments
```

It does not provide replica-set failover and does not support the same multi-document transaction model used by replica sets and sharded clusters.

Applications depending on Ambiten transaction boundaries should therefore deploy against transaction-capable MongoDB infrastructure.

### Replica set

Replica sets are a common production topology.

They can provide:

```text
replication
primary failover
multi-document transaction support
read preference options
```

Ambiten transactions can participate in MongoDB transactions when the resolved MongoDB client is connected to compatible transaction-capable infrastructure.

A replica set does not remove the need for operational planning around backups, capacity, latency, failover behavior, and monitoring.

### Sharded cluster

Sharded MongoDB deployments can distribute data and workload across multiple shards.

They introduce additional architectural considerations around:

```text
shard keys
query routing
tenant distribution
cross-shard operations
transaction cost
balancing behavior
capacity planning
```

Shard-key design should follow real query and distribution patterns.

Multi-tenancy alone does not determine the correct shard key.

## Multi-tenancy deployment strategies

Ambiten does not require one universal tenant storage topology.

The right model depends on isolation requirements, tenant count, workload characteristics, compliance needs, operational cost, and deployment architecture.

### Database-per-tenant

```text
tenant-a
   ↓
db_tenant_a

tenant-b
   ↓
db_tenant_b
```

This can provide clear database-level separation and can simplify some tenant-specific operational tasks.

It may also increase operational overhead as tenant count grows.

With Ambiten, the runtime path can look like:

```text
AmbitenContext.tenantId
      ↓
MultiTenantManager
      ↓
Tenant MongoClient / Database
      ↓
Model Collection
```

### Collection-per-tenant

```text
users_tenant_a
users_tenant_b
```

This topology separates data by collection.

It can be useful in some transitional or specialized architectures, but a large tenant population can produce substantial collection-management overhead.

The model and collection-resolution strategy should therefore be designed intentionally.

### Shared collection

```json
{
  "tenantId": "tenant-a",
  "name": "Alice"
}
```

A shared-collection architecture requires tenant discrimination to remain part of persistence behavior.

For example:

```text
Shared Database
      ↓
Shared Collection
      ↓
Tenant-Constrained Query
      ↓
Result
```

In this topology, database resolution alone does not establish tenant separation.

Filters, indexes, authorization, and persistence policy must reflect the tenant model.

## Tenant identity is not tenant authorization

Production deployment should keep three concerns separate:

```text
Authentication
→ who the caller is

Tenant Resolution
→ which tenant the execution is for

Authorization
→ whether the caller may act for that tenant
```

A valid `tenantId` inside `AmbitenContext` does not by itself prove that the caller is authorized to access that tenant.

Tenant-aware infrastructure resolution and tenant authorization must both be designed correctly.

## Horizontal scaling

Ambiten can be used in horizontally scaled applications because execution-specific state is carried through `AmbitenContext` rather than through shared request-global variables.

```text
                ┌→ App Instance A
Load Balancer ──┼→ App Instance B
                └→ App Instance C
```

Each instance owns its own process-level resources, such as:

```text
MongoClient pools
AmbitenClient
MultiTenantManager registry
local runtime configuration
```

Execution context does not automatically propagate between instances or services.

If work crosses a process boundary, relevant identity and correlation information must be propagated explicitly through the transport being used.

## Connection management

MongoDB clients should normally be initialized and reused rather than recreated for every request.

A production process should generally follow:

```text
Process Start
      ↓
Initialize AmbitenClient
      ↓
Connect MongoClient
      ↓
Serve Many Executions
      ↓
Graceful Shutdown
```

Avoid:

```text
Request
      ↓
new MongoClient()
      ↓
query
      ↓
close
```

for ordinary request handling.

Connection pools are process-level infrastructure.

Execution state belongs in `AmbitenContext` or the Effective `ModelContext`, not in mutable connection state.

## Multi-tenant connection growth

Multi-tenant deployments require additional attention to connection growth.

A topology that creates separate MongoDB clients for many active tenants can produce:

```text
more connection pools
more open sockets
higher server connection counts
greater process memory usage
```

`MultiTenantManager` can manage tenant infrastructure and client reuse, but infrastructure capacity still needs to be monitored.

Track values such as:

```text
registered tenants
connected tenants
pool size
connection wait time
MongoDB connection count
tenant activation patterns
```

Lazy tenant activation can reduce unnecessary client creation, but it does not remove the need for resource planning.

## Scoped client usage

Scoped clients can be useful when infrastructure scope should be fixed for a controlled operation.

For example:

```ts
const tenantClient =
  client.withTenant(
    "tenant-a"
  );
```

or:

```ts
const reportingClient =
  client.withDatabase(
    "reporting"
  );
```

For concurrent execution, scoped views are preferable to mutable database switching through APIs such as `useDatabase()`.

Explicit operation context can still override scoped defaults where supported.

## Transactions in production

Transactions should remain focused and deliberate.

Use them when participating MongoDB operations must succeed or fail as one unit of work.

```ts
await AmbitenContext.withTransaction(
  async () => {
    await OrderModel.create(
      order
    );

    await PaymentRecordModel.create(
      paymentRecord
    );
  }
);
```

The transaction lifecycle is:

```text
Transaction Boundary
      ↓
ClientSession
      ↓
AmbitenContext.session
      ↓
AmbitenModel.mergeCtx()
      ↓
ModelContext.session
      ↓
Participating MongoDB Operations
```

The enclosing boundary owns:

```text
start
commit
rollback
completion
```

Keep transaction duration reasonably short.

Avoid placing unrelated long-running work inside a MongoDB transaction.

## External side effects and transactions

MongoDB transactions do not automatically include:

```text
payment gateways
email delivery
HTTP APIs
message queues
object storage
filesystem writes
```

For example:

```text
MongoDB Transaction
      ↓
commit
      ↓
publish message
      ↓
external processing
```

may be more appropriate than holding the MongoDB transaction open while an external system responds.

Applications requiring consistency between MongoDB and external systems may need patterns such as:

```text
outbox
idempotency
retries
workflow coordination
compensation
```

depending on the system requirements.

## Adapter-managed transactions

Framework adapters can establish execution-wide transaction boundaries where supported:

```ts
enableTransactions: true
```

Applications can also create explicit transaction boundaries:

```ts
AmbitenContext.withTransaction(...)
```

These are alternative strategies.

Do not assume every application needs both.

Choose transaction scope according to the amount of work that actually requires atomic MongoDB behavior.

## Observability setup

Production systems should make runtime behavior measurable.

`AmbitenContextState` can carry structured metadata such as:

```text
tenantId
requestId
loggerMeta
debug
meta
observer
budget
```

This gives logging and instrumentation code access to execution-related metadata.

A production observability strategy may use systems such as:

```text
OpenTelemetry
structured application logs
metrics platforms
APM systems
centralized log storage
```

Ambiten provides runtime metadata and instrumentation points.

The chosen observability backend remains responsible for:

```text
export
buffering
delivery
storage
retention
visualization
cross-service correlation
```

Do not assume that runtime context alone provides distributed tracing across services.

## Logging

Logs can benefit from execution metadata such as:

```text
requestId
tenantId
operation
collection
duration
error information
```

Avoid logging sensitive tenant or document data simply because it is available in runtime state.

Production logging should balance diagnosability with:

```text
privacy
security
retention
cost
volume
```

## Runtime modes

Development and production environments often have different operational priorities.

Development may prioritize:

```text
verbose logging
debug metadata
local diagnostics
rapid feedback
```

Production may prioritize:

```text
structured logs
bounded telemetry
predictable error handling
resource limits
lower noise
```

Debug-heavy behavior should be enabled intentionally rather than assumed to be appropriate in every production environment.

## Background jobs and workers

Background processes do not inherit an HTTP request context automatically.

Establish an execution boundary explicitly:

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a",
    requestId: "job-001"
  },
  async () => {
    await JobModel.find({
      status: "pending"
    });
  }
);
```

The same model applies to:

```text
queue consumers
scheduled jobs
workers
CLI commands
maintenance tasks
batch processing
```

The execution flow becomes:

```text
Job / Message
      ↓
AmbitenContext.run(...)
      ↓
Application Logic
      ↓
AmbitenModel
      ↓
Effective ModelContext
      ↓
Infrastructure Resolution
```

Scoped providers can also be used where infrastructure scope should be fixed:

```ts
const tenantProvider =
  client.withTenant(
    "tenant-a"
  );
```

## Cross-process execution

`AmbitenContext` is execution-local.

It does not automatically travel through:

```text
message brokers
HTTP requests
worker queues
other Node.js processes
other services
```

When execution crosses a process boundary, propagate the information the receiving system actually needs.

For example:

```json
{
  "tenantId": "tenant-a",
  "requestId": "req-123",
  "jobId": "job-456"
}
```

The receiving worker can then establish a new `AmbitenContext`.

Do not attempt to serialize MongoDB `ClientSession` objects across processes.

Transaction scope remains local to the MongoDB session and process execution that owns it.

## Containerized environments

Ambiten can run in containerized environments such as Docker and Kubernetes.

Important deployment considerations include:

```text
graceful shutdown
connection pool sizing
readiness
liveness
resource limits
replica count
environment configuration
secret injection
```

On shutdown, allow the application to stop accepting new work before closing process-level resources where the deployment platform permits graceful termination.

## Serverless environments

Serverless platforms can use Ambiten where an appropriate adapter or execution integration exists.

These environments require additional attention to:

```text
cold starts
connection reuse
concurrent invocation behavior
execution lifetime
function timeout
transaction duration
tenant client growth
```

Reuse process-level MongoDB resources across warm invocations where the platform execution model allows it.

Do not assume that process state survives every invocation.

## Traditional servers

Long-running Node.js processes remain a valid deployment model.

Production operation should include:

```text
process supervision
graceful shutdown
connection reuse
health monitoring
log collection
resource monitoring
restart strategy
```

The runtime contract does not require a container or serverless platform.

## Failure handling

Production systems should expect failures.

Possible failure sources include:

```text
MongoDB connectivity
transaction aborts
tenant resolution failures
configuration errors
pool exhaustion
network interruption
middleware errors
application exceptions
external services
```

Failures should remain diagnosable.

Avoid swallowing errors merely to keep request handling moving.

Retries should be used only where the operation is safe to retry.

For write workflows, consider idempotency before adding automatic retry behavior.

## Tenant resolution failures

If tenant-aware execution requires a tenant and resolution fails, the application should fail that execution according to its configured error policy.

Do not silently route an unresolved tenant to an unrelated default database unless that fallback is explicitly part of the application's architecture.

Tenant validation should also remain separate from authorization.

## Graceful shutdown

Long-lived infrastructure should be closed deliberately during application shutdown.

A simplified lifecycle is:

```text
Receive Shutdown Signal
      ↓
Stop Accepting New Work
      ↓
Allow Active Work to Finish
      ↓
Stop Managed Runtime Services
      ↓
Close MongoDB Resources
      ↓
Exit Process
```

Where using `AmbitenRuntime`, prefer its managed lifecycle API when appropriate:

```ts
await runtime.shutdown();
```

Shutdown behavior should be coordinated with the hosting platform's termination grace period.

## Health checks

Health endpoints should distinguish between process availability and dependency health.

For example:

```text
Liveness
→ process is running

Readiness
→ process can accept work

Dependency health
→ MongoDB / required infrastructure is available
```

A single successful HTTP response should not necessarily be treated as proof that every tenant-specific dependency is reachable.

Dynamic tenant infrastructure may only be resolved when that tenant is actually used.

## Production checklist

Before deploying an Ambiten application, verify:

```text
[ ] MongoDB topology matches transaction and availability requirements

[ ] AmbitenClient / MongoClient infrastructure is reused

[ ] Tenant storage topology is explicitly defined

[ ] Tenant resolution is separate from authorization

[ ] Multi-tenant connection growth is monitored

[ ] Transaction boundaries are focused

[ ] External side effects are not assumed to be MongoDB-atomic

[ ] Execution state is carried through AmbitenContext

[ ] Background jobs establish their own execution boundary

[ ] Cross-process context is propagated explicitly

[ ] Instrumentation and logging are configured

[ ] Sensitive metadata is not logged unintentionally

[ ] Debug behavior is appropriate for production

[ ] Failure and retry behavior is intentional

[ ] Graceful shutdown closes runtime resources

[ ] Health checks reflect actual readiness requirements
```

## Mental model

```text
Process owns infrastructure.

Execution owns context.

Model binds context
to an operation.

Infrastructure resolves
runtime resources.

MongoDB owns persistence.

The application owns
system-level policy.
```

## Summary

Deploying Ambiten successfully means separating reusable process infrastructure from execution-scoped runtime state.

A production deployment should align:

```text
MongoDB topology
tenant architecture
connection reuse
execution boundaries
transaction scope
instrumentation
worker behavior
failure handling
shutdown lifecycle
```

Ambiten provides the runtime structure for carrying execution state and resolving persistence infrastructure.

It does not replace the surrounding responsibilities of authentication, authorization, MongoDB capacity planning, observability backends, external workflow coordination, or deployment-platform operations.

When those boundaries are designed deliberately, Ambiten can remain understandable as application concurrency, tenant count, and infrastructure complexity grow.

## Related pages

- [Execution Guarantees](/architecture/execution-guarantees)
- [Performance Tuning](/advanced/performance-tuning)
- [Multi-Tenancy](/multi-tenancy/overview)
- [AmbitenClient](/reference/api/ambiten-client)
- [Instrumentation](/core/instrumentation)