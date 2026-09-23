import "dotenv/config";
import {
  AmbitenClient,
  AmbitenContext,
  MultiTenantManager
} from "@ambiten/core";

const mongoUri =
  process.env.MONGO_URI?.trim() ||
  "mongodb://127.0.0.1:27017/?replicaSet=rs0";

export const tenantDatabases =
  Object.freeze({
    "tenant-a":
      process.env.TENANT_A_DB?.trim() ||
      "ambiten_graphql_tenant_a",

    "tenant-b":
      process.env.TENANT_B_DB?.trim() ||
      "ambiten_graphql_tenant_b"
  });

export type TenantId = keyof typeof tenantDatabases;

type TenantClient =
  NonNullable<
    Awaited<ReturnType<typeof MultiTenantManager.getClient>>
  >;

const databaseNames = Object.values(tenantDatabases);

if (
  new Set(databaseNames).size !==
  databaseNames.length ||
  databaseNames.some(
    name =>
      !/^[a-zA-Z0-9_-]+$/.test(
        name
      )
  )
) {
  throw new Error(
    "Configure two distinct tenant database names using letters, digits, underscores, or hyphens."
  );
}

export function isTenantId(value: string): value is TenantId {
  return Object.hasOwn(
    tenantDatabases,
    value
  );
}

/*
 * Process-scoped infrastructure.
 *
 * Execution identity and transaction state remain
 * inside AmbitenContext.
 */
const connections = new Map<TenantId, Promise<TenantClient>>();

let initialization: Promise<void> | undefined;

let shutdown: Promise<void> | undefined;

export async function getTenantClient(
  tenantId: string
): Promise<TenantClient> {
  if (shutdown) {
    throw new Error(
      "Runtime has been closed."
    );
  }

  if (!isTenantId(tenantId)) {
    throw new Error(
      `Unknown tenant: ${tenantId}`
    );
  }

  const existing = connections.get(tenantId);

  if (existing) {
    return existing;
  }

  const pending: Promise<TenantClient> = MultiTenantManager.getClient(tenantId)
    .then((resolvedClient: string) => {
      if (!resolvedClient) {
        throw new Error(
          `Tenant infrastructure is not registered for "${tenantId}".`
        );
      }

      return resolvedClient;
    }
    )
    .catch((error: any) => {
      connections.delete(tenantId);
      throw error;
    }
    );

  connections.set(tenantId, pending);

  return pending;
}

export const client = new AmbitenClient({
  uri: mongoUri,
  options: {
    dbName: "ambiten_graphql_runtime"
  },
  tenantResolver: {
    getClient: getTenantClient
  }
});

export function initializeRuntime(): Promise<void> {
  if (shutdown) {
    return Promise.reject(new Error("Runtime has been closed."));
  }

  initialization ??= (async () => {
    await client.connect();

    for (const [tenantId, dbName] of Object.entries(tenantDatabases)) {
      MultiTenantManager
        .registerLazyTenant(
          tenantId,
          mongoUri,
          {
            dbName
          }
        );
    }

    AmbitenContext
      .configureTransactionResolver({
        resolveClient:
          (tenantId: string) =>
            tenantId
              ? getTenantClient(
                tenantId
              )
              : undefined
      });
  })()
    .catch(
      async error => {
        connections.clear();

        MultiTenantManager
          .clearTenants();

        await client
          .close()
          .catch(
            () => { }
          );

        initialization =
          undefined;

        throw error;
      }
    );

  return initialization;
}

export function closeRuntime(): Promise<void> {
  shutdown ??=
    (async () => { await initialization?.catch(() => { });
      const tenantClosures =
        Array.from(
          connections.values(),
          async pending => {
            const tenantClient =
              await pending;

            await tenantClient
              .close();
          }
        );

      const outcomes = await Promise.allSettled([
          ...tenantClosures,
          client.close()
        ]);

      connections.clear();

      MultiTenantManager
        .clearTenants();

      const errors = outcomes.filter((result): result is
              PromiseRejectedResult =>
              result.status ===
              "rejected"
          )
          .map(
            result =>
              result.reason
          );

      if (
        errors.length
      ) {
        throw new AggregateError(
          errors,
          "Runtime cleanup failed."
        );
      }
    })();

  return shutdown;
};