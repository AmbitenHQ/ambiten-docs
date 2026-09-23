import "dotenv/config";
import { randomUUID } from "node:crypto";
import { handler, type InvocationEvent } from "./handler";
import { closeRuntime, type TenantId } from "./runtime";

function makeEvent(tenantId: TenantId, method: "GET" | "POST", requestId: string, body?: object): InvocationEvent {
  return {
    version: "2.0",
    routeKey: `${method} /users`,
    rawPath: "/users",
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": tenantId,
      // Adapter 1.0.2 does not map requestContext.requestId into AmbitenContext.
      "x-request-id": requestId
    },
    requestContext: { requestId, http: { method, path: "/users" } },
    body: body ? JSON.stringify(body) : undefined,
    isBase64Encoded: false
  };
}

async function main() {
  const mode = process.argv[2] ?? "read";
  if (!["read", "create", "rollback"].includes(mode)) {
    throw new Error("Usage: npm run invoke -- [read|create|rollback]");
  }
  const runId = randomUUID();
  for (const tenantId of ["tenant-a", "tenant-b"] as const) {
    const requestId = `local-${tenantId}-${runId}`;
    try {
      const result = await handler(makeEvent(tenantId, mode === "read" ? "GET" : "POST", requestId,
        mode === "read" ? undefined : {
          name: `Lambda ${tenantId}`,
          email: `${tenantId}-${runId}@example.com`,
          simulateFailure: mode === "rollback"
        }));
      if (mode === "rollback") throw new Error("Expected the transaction to fail.");
      console.log(JSON.stringify({ mode, tenantId, result }, null, 2));
    } catch (error) {
      if (mode !== "rollback" || !(error instanceof Error) || error.message !== "Intentional transaction failure.") throw error;
      console.log(JSON.stringify({ mode, tenantId, requestId, expectedError: error.message }, null, 2));
    }
  }
}

main().catch(error => {
  console.error("Local Lambda invocation failed:", error);
  process.exitCode = 1;
}).finally(async () => {
  try { await closeRuntime(); }
  catch (error) { console.error("Local cleanup failed:", error); process.exitCode = 1; }
});
