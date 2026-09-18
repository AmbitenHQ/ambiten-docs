import { MultiTenantManager } from "@ambiten/core";
import { env } from "../config/env.js";

export function registerTutorialTenants() {
  for (const [tenantId, dbName] of [
    ["tenant-a", "ambiten_tutorial_tenant_a"],
    ["tenant-b", "ambiten_tutorial_tenant_b"]
  ]) {
    if (!MultiTenantManager.hasTenant(tenantId)) {
      MultiTenantManager.registerLazyTenant(tenantId, env.mongoUri, { dbName });
    }
  }
}

export async function closeTutorialTenants() {
  const tenants = MultiTenantManager.getAllTenants();
  const outcomes = await Promise.allSettled(
    tenants.map(async tenant => { await tenant.client?.close(); })
  );
  MultiTenantManager.clearTenants();

  const errors = outcomes
    .filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected")
    .map(outcome => outcome.reason);
  if (errors.length) {
    throw new AggregateError(errors, "Failed to close tenant MongoDB clients.");
  }
}
