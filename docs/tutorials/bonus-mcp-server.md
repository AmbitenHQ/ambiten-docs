# Bonus — Build an Agent-Ready MCP Server with Ambiten

AI applications need controlled access to real application capabilities: data, workflows, transactions, tenant-aware services, and operational state.

Model Context Protocol (MCP) gives AI hosts a standard way to discover and invoke those capabilities. Ambiten sits behind that protocol boundary as the application runtime.

In this tutorial, you will expose the Workspace application through MCP without creating a second persistence architecture or giving an AI model direct MongoDB access.

This is an optional bonus after [Tutorial 12 — Production Runtime](/tutorials/12-production-runtime), outside the numbered 12-part core path.

## What you will build

The new entry point serves two tools over Streamable HTTP at `http://127.0.0.1:3001/mcp`:

| Tool | Input | Application capability |
| --- | --- | --- |
| `workspace_list_users` | An empty object | Read active users in the server's configured tenant |
| `workspace_create_user` | `name` and `email` | Create a user through the existing model lifecycle |

Both tools use the same `UserModel`, tenant infrastructure, lifecycle policy, and query observer as the API and worker.

```text
AI host
  ↓ MCP tool call
Ambiten MCP server
  ↓ runMcpExecution()
AmbitenContext: server-owned tenant + fresh request ID
  ↓ application capability
AmbitenModel
  ↓ effective ModelContext
Lifecycle policy / transaction session when present / instrumentation
  ↓ tenant infrastructure
MongoDB
```

MCP defines how an agent reaches a capability. Ambiten defines how that capability executes once it enters the application.

## Why Streamable HTTP?

The application already logs runtime events and query signals to stdout. A stdio transport reserves stdout for protocol messages, so those logs would need to move to stderr. Streamable HTTP keeps the protocol on an HTTP endpoint and preserves the existing logging setup. See the [MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

The endpoint is deliberately bound to **127.0.0.1**, not every network interface. This tutorial does not implement authentication, authorization, remote access, or an AI model client. Inspector will act as our MCP client.

::: warning Local teaching server, not a public endpoint
Anyone able to reach this local endpoint can invoke its tools, including creating users. Loopback binding and host/origin checks are useful protections, not user authentication. Do not expose this example through a public tunnel or reverse proxy without adding authentication and tenant authorization.
:::

## 1. Start from the complete checkpoint

The runnable project is in:

```text
examples/ambiten-tutorial/bonus-mcp-server/
```

It is an independent copy of Tutorial 12's application source and configuration, with the MCP additions below. It includes the API, worker, models, services, lifecycle policies, instrumentation, runtime bootstrap, TypeScript configuration, package manifest, lockfile, and tests.

```text
bonus-mcp-server/
├── src/
│   ├── config/env.ts
│   ├── core/
│   │   ├── db.ts
│   │   └── tenancy.ts
│   ├── instrumentation/query-observer.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   └── audit-log.model.ts
│   ├── policies/user-lifecycle.ts
│   ├── routes/
│   ├── runtime/runtime.ts
│   ├── services/user.service.ts
│   ├── utils/execution.ts
│   ├── mcp/
│   │   ├── config.ts
│   │   ├── execution.ts
│   │   └── server.ts
│   ├── index.ts
│   ├── worker.ts
│   └── mcp.ts
├── scripts/
│   ├── smoke.mjs
│   ├── runtime-checks.mjs
│   ├── mcp-smoke.mjs
│   └── mcp-checks.mjs
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

If you are building the changes yourself from Tutorial 12, copy only its source, scripts, and project configuration into a fresh bonus directory. Do not copy private `.env` files, `node_modules`, or generated `dist` files. The checked-in bonus already contains all the additions in this page.

Use Node.js **22.13 or later** and a running MongoDB server. The two MCP tools work with standalone MongoDB. The inherited transactional API route still requires a replica set or sharded deployment.

From the repository root:

```bash
cd examples/ambiten-tutorial/bonus-mcp-server
npm ci
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` for the last command. Preserve an existing `.env` rather than replacing your settings.

With pnpm, use `pnpm install` and `pnpm mcp`; the supplied reproducible lockfile is for npm.

## 2. Add the MCP packages and scripts

This checkpoint uses the published MCP TypeScript SDK v2 packages. The server package provides `McpServer` and the HTTP handler; the Express and Node packages provide the integration. See the [official Express integration guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/express.md).

When extending a fresh Tutorial 12 copy, add:

```bash
npm install @modelcontextprotocol/server@^2.0.0 @modelcontextprotocol/express@^2.0.0 @modelcontextprotocol/node@^2.0.0 zod@^4
npm install --save-dev @modelcontextprotocol/client@^2.0.0
```

The client dependency is used only by the integration tests. A host such as Inspector connects to the server independently.

The complete `package.json` is:

```json
{
  "name": "ambiten-tutorial-bonus-mcp-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "dev": "tsx --env-file=.env src/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "start": "node --import tsx --env-file=.env dist/index.js",
    "test:smoke": "npm run build && node scripts/smoke.mjs && node scripts/mcp-smoke.mjs",
    "worker": "tsx --env-file=.env src/worker.ts",
    "worker:start": "node --import tsx --env-file=.env dist/worker.js",
    "mcp": "tsx --env-file=.env src/mcp.ts",
    "mcp:start": "node --import tsx --env-file=.env dist/mcp.js",
    "test:mcp": "npm run build && node scripts/mcp-smoke.mjs"
  },
  "dependencies": {
    "@ambiten/adapter-express": "1.0.2",
    "@ambiten/core": "1.2.4",
    "express": "^5.1.0",
    "mongodb": "^6.21.0",
    "@modelcontextprotocol/server": "^2.0.0",
    "@modelcontextprotocol/express": "^2.0.0",
    "@modelcontextprotocol/node": "^2.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/express-serve-static-core": "^5.1.1",
    "@types/node": "^22.0.0",
    "dotenv": "^16.4.7",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0",
    "@modelcontextprotocol/client": "^2.0.0"
  }
}
```

The existing REST and worker scripts stay available. `mcp` runs TypeScript directly; `mcp:start` runs the built JavaScript.

Keep `--import tsx` on the compiled entry points in this checkpoint. The pinned Ambiten packages still need that loader for their published extensionless ESM imports. The inherited `Bundler` module resolution and Express type mapping in `tsconfig.json` are intentional compatibility settings. Do not omit development dependencies when running this particular teaching checkpoint.

## 3. Configure a server-owned tenant

The complete `.env.example` is:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ambiten_tutorial
PORT=3000
MCP_PORT=3001
MCP_TENANT_ID=tenant-a
```

`DB_NAME` selects the base runtime database. The demo registry in `src/core/tenancy.ts` independently maps `tenant-a` to `ambiten_tutorial_tenant_a` and `tenant-b` to `ambiten_tutorial_tenant_b`.

`MCP_TENANT_ID` is the tenant assigned by the operator to this local server. It is not a tool argument, request header, or model decision. To switch tenants, change the configuration and restart the server.

Create `src/mcp/config.ts`:

```ts
function readMcpConfig() {
  const tenantId = process.env.MCP_TENANT_ID?.trim();
  if (!tenantId) throw new Error("MCP_TENANT_ID is required.");

  const rawPort = process.env.MCP_PORT ?? "3001";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid MCP_PORT: ${rawPort}. Expected an integer from 1 to 65535.`);
  }
  return Object.freeze({ tenantId, port });
}

// Only the MCP entry point imports this configuration. REST and workers do not
// require MCP variables. Changes take effect on restart, never from tool input.
export const mcpConfig = readMcpConfig();
```

The configuration is read once and frozen. Missing tenant configuration and invalid ports fail before listening. Startup also rejects tenants absent from the application registry. REST and worker entry points do not import this module, so adding MCP does not make their startup depend on MCP variables.

We deliberately do not expose `tenantId: z.string()` as a tool input. Accepting a tenant name from a model would not prove that the caller is authorized to use it.

## 4. Establish an MCP execution boundary

Create `src/mcp/execution.ts`:

```ts
import { randomUUID } from "node:crypto";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { withQueryObservation } from "../instrumentation/query-observer.js";
import { mcpConfig } from "./config.js";

export class McpExecutionError extends Error {
  constructor(requestId: string, cause: unknown) {
    super(`Tool execution failed. Reference: ${requestId}`, { cause });
    this.name = "McpExecutionError";
  }
}

export async function runMcpExecution<R>(
  toolName: string,
  operation: () => Promise<R>
): Promise<{ result: R; tenantId: string; requestId: string }> {
  const tenantId = mcpConfig.tenantId;
  const requestId = `mcp-${randomUUID()}`;
  try {
    // Core 1.2.4 merges parent context. Never inherit an HTTP session, observer,
    // database override, or another tenant when creating a new tool execution.
    if (AmbitenContext.hasActiveContext()) {
      throw new Error("MCP tools must start outside an existing execution context.");
    }
    const tenant = await MultiTenantManager.resolveTenant(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" could not be resolved.`);

    return await AmbitenContext.run({ tenantId, requestId }, async () => {
      const observed = await withQueryObservation(operation);
      console.log("[mcp execution]", {
        tool: toolName, tenantId, requestId, signals: observed.signals.length
      });
      return { result: observed.result, tenantId, requestId };
    });
  } catch (error) {
    // Keep database details on the server; the caller receives a correlation ID.
    console.error("[mcp execution failed]", { tool: toolName, tenantId, requestId }, error);
    throw new McpExecutionError(requestId, error);
  }
}
```

Each tool call receives a fresh `mcp-` request ID and the configured tenant. It resolves the existing tenant registration, then runs the application operation inside `AmbitenContext.run(...)`.

That scope survives asynchronous work just as it does in the [background worker](/tutorials/11-background-worker). Once the callback completes, its context is no longer the ambient execution.

The parent-context guard matters: the pinned Core version merges parent execution state. A new MCP invocation must not accidentally inherit a transaction session, database override, observer, or tenant from unrelated work. This is a boundary helper, not a helper for nesting one tool execution inside another.

`withQueryObservation` is unchanged from the earlier tutorials. Its execution-local observer records the operation, collection, tenant, and request ID. It also waits for Core 1.2.4's deferred observer callbacks before returning, so the logged signal count is populated.

On failure, the server logs the original error with the execution metadata. The client receives a safe error message and correlation ID, not a database exception or stack trace. Production logging still needs its own redaction and retention policy.

## 5. Register two application tools

Create `src/mcp/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { AmbitenContext } from "@ambiten/core";
import { UserModel, type User } from "../models/user.model.js";
import { McpExecutionError, runMcpExecution } from "./execution.js";

const userOutputSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().optional()
});

function serializeUser(user: User & { _id?: unknown }) {
  return {
    _id: user._id === undefined ? undefined : String(user._id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined
  };
}

function toolFailure(error: unknown) {
  if (!(error instanceof McpExecutionError)) console.error("[mcp tool failed]", error);
  return {
    isError: true,
    content: [{
      type: "text" as const,
      text: error instanceof McpExecutionError ? error.message : "Tool execution failed."
    }]
  };
}

export function createAmbitenMcpServer() {
  const server = new McpServer({ name: "ambiten-workspace", version: "1.0.0" });

  server.registerTool("workspace_list_users", {
    title: "List Workspace Users",
    description: "List active users for the workspace tenant assigned to this MCP server.",
    inputSchema: z.object({}).strict(),
    outputSchema: z.object({
      tenantId: z.string(),
      count: z.number().int().nonnegative(),
      users: z.array(userOutputSchema)
    }),
    annotations: {
      readOnlyHint: true, destructiveHint: false,
      idempotentHint: true, openWorldHint: false
    }
  }, async () => {
    try {
      const execution = await runMcpExecution("workspace_list_users", async () => {
        const users = await UserModel.find({});
        return {
          tenantId: AmbitenContext.get().tenantId!,
          count: users.length,
          users: users.map(serializeUser)
        };
      });
      const output = execution.result;
      return {
        content: [{ type: "text", text: `Found ${output.count} active workspace users.` }],
        structuredContent: output
      };
    } catch (error) {
      return toolFailure(error);
    }
  });

  server.registerTool("workspace_create_user", {
    title: "Create Workspace User",
    description: "Create a user inside the workspace tenant assigned to this MCP server.",
    inputSchema: z.object({
      name: z.string().trim().min(1),
      email: z.string().trim().email()
    }).strict(),
    outputSchema: z.object({
      tenantId: z.string(),
      user: userOutputSchema
    }),
    annotations: {
      readOnlyHint: false, destructiveHint: false,
      idempotentHint: false, openWorldHint: false
    }
  }, async ({ name, email }) => {
    try {
      const execution = await runMcpExecution("workspace_create_user", async () => {
        const user = await UserModel.create({ name, email, createdAt: new Date() });
        return {
          tenantId: AmbitenContext.get().tenantId!,
          user: serializeUser(user)
        };
      });
      const output = execution.result;
      return {
        content: [{ type: "text", text: `Created workspace user ${output.user.email}.` }],
        structuredContent: output
      };
    } catch (error) {
      return toolFailure(error);
    }
  });

  return server;
}
```

The SDK uses each tool's schema to describe its input and validate calls. Strict object schemas reject undeclared fields, including a caller-supplied tenant. Empty or whitespace-only names and invalid email values never reach the model. See [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) for the tool contract.

The create handler does not lowercase email itself. It calls the existing `UserModel.create(...)`, and the shared lifecycle policy normalizes email and supplies the persistence defaults. Listing calls `UserModel.find({})`, so the shared policy excludes soft-deleted records.

The output serializer converts MongoDB identifiers to strings and dates to ISO strings. Only the declared public user fields are returned; soft-delete bookkeeping is not exposed. Both human-readable `content` and machine-readable `structuredContent` are provided.

Tool annotations tell a host what to expect. Listing is read-only and idempotent; creation writes data and is not idempotent. These annotations are advisory metadata, not authorization rules or an approval mechanism.

::: tip Repeated creation
There is no unique-email index or idempotency key in this tutorial. Calling the create tool twice can create two records. A production write tool needs an explicit retry and duplicate-handling policy.
:::

## 6. Serve MCP over HTTP

Create `src/mcp.ts`:

```ts
import { pathToFileURL } from "node:url";
import type { ErrorRequestHandler } from "express";
import { MultiTenantManager } from "@ambiten/core";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { mcpConfig } from "./mcp/config.js";
import { createAmbitenMcpServer } from "./mcp/server.js";
import {
  beginRuntimeShutdown, checkRuntimeReadiness, getRuntimeStatus,
  initializeRuntime, shutdownRuntime
} from "./runtime/runtime.js";

export async function startMcp() {
  try {
    await initializeRuntime();
    if (!MultiTenantManager.hasTenant(mcpConfig.tenantId)) {
      throw new Error(`Unknown MCP_TENANT_ID: ${mcpConfig.tenantId}`);
    }
  } catch (error) {
    await shutdownRuntime();
    throw error;
  }

  // This is intentionally a local, unauthenticated demonstration.
  const app = createMcpExpressApp({ host: "127.0.0.1" });
  const handler = createMcpHandler(() => createAmbitenMcpServer());
  const nodeHandler = toNodeHandler(handler);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "ambiten-mcp" });
  });
  app.get("/ready", async (_req, res) => {
    const ready = await checkRuntimeReadiness();
    res.status(ready ? 200 : 503).json({ ready, runtime: getRuntimeStatus() });
  });
  app.all("/mcp", (req, res, next) => {
    if (getRuntimeStatus().shuttingDown) {
      res.status(503).json({ error: "Runtime is shutting down." });
      return;
    }
    if (["x-tenant-id", "x-db-name", "x-collection-name"].some(name => req.headers[name] !== undefined)) {
      res.status(400).json({ error: "MCP tenant and database routing are server-controlled." });
      return;
    }
    // The SDK app already parsed JSON; do not re-read the consumed request body.
    void nodeHandler(req, res, req.body).catch(next);
  });
  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    console.error("[mcp HTTP error]", error);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    else res.end();
  };
  app.use(handleError);

  const server = app.listen(mcpConfig.port, "127.0.0.1");
  let closing: Promise<void> | null = null;
  const reportShutdownFailure = (error: unknown) => {
    console.error("MCP shutdown failed:", error);
    process.exitCode = 1;
  };
  const onInterrupt = () => { void shutdown("SIGINT").catch(reportShutdownFailure); };
  const onTerminate = () => { void shutdown("SIGTERM").catch(reportShutdownFailure); };

  function shutdown(reason: string): Promise<void> {
    if (closing) return closing;
    beginRuntimeShutdown();
    console.log(`Received ${reason}. Shutting down MCP server...`);
    closing = (async () => {
      const drainTimer = setTimeout(() => {
        console.error("MCP drain deadline exceeded; closing remaining connections.");
        process.exitCode = 1;
        server.closeAllConnections();
      }, 10_000);
      drainTimer.unref();
      try {
        try {
          await new Promise<void>((resolve, reject) => {
            server.close(error => {
              if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") reject(error);
              else resolve();
            });
          });
        } finally {
          try {
            // Close transport instances only after ordinary HTTP requests drain.
            await handler.close();
          } finally {
            await shutdownRuntime();
          }
        }
        console.log("MCP shutdown complete.");
      } finally {
        clearTimeout(drainTimer);
        process.removeListener("SIGINT", onInterrupt);
        process.removeListener("SIGTERM", onTerminate);
      }
    })();
    return closing;
  }

  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  server.on("error", error => {
    console.error("MCP HTTP server failed:", error);
    process.exitCode = 1;
    void shutdown("HTTP server error").catch(reportShutdownFailure);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
  } catch (error) {
    await shutdown("startup failure");
    throw error;
  }
  console.log(`Ambiten MCP server running at http://127.0.0.1:${mcpConfig.port}/mcp`);
  return { app, server, shutdown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startMcp().catch(async error => {
    console.error("MCP server failed:", error);
    process.exitCode = 1;
    try { await shutdownRuntime(); }
    catch (cleanupError) { console.error("Runtime cleanup failed:", cleanupError); }
  });
}
```

`createMcpHandler` creates the protocol handler from a server factory. `toNodeHandler` bridges it to Node's request and response objects. Passing `req.body` is important because the Express app has already consumed and parsed the JSON body. The SDK factory creates lightweight per-request server instances; the Ambiten runtime and database clients remain process-scoped. See the [SDK HTTP serving guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md).

The MCP entry point does **not** install the Ambiten Express tenant adapter. That adapter belongs to the REST ingress. Here, tool execution establishes its own scope, and tenant/database/collection override headers are rejected.

The app factory enables localhost host/origin protection. The explicit listen address keeps the socket loopback-only. Neither verifies a caller's identity.

The runtime lifecycle remains recognizable from Tutorial 12:

1. Initialize reusable infrastructure and lifecycle policy once.
2. Validate the configured tenant before accepting traffic.
3. Create a new execution for each tool invocation.
4. On shutdown, stop readiness and drain ordinary HTTP requests.
5. Close the MCP handler, then close tenant and base database clients.

Repeated shutdown requests share one promise. A ten-second HTTP drain deadline closes remaining connections; a production supervisor must still enforce a hard process deadline because cancelling a transport does not guarantee that arbitrary application work stops.

`GET /health` is a process liveness endpoint. `GET /ready` also checks runtime state and a base-database ping; it does not certify every lazy tenant database.

## 7. Run the server

Check and build the checkpoint:

```bash
npm run typecheck
npm run build
npm run mcp
```

Expected startup message:

```text
Ambiten MCP server running at http://127.0.0.1:3001/mcp
```

For the compiled version, stop the development server first and run:

```bash
npm run mcp:start
```

Check liveness:

```bash
curl http://127.0.0.1:3001/health
```

PowerShell users can use `curl.exe` or `Invoke-RestMethod http://127.0.0.1:3001/health`.

Expected response:

```json
{
  "status": "ok",
  "service": "ambiten-mcp"
}
```

You can also request `http://127.0.0.1:3001/ready`.

Do not expect opening `/mcp` in a browser to show a page or return a REST users collection. It is a protocol endpoint. Use an MCP client to initialize, discover tools, and invoke them.

## 8. Test with MCP Inspector

In a second terminal, launch the [official MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector
```

Use the local URL and any proxy token printed by Inspector. Keep the Inspector UI and its proxy on your own machine.

Choose **Streamable HTTP**, enter `http://127.0.0.1:3001/mcp`, and connect. In the tools view, request the tool list. It should contain exactly:

```text
workspace_list_users
workspace_create_user
```

### List existing users

Call `workspace_list_users` with:

```json
{}
```

On a fresh tenant database, its structured result is:

```json
{
  "tenantId": "tenant-a",
  "count": 0,
  "users": []
}
```

If you have used earlier checkpoints against the same MongoDB instance, existing active users appear instead. These tutorial checkpoints intentionally use the same demo database names; they are not separate data sandboxes.

### Create a user

Call `workspace_create_user` with:

```json
{
  "name": "Agent Created User",
  "email": "AGENT@EXAMPLE.COM"
}
```

The text result says `Created workspace user agent@example.com.` The structured result includes `tenantId` and a user with an identifier, name, normalized email, and creation timestamp.

Call the list tool again. The new user appears in the configured tenant, without bypassing the application's persistence policy.

### Observe the runtime

The server terminal includes a query signal and execution summary, for example:

```text
[ambiten query] {
  status: 'success',
  requestId: 'mcp-<generated UUID>',
  tenantId: 'tenant-a',
  operation: 'find',
  collectionName: 'users'
}
[mcp execution] {
  tool: 'workspace_list_users',
  tenantId: 'tenant-a',
  requestId: 'mcp-<same UUID>',
  signals: 1
}
```

The request ID is generated by the server for that invocation, not accepted from a client header. A subsequent invocation gets a different ID.

### Try invalid inputs

A create call with a blank name or invalid email returns a tool error and creates no user. Adding `tenantId` to either tool's input is also rejected. The server does not treat a model-selected tenant as authorization.

SDK input errors and application execution failures are different: invalid arguments fail validation before the operation; a database or lifecycle failure is reported with `isError: true` and a server-generated reference.

## 9. See the same application through three entry points

The REST API and worker remain runnable:

```bash
npm run dev
npm run worker
```

Run them in separate terminals as needed. Their compiled equivalents are `npm start` and `npm run worker:start`. The API defaults to port 3000, while MCP defaults to 3001.

| Entry point | Execution boundary | Tenant source | Persistence path |
| --- | --- | --- | --- |
| REST API | Express Ambiten adapter | Demo `x-tenant-id` header | Existing models and services |
| Worker | `AmbitenContext.run(...)` | Application-created job | Existing models and services |
| MCP tool | `runMcpExecution(...)` | Server configuration | Existing models and services |

Each process owns its own runtime and connection pools; “same runtime” means the same application runtime code and policies, not one in-memory context shared across processes.

For example, after creating the MCP user for tenant A, list it through the REST API:

```bash
curl http://127.0.0.1:3000/users -H "x-tenant-id: tenant-a"
```

The demo REST tenant header is not authentication either. It is retained to illustrate the earlier tutorial's ingress; it is intentionally not accepted by the MCP entry point.

The important convergence is:

```text
REST request ── adapter ─────────────┐
Worker job ──── explicit context ────┼── application models/services
MCP tool ────── explicit context ────┘             ↓
                                  lifecycle / transaction participation
                                                  ↓
                                  instrumentation / tenant infrastructure
                                                  ↓
                                               MongoDB
```

An agent interface is another way into the application, not a second data-access system.

## 10. Verify the checkpoint automatically

With a local `mongod` executable available, run:

```bash
npm run test:mcp
```

If it is not on your PATH, set `MONGOD_BINARY` to its absolute path. For example, in PowerShell with MongoDB 8 installed:

```powershell
$env:MONGOD_BINARY = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
npm run test:mcp
```

The suite builds the project, starts its own loopback MongoDB process in a temporary directory, and exercises source and compiled MCP entry points with the official SDK client. It does not read your `.env` or use your existing databases.

It checks tool discovery, structured output, identifier/date serialization, email normalization, soft-delete filtering, invalid arguments, rejected tenant overrides, tenant isolation, unique concurrent execution IDs, observer signals, localhost host/origin checks, configuration failures, and bind-failure cleanup.

Additional isolated probes check context restoration, inherited-context rejection, safe application errors, and draining an active MCP request before database cleanup on both signal paths. On Windows, the probes emit the registered process signal within the child process while a real HTTP tool request is active.

To run both the inherited API/worker/runtime checks and the MCP checks:

```bash
npm run test:smoke
```

The inherited suite creates its own temporary replica set to verify transaction commit and rollback. Each suite removes only its own temporary database directory when finished.

## Tenant security: before making this remote

For this local tutorial, a trusted operator chooses `MCP_TENANT_ID`. A real remote service needs a different identity boundary:

```text
MCP client
  ↓ authentication
Verified principal
  ↓ authorization for this capability and tenant
Server-side tenant resolution
  ↓ AmbitenContext
Tool execution
```

Authentication answers who is calling. Tenant resolution determines which tenant the execution is for. Authorization determines whether the caller may perform that operation for that tenant. MCP does not collapse those responsibilities.

The SDK's Express integration has bearer-auth helpers, but token verification, trusted principal-to-tenant mapping, and application permissions must be implemented before exposing a remote service. See the [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

Also plan for TLS, secret management, rate limits, paginated reads, bounded query/output sizes, write approval UX, idempotency, and audit retention. Treat names and other stored fields as untrusted application data, not instructions to an agent. The two tools here do not execute supplied code or expose arbitrary MongoDB queries.

## Where transactions fit

Neither of these two tools opens a transaction: each demonstrates a single model capability.

A future `workspace_create_user_with_audit` tool could enter the same execution boundary and invoke the existing service from [Transaction Continuity](/tutorials/08-transaction-continuity):

```ts
const execution = await runMcpExecution(
  "workspace_create_user_with_audit",
  () => createUserWithAudit({ name, email })
);
```

That is an architectural sketch, not a third registered tool in this checkpoint. The service already owns its transaction boundary and propagates the MongoDB session to participating user and audit operations. A tool handler does not need to invent transaction propagation.

The inherited service also preserves its Core 1.2.4 collection-context compatibility fix. External APIs, email, files, and queue publishing would still need their own consistency strategy; a MongoDB transaction does not make those side effects atomic.

## Where resources and prompts fit

Future MCP resources might expose readable application context at `workspace://users`, `workspace://runtime`, or `workspace://projects`. A prompt could provide a reusable interaction workflow.

Keep the distinction clear:

- A tool asks the application to perform work.
- A resource exposes readable context.
- A prompt provides a reusable prompting workflow.

This bonus implements only the two tools. Resources and prompts would need the same tenant and permission boundaries, not privileged shortcuts around them.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `MCP_TENANT_ID is required` | Copy the example environment file, set the tenant, and use the supplied run script |
| `Unknown MCP_TENANT_ID` | Choose a registered tenant; the demo registry has `tenant-a` and `tenant-b` |
| `Invalid MCP_PORT` | Use an integer from 1 to 65535 |
| `EADDRINUSE` | Stop the other server or change `MCP_PORT` and the client URL |
| Connection refused | Start MongoDB and the MCP process, then check `/health` |
| HTTP 403 | Check the client Host/Origin; use the local Inspector, not a remote browser page |
| HTTP 400 with routing headers | Remove `x-tenant-id`, `x-db-name`, and `x-collection-name` |
| No users listed | Check the configured tenant, database instance, and soft-delete status |
| Tool error with a reference | Find the matching `mcp-` request ID in the server logs |
| Compiled entry-point import error | Use `npm run mcp:start`, which retains the required loader |

## What you built

You added an agent-facing protocol boundary while preserving the application's execution model.

The AI host discovers a small set of capabilities. The server establishes tenant scope. Ambiten carries that scope through models, lifecycle policies, instrumentation, and tenant infrastructure. Transactional services remain available behind the same boundary when a capability needs them.

Return to the [tutorial catalog](/tutorials/), revisit [Production Runtime](/tutorials/12-production-runtime), or explore the separate [framework tracks](/tutorials/frameworks/). The [Document-to-PDF SaaS tutorial](/tutorials/pdf-saas) remains its own learning path.
