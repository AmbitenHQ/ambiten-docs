# Bonus — Build an Agent-Ready MCP Server with Ambiten

A complete, independent checkpoint based on Tutorial 12. This bonus is outside
the numbered core path and preserves the existing REST API, worker, models,
services, lifecycle policies, tenant infrastructure, and instrumentation.

Read the [full tutorial](../../../docs/tutorials/bonus-mcp-server.md).

## Setup

Use Node.js 22.13 or later and a running MongoDB server.

```bash
npm ci
cp .env.example .env
npm run typecheck
npm run build
npm run mcp
```

On PowerShell use `Copy-Item .env.example .env`. Do not overwrite an existing
private environment file. The example sets `MCP_PORT=3001` and
`MCP_TENANT_ID=tenant-a`; the required base variables are `MONGO_URI` and
`DB_NAME`. `PORT` controls the separate REST API.

Tenant A and B use `ambiten_tutorial_tenant_a` and
`ambiten_tutorial_tenant_b`, independently of the base `DB_NAME`.
These names match the earlier checkpoints: use a dedicated MongoDB instance
if you want separate tutorial data. The two MCP tools need only standalone
MongoDB; inherited transactions require a replica set or sharded deployment.

## Connect

The server binds only to `http://127.0.0.1:3001/mcp`.
Check `http://127.0.0.1:3001/health` for process liveness or `/ready` for
runtime/base-database readiness. The latter does not validate every lazy tenant.

In a second terminal:

```bash
npx @modelcontextprotocol/inspector
```

Choose Streamable HTTP, connect to the MCP URL, and discover:

- `workspace_list_users`: input `{}`, returns active users.
- `workspace_create_user`: input `{"name":"Agent Created User","email":"AGENT@EXAMPLE.COM"}`.

Creation uses the existing email normalization policy. Both tools return
structured JSON plus readable text. Identifiers and dates are serialized.
Calling create repeatedly may create duplicates; there is no idempotency key.

The server owns tenant selection. Tool schemas reject extra properties;
MCP rejects tenant/database/collection routing headers. Missing or unknown
tenant configuration fails startup. Restart after changing configuration.

## Other entry points

```bash
npm run dev
npm run worker
```

Run these in separate terminals as needed. For compiled entry points:

```bash
npm start
npm run worker:start
npm run mcp:start
```

Keep the supplied `--import tsx` loader and development dependencies: the pinned
Ambiten packages have published extensionless ESM imports. The inherited
TypeScript Bundler resolution and Express type mapping are also intentional.

On SIGINT/SIGTERM the MCP process stops readiness, drains HTTP requests, closes
the protocol handler, then closes tenant and base clients. Repeated shutdown
requests share one promise. HTTP draining is bounded to ten seconds; a production
supervisor still needs a hard deadline for uncooperative application work.

## Verification

With `mongod` on PATH, or `MONGOD_BINARY` set to its absolute path:

```bash
npm run test:mcp
npm run test:smoke
```

`test:mcp` builds and tests source/compiled servers with the official SDK client.
It checks discovery, input validation, tenant isolation, lifecycle policy,
serialization, concurrent execution IDs, instrumentation, safe errors,
host/origin protection, configuration failures, and graceful request draining.

`test:smoke` also runs inherited API/worker/runtime and transaction checks.
Tests launch dedicated temporary loopback MongoDB processes, never read your
`.env`, and remove only their own temporary database directories. Windows signal
checks emit registered process signals inside isolated child processes.

## Security and scope

This is an unauthenticated local teaching server, not a public deployment.
Anyone able to reach it can invoke its write tool. Loopback binding, SDK
Host/Origin protections, and tool annotations are not authentication or
authorization. Do not expose it through a tunnel or public reverse proxy.

Before remote use, verify caller identity, authorize capability and tenant,
derive tenant context on the server, and add TLS, rate limits, bounded reads,
idempotency, audit/redaction policy, and suitable write approval UX.

Only two tools are implemented. A future transactional tool can reuse
`createUserWithAudit`; resources and prompts are discussed in the tutorial but
not registered here. No direct database query or arbitrary-code tool is exposed.
