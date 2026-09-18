import express, { type ErrorRequestHandler } from "express";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { MultiTenantManager } from "@ambiten/core";
import { client } from "./core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "./core/tenancy.js";
import { configureUserLifecycle } from "./policies/user-lifecycle.js";
import { instrumentationRouter } from "./routes/instrumentation.routes.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { usersRouter } from "./routes/users.routes.js";

const port = Number(process.env.PORT ?? 3000);

async function closeInfrastructure() {
  try {
    await closeTutorialTenants();
  } finally {
    await client.close();
  }
}

async function main() {
  registerTutorialTenants();
  await client.connect();
  configureUserLifecycle();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Process health is available before the tenant-aware boundary.
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

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
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  };
  app.use(handleError);

  const server = app.listen(port, () => {
    console.log(`Ambiten API running on http://localhost:${port}`);
  });

  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(() => {
      void closeInfrastructure().catch(error => {
        console.error("Shutdown failed:", error);
        process.exitCode = 1;
      });
    });
  }

  server.on("error", error => {
    console.error("HTTP server failed:", error);
    process.exitCode = 1;
    void closeInfrastructure().catch(console.error);
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(async error => {
  console.error("Application failed:", error);
  process.exitCode = 1;
  await closeInfrastructure().catch(console.error);
});
