import { randomUUID } from "node:crypto";
import { AmbitenContext } from "@ambiten/core";
import { createLambdaAdapter, type LambdaRequestInput } from "@ambiten/adapter-lambda";
import { getTenantClient, initializeRuntime, isTenantId, tenantDatabases } from "./runtime";
import { UserModel } from "./user.model";
import { AuditLogModel } from "./audit-log.model";

export interface InvocationEvent extends LambdaRequestInput {
  version?: string;
  routeKey?: string;
  rawQueryString?: string;
  requestContext?: {
    requestId?: string;
    http?: { method?: string; path?: string };
  };
}

function response(statusCode: number, result: Record<string, unknown>) {
  const ctx = AmbitenContext.get();
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId: ctx.tenantId, requestId: ctx.requestId, ...result })
  };
}

function readCreateInput(event: InvocationEvent) {
  let input: unknown;
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf8")
      : event.body ?? "";
    input = JSON.parse(body);
  } catch {
    throw new Error("Expected a JSON object containing name and email.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Expected a JSON object containing name and email.");
  }
  const value = input as Record<string, unknown>;
  if (typeof value.name !== "string" || !value.name.trim() ||
    typeof value.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim()) ||
    (value.simulateFailure !== undefined && typeof value.simulateFailure !== "boolean")) {
    throw new Error("Provide a non-empty name, valid email, and optional boolean simulateFailure.");
  }
  return { name: value.name.trim(), email: value.email.trim().toLowerCase(), simulateFailure: value.simulateFailure === true };
}

export const handler = createLambdaAdapter(async (event: InvocationEvent) => {
  const method = event.requestContext?.http?.method ?? event.httpMethod;
  const path = event.rawPath ?? event.requestContext?.http?.path ?? event.path;

  if (path !== "/users" || (method !== "GET" && method !== "POST")) {
    return response(404, { error: "Use GET /users or POST /users." });
  }

  await initializeRuntime();
  // Core models also resolve clients directly through MultiTenantManager.
  // Warm this tenant through the single-flight cache before any model operation.
  const { tenantId } = AmbitenContext.get();
  if (!tenantId) {
    throw new Error(
      "Tenant context is unavailable."
    );
  }
  await getTenantClient(tenantId);

  if (method === "GET") {
    const users = await UserModel.find({});
    return response(200, { users });
  }

  let input: ReturnType<typeof readCreateInput>;

  try {
    input = readCreateInput(event);
  } catch (error) {
    return response(
      400,
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid request body."
      }
    );
  }
  try {
    const result = await AmbitenContext.withTransaction(async () => {
      const user = await UserModel.create({
        name: input.name,
        email: input.email,
        createdAt: new Date()
      });
      const audit = await AuditLogModel.create({
        action: "USER_CREATED",
        userEmail: user.email,
        createdAt: new Date()
      });
      // Local teaching switch: fail after both writes to prove rollback of both models.
      if (input.simulateFailure) throw new Error("Intentional transaction failure.");
      return { user, audit };
    });
    return response(201, result);
  } catch (error) {
    if (
      input.simulateFailure &&
      error instanceof Error &&
      error.message ===
      "Intentional transaction failure."
    ) {
      return response(
        500,
        {
          error:
            "Transaction rolled back after the intentional failure."
        }
      );
    }

    throw error;
  }
}, {
  tenancy: {
    header: "x-tenant-id",
    resolver: request => {
      if (request.get?.("x-db-name") !== undefined || request.get?.("x-collection-name") !== undefined) {
        throw new Error("Database and collection routing are server-owned.");
      }
      return request.get?.("x-tenant-id")?.trim();
    },
    validate: isTenantId
  },
  resolvers: {
    requestId: request => request.get?.("x-request-id")?.trim() || randomUUID(),
    dbName: request => {
      const tenantId = request.get?.("x-tenant-id")?.trim() ?? "";
      if (!isTenantId(tenantId)) throw new Error("Unknown tenant.");
      return tenantDatabases[tenantId];
    }
  }
});
