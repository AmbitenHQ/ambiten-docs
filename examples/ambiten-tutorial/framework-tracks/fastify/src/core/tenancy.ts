import { MultiTenantManager } from "@ambiten/core";

export function registerDemoTenants(): void {
  // Registration is lazy: this checkpoint never opens a database connection.
  MultiTenantManager.registerLazyTenant("tenant-a", "mongodb://127.0.0.1:27017", {
    dbName: "ambiten_fastify_tenant_a"
  });
  MultiTenantManager.registerLazyTenant("tenant-b", "mongodb://127.0.0.1:27017", {
    dbName: "ambiten_fastify_tenant_b"
  });
}
