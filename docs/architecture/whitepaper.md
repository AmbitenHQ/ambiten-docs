# Tenra Architecture Overview

Tenra is engineered as a context-aware runtime. Its primary design goal is the separation of application logic from infrastructure concerns, enabling framework-agnostic, multi-tenant, and transaction-safe data access.

This page explains Tenra’s runtime architecture. If you are looking for the behavior this architecture guarantees, see [Execution Guarantees](/architecture/execution-guarantees).

## Core Philosophy

Traditional Object-Document Mappers (ODMs) couple data access to framework conventions. This requires manual coordination of runtime concerns—tenant resolution, transaction sessions, and request metadata—leading to "infrastructure leakage" within the business domain.

Tenra introduces a managed runtime layer that carries execution state independently of the host environment. Context flows automatically through asynchronous call stacks, policies can be defined once and enforced consistently, and application code remains focused on business logic rather than plumbing.

## Architectural Model

Tenra uses a decoupled, layered architecture to ensure that context propagation, model execution, and persistence behavior remain independent of the host runtime (Express, Fastify, AWS Lambda, etc.).

<ArchitectureDiagram />

### 1. Adapter Layer

The entry point into the Tenra ecosystem. It normalizes heterogeneous ingress such as HTTP requests, GraphQL operations, and queue events into a unified execution boundary with lifecycle integration, metadata extraction, and initial tenant resolution.

### 2. Adapter Runtime

The runtime coordination layer between external frameworks and the Tenra execution core. It standardizes tenant identification strategies and validates tenancy constraints before execution reaches application logic.

### 3. TenraContext (The "Ambient" Core)

Built on top of Node.js `AsyncLocalStorage` primitives, `TenraContext` provides request-scoped state across asynchronous boundaries. It eliminates context plumbing by making values such as `tenantId`, `requestId`, active transaction sessions, and trace headers available without manual parameter passing.

### 4. Core Layer

The runtime engine that transforms raw database operations into context-aware executions through schema-aware validation, middleware pipelines, and automatic query decoration.

### 5. Multi-tenancy & Isolation Layer

In Tenra, multi-tenancy is a `runtime boundary`, not a query filter. Once a tenant is resolved, the runtime handles database routing, collection partitioning, and logical isolation automatically.

### 6. Persistence Layer

Tenra maintains a "High-Fidelity" relationship with the MongoDB driver. `We do not mask MongoDB; we provide a structured execution model around it` to preserve operational transparency and performance.

## Execution lifecycle

| Stage | Action | Component |
| --- | --- | --- |
| 1. Ingress | Request enters system | Adapters (e.g. Fastify) |
| 2. Resolve | Tenant + metadata extracted | Adapter Runtime |
| 3. Scope | `TenraContext.run()` initializes | TenraContext |
| 4. Process | Domain logic / Services execute | Application Layer |
| 5. Access | Context-aware data operations | Core Layer |
| 6. Egress | Context released; response sent | Adapter |

> We do not mask MongoDB; we provide a structured execution model around it


## Design Principles for the Enterprise

### Framework-Agnosticism

The core runtime layer is isolated from the transport layer. You can migrate from a monolithic Express app to AWS Lambda functions without changing a single line of your `UserModel` or service logic.

### Isolation by Default

Tenant isolation is enforced at the runtime boundary rather than delegated to application-level conventions. Tenant boundaries and transaction states are "Locked-in" at the start of the request, removing the risk of developer error leading to cross-tenant data leaks.

### Observability & Traceability

By owning the execution context, Tenra natively supports distributed tracing. Every database operation is automatically tagged with the originating `requestId` and `tenantId`, providing perfect audit trails out of the box.

## Strategic comparison

| Capability | Traditional ODM(Mongoose/Prisma) | Tenra |
| --- | --- | --- |
| State propagation | Manual / Prop-drilling | Ambient /Automatic |
| Multi-tenancy | Developer-implemented filters | Native Runtime Boundary |
| Transactions | Explicit session passing | Context-Aware Auto-Join |
| Portability | High coupling to Framework | Universal (Adapter-driven) |
| Auditing | Manual implementation | Automatic via Metadata |

## Summary

Tenra is not a simple library; it is a strategic runtime architecture for teams building high-stakes, multi-tenant applications. By moving infrastructure concerns into a managed runtime, Tenra keeps execution portable, context-aware, and secure as the application scales.

## See also

- [Implementing Context](/core/context)
- [Multi-tenancy Strategies](/architecture/multi-tenancy)
- [TenraBootstrap](/advanced/bootstrap-cli)
- [Transaction Management](/core/transactions)
- [Writing Custom Adapters](/adapters/overview)
