import "dotenv/config";
import { AmbitenClient, AmbitenContext, MultiTenantManager } from "@ambiten/core";
import type { MongoClient } from "mongodb";

const mongoUri = process.env.MONGO_URI?.trim() || "mongodb://127.0.0.1:27017/?replicaSet=rs0";
export const tenantDatabases = Object.freeze({
  "tenant-a": process.env.TENANT_A_DB?.trim() || "ambiten_lambda_tenant_a",
  "tenant-b": process.env.TENANT_B_DB?.trim() || "ambiten_lambda_tenant_b"
});
export type TenantId = keyof typeof tenantDatabases;

if (new Set(Object.values(tenantDatabases)).size !== 2 ||
    Object.values(tenantDatabases).some(name => !/^[a-zA-Z0-9_-]+$/.test(name))) {
  throw new Error("Configure two distinct, non-empty tenant database names using letters, digits, underscores, or hyphens.");
}

export function isTenantId(value: string): value is TenantId {
  return Object.hasOwn(tenantDatabases, value);
}

// Cache infrastructure, never the current tenant, request, event, or session.
const connections = new Map<TenantId, Promise<MongoClient>>();
let initialization: Promise<void> | undefined;
let shutdown: Promise<void> | undefined;

export function getTenantClient(tenantId: string): Promise<MongoClient> {
  if (shutdown) return Promise.reject(new Error("Runtime has been closed."));
  if (!isTenantId(tenantId)) return Promise.reject(new Error("Unknown tenant."));
  let pending = connections.get(tenantId);
  if (!pending) {
    pending = MultiTenantManager.getClient(tenantId).then(client => {
      if (!client) throw new Error("Tenant infrastructure is not registered.");
      return client;
    }).catch(error => {
      connections.delete(tenantId);
      throw error;
    });
    connections.set(tenantId, pending);
  }
  return pending;
}

export const client = new AmbitenClient({
  uri: mongoUri,
  options: { dbName: "ambiten_lambda_runtime" },
  tenantResolver: { getClient: getTenantClient }
});

export function initializeRuntime(): Promise<void> {
  if (shutdown) return Promise.reject(new Error("Runtime has been closed."));
  initialization ??= (async () => {
    await client.connect();
    for (const [tenantId, dbName] of Object.entries(tenantDatabases)) {
      MultiTenantManager.registerLazyTenant(tenantId, mongoUri, { dbName });
    }
    AmbitenContext.configureTransactionResolver({
      resolveClient: tenantId => tenantId ? getTenantClient(tenantId) : undefined
    });
  })().catch(async error => {
    await client.close();
    initialization = undefined;
    throw error;
  });
  return initialization;
}

// Called by the local runner/tests, never at the end of each Lambda invocation.
export function closeRuntime(): Promise<void> {
  shutdown ??= (async () => {
    await initialization?.catch(() => {});
    const outcomes = await Promise.allSettled([
      ...Array.from(connections.values(), async pending => (await pending).close()),
      client.close()
    ]);
    connections.clear();
    MultiTenantManager.clearTenants();
    const errors = outcomes.filter(result => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map(result => result.reason), "Runtime cleanup failed.");
  })();
  return shutdown;
}
