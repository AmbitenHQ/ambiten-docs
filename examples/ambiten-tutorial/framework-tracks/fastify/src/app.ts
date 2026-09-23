import Fastify from "fastify";
import { createFastifyAdapter } from "@ambiten/adapter-fastify";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { registerDemoTenants } from "./core/tenancy";

export function buildApp(logger = false) {
  registerDemoTenants();
  const app = Fastify({ logger });

  // This root route is outside the tenant-protected child plugin.
  app.get("/health", async () => ({ status: "ok" }));

  app.register(async api => {
    const adapter = createFastifyAdapter();
    await adapter.install(api, {
      tenancy: {
        header: "x-tenant-id",
        validate: async tenantId => {
          const tenant = await MultiTenantManager.resolveTenant(tenantId);
          if (!tenant) {
            throw new Error(`Tenant with ID "${tenantId}" not found.`);
          }
          return true;
        }
      }
    });

    api.get("/context", async () => {
      await new Promise<void>(resolve => setImmediate(resolve));
      const ctx = AmbitenContext.get();
      return {
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
        dbName: ctx.dbName
      };
    });
  });

  return app;
}
