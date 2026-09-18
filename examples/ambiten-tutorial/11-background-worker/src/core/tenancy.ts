import { MultiTenantManager } from "@ambiten/core";

const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017";

export function registerTutorialTenants() {
  if (!MultiTenantManager.hasTenant("tenant-a"))
    MultiTenantManager.registerLazyTenant(
      "tenant-a",
      uri,
      {
        dbName: "ambiten_tutorial_tenant_a"
      });
  if (!MultiTenantManager.hasTenant("tenant-b"))
    MultiTenantManager.registerLazyTenant(
      "tenant-b",
      uri,
      {
        dbName: "ambiten_tutorial_tenant_b"
      });
}

export async function closeTutorialTenants() {
  await Promise.all(
    MultiTenantManager.getAllTenants().map(
      async tenant => tenant.client?.close())
  );
  MultiTenantManager.clearTenants();
}
