import { randomUUID } from "node:crypto";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { withQueryObservation } from "../instrumentation/query-observer.js";
import { mcpConfig } from "./config.js";

export class McpExecutionError extends Error {
  constructor(requestId: string, cause: unknown) {
    super(`Tool execution failed. Reference: ${requestId}`, { cause });
    this.name = "McpExecutionError";
  }
}

export async function runMcpExecution<R>(
  toolName: string,
  operation: () => Promise<R>
): Promise<{ result: R; tenantId: string; requestId: string }> {
  const tenantId = mcpConfig.tenantId;
  const requestId = `mcp-${randomUUID()}`;
  try {
    // Core 1.2.4 merges parent context. Never inherit an HTTP session, observer,
    // database override, or another tenant when creating a new tool execution.
    if (AmbitenContext.hasActiveContext()) {
      throw new Error("MCP tools must start outside an existing execution context.");
    }
    const tenant = await MultiTenantManager.resolveTenant(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" could not be resolved.`);

    return await AmbitenContext.run({ tenantId, requestId }, async () => {
      const observed = await withQueryObservation(operation);
      console.log("[mcp execution]", {
        tool: toolName, tenantId, requestId, signals: observed.signals.length
      });
      return { result: observed.result, tenantId, requestId };
    });
  } catch (error) {
    // Keep database details on the server; the caller receives a correlation ID.
    console.error("[mcp execution failed]", { tool: toolName, tenantId, requestId }, error);
    throw new McpExecutionError(requestId, error);
  }
}
