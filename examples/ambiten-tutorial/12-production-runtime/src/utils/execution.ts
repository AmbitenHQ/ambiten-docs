import { AmbitenContext } from "@ambiten/core";

export function getExecutionInfo() {
  const ctx = AmbitenContext.get();
  return {
    tenantId: ctx.tenantId,
    requestId: ctx.requestId,
    dbName: ctx.dbName,
    collectionName: ctx.collectionName
  };
}
