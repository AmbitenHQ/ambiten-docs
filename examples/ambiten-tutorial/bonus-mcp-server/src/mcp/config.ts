function readMcpConfig() {
  const tenantId = process.env.MCP_TENANT_ID?.trim();
  if (!tenantId) throw new Error("MCP_TENANT_ID is required.");

  const rawPort = process.env.MCP_PORT ?? "3001";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid MCP_PORT: ${rawPort}. Expected an integer from 1 to 65535.`);
  }
  return Object.freeze({ tenantId, port });
}

// Only the MCP entry point imports this configuration. REST and workers do not
// require MCP variables. Changes take effect on restart, never from tool input.
export const mcpConfig = readMcpConfig();
