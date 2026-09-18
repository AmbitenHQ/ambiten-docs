import { AmbitenClient, MultiTenantManager } from "@ambiten/core";
import { env } from "../config/env.js";

export const client = new AmbitenClient({
  uri: env.mongoUri,
  options: { dbName: env.dbName },
  tenantResolver: {
    getClient: async (tenantId: string) => MultiTenantManager.getClient(tenantId)
  }
});
