import express, {
  type NextFunction,
  type Request,
  type Response
} from "express";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { MultiTenantManager } from "@ambiten/core";
import { client } from "./core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "./core/tenancy.js";
import { configureUserLifecycle } from "./policies/user-lifecycle.js";
import { usersRouter } from "./routes/users.routes.js";

const port = Number(process.env.PORT ?? 3000);
async function main() {
  registerTutorialTenants();
  await client.connect();

  configureUserLifecycle();

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  await createExpressAdapter().install(app, {
    tenancy: {
      header: "x-tenant-id",
      validate: async tenantId =>
        MultiTenantManager.hasTenant(tenantId)
    }
  });

  app.use("/users", usersRouter);
  
  app.use((
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => res.status(500).json({
      error: error instanceof Error
        ? error.message
        : "Unknown error"
    })
  );

  const server = app.listen(port, () =>
    console.log(`Ambiten API running on http://localhost:${port}`)
  );

  const shutdown = () => server.close(
    async () => {
      await closeTutorialTenants();
      await client.close();
      process.exit(0);
    });

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(
  async error => {
    console.error(error);
    await closeTutorialTenants();
    await client.close();
    process.exitCode = 1;
  });
