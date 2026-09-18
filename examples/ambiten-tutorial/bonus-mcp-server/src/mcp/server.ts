import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { AmbitenContext } from "@ambiten/core";
import { UserModel, type User } from "../models/user.model.js";
import { McpExecutionError, runMcpExecution } from "./execution.js";

const userOutputSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().optional()
});

function serializeUser(user: User & { _id?: unknown }) {
  return {
    _id: user._id === undefined ? undefined : String(user._id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined
  };
}

function toolFailure(error: unknown) {
  if (!(error instanceof McpExecutionError)) console.error("[mcp tool failed]", error);
  return {
    isError: true,
    content: [{
      type: "text" as const,
      text: error instanceof McpExecutionError ? error.message : "Tool execution failed."
    }]
  };
}

export function createAmbitenMcpServer() {
  const server = new McpServer({ name: "ambiten-workspace", version: "1.0.0" });

  server.registerTool("workspace_list_users", {
    title: "List Workspace Users",
    description: "List active users for the workspace tenant assigned to this MCP server.",
    inputSchema: z.object({}).strict(),
    outputSchema: z.object({
      tenantId: z.string(),
      count: z.number().int().nonnegative(),
      users: z.array(userOutputSchema)
    }),
    annotations: {
      readOnlyHint: true, destructiveHint: false,
      idempotentHint: true, openWorldHint: false
    }
  }, async () => {
    try {
      const execution = await runMcpExecution("workspace_list_users", async () => {
        const users = await UserModel.find({});
        return {
          tenantId: AmbitenContext.get().tenantId!,
          count: users.length,
          users: users.map(serializeUser)
        };
      });
      const output = execution.result;
      return {
        content: [{ type: "text", text: `Found ${output.count} active workspace users.` }],
        structuredContent: output
      };
    } catch (error) {
      return toolFailure(error);
    }
  });

  server.registerTool("workspace_create_user", {
    title: "Create Workspace User",
    description: "Create a user inside the workspace tenant assigned to this MCP server.",
    inputSchema: z.object({
      name: z.string().trim().min(1),
      email: z.string().trim().email()
    }).strict(),
    outputSchema: z.object({
      tenantId: z.string(),
      user: userOutputSchema
    }),
    annotations: {
      readOnlyHint: false, destructiveHint: false,
      idempotentHint: false, openWorldHint: false
    }
  }, async ({ name, email }) => {
    try {
      const execution = await runMcpExecution("workspace_create_user", async () => {
        const user = await UserModel.create({ name, email, createdAt: new Date() });
        return {
          tenantId: AmbitenContext.get().tenantId!,
          user: serializeUser(user)
        };
      });
      const output = execution.result;
      return {
        content: [{ type: "text", text: `Created workspace user ${output.user.email}.` }],
        structuredContent: output
      };
    } catch (error) {
      return toolFailure(error);
    }
  });

  return server;
}
