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
