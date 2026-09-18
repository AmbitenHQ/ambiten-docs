import { pathToFileURL } from "node:url";
import express, { type ErrorRequestHandler } from "express";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { MultiTenantManager } from "@ambiten/core";
import { env } from "./config/env.js";
import { instrumentationRouter } from "./routes/instrumentation.routes.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import {
  beginRuntimeShutdown,
  checkRuntimeReadiness,
  getRuntimeStatus,
  initializeRuntime,
  shutdownRuntime
} from "./runtime/runtime.js";

export async function startApi() {
  await initializeRuntime();
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Process probes deliberately sit outside the tenant boundary.
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", async (_req, res) => {
    const ready = await checkRuntimeReadiness();
    return res.status(ready ? 200 : 503).json({
      ready,
      runtime: getRuntimeStatus()
    });
  });

  app.use((req, res, next) => {
    if (getRuntimeStatus().shuttingDown) {
      return res.status(503).json({ error: "Runtime is shutting down." });
    }
    // Identity comes from the demo tenant header; topology is server-owned.
    if (req.headers["x-db-name"] !== undefined || req.headers["x-collection-name"] !== undefined) {
      return res.status(400).json({ error: "Database and collection routing is server-controlled." });
    }
    next();
  });

  const adapter = createExpressAdapter();
  await adapter.install(app, {
    tenancy: {
      header: "x-tenant-id",
      validate: async tenantId => MultiTenantManager.hasTenant(tenantId)
    }
  });
  app.use("/instrumentation", instrumentationRouter);
  app.use("/tenant", tenantRouter);
  app.use("/users", usersRouter);

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(handleError);

  const server = app.listen(env.port);
  let closing: Promise<void> | null = null;
  const reportShutdownFailure = (error: unknown) => {
    console.error("Shutdown failed:", error);
    process.exitCode = 1;
  };
  const onInterrupt = () => { void shutdown("SIGINT").catch(reportShutdownFailure); };
  const onTerminate = () => { void shutdown("SIGTERM").catch(reportShutdownFailure); };

  function shutdown(reason: string): Promise<void> {
    if (closing) return closing;
    beginRuntimeShutdown();
    console.log(`Received ${reason}. Shutting down...`);

    closing = (async () => {
      // Bound HTTP draining. An orchestrator still owns the process hard deadline.
      const drainTimer = setTimeout(() => {
        console.error("HTTP drain deadline exceeded; closing remaining connections.");
        process.exitCode = 1;
        server.closeAllConnections();
      }, 10_000);
      drainTimer.unref();

      try {
        try {
          await new Promise<void>((resolve, reject) => {
            server.close(error => {
              if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") {
                reject(error);
              } else {
                resolve();
              }
            });
          });
        } finally {
          await shutdownRuntime();
        }
        console.log("Shutdown complete.");
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
    console.error("HTTP server failed:", error);
    process.exitCode = 1;
    void shutdown("HTTP server error").catch(reportShutdownFailure);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  console.log(`Ambiten API running on http://localhost:${env.port}`);
  return { app, server, shutdown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startApi().catch(async error => {
    console.error("Application failed:", error);
    process.exitCode = 1;
    try {
      await shutdownRuntime();
    } catch (shutdownError) {
      console.error("Runtime cleanup failed:", shutdownError);
    }
  });
}
