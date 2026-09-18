import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { startMcp } from "../dist/mcp.js";
import { runMcpExecution, McpExecutionError } from "../dist/mcp/execution.js";
import { UserModel } from "../dist/models/user.model.js";
import { client as database } from "../dist/core/db.js";
import { checkRuntimeReadiness, getRuntimeStatus } from "../dist/runtime/runtime.js";

const scenario = process.argv[2];
const origin = "http://127.0.0.1:" + process.env.MCP_PORT;
const mcp = new Client({ name: "mcp-runtime-probe", version: "1.0.0" });
let app;
let releaseQuery = () => {};
let exitCode = 0;
try {
  app = await startMcp();
  assert.equal(app.server.address().address, "127.0.0.1");
  await mcp.connect(new StreamableHTTPClientTransport(new URL(origin + "/mcp")));
  if (scenario === "execution-errors") {
    assert.equal(AmbitenContext.hasActiveContext(), false);
    const outcomes = await Promise.all(Array.from({ length: 8 }, (_, index) =>
      runMcpExecution("concurrency-probe", async () => {
        const before = { ...AmbitenContext.get() };
        await delay(index % 3);
        assert.equal(AmbitenContext.get().requestId, before.requestId);
        assert.equal(AmbitenContext.get().tenantId, "tenant-a");
        return UserModel.find({});
      })));
    assert.equal(new Set(outcomes.map(result => result.requestId)).size, 8);
    assert.equal(AmbitenContext.hasActiveContext(), false);
    await AmbitenContext.run({ tenantId: "tenant-b", dbName: "forbidden", collectionName: "forbidden", requestId: "parent" }, async () => {
      await assert.rejects(runMcpExecution("reject-parent", async () => assert.fail("Must not run")), error =>
        error instanceof McpExecutionError && /outside an existing execution context/.test(error.cause.message));
      assert.equal(AmbitenContext.get().requestId, "parent");
      assert.equal(AmbitenContext.get().dbName, "forbidden");
    });
    assert.equal(AmbitenContext.hasActiveContext(), false);
    const secret = "private database detail must not reach the client";
    const original = new Error(secret);
    UserModel.beforeFind(async () => { throw original; });
    const response = await mcp.callTool({ name: "workspace_list_users", arguments: {} });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /Tool execution failed\. Reference: mcp-/);
    assert.ok(!JSON.stringify(response).includes(secret));
    await assert.rejects(runMcpExecution("error-probe", () => UserModel.find({})),
      error => error instanceof McpExecutionError && error.cause === original);
    assert.equal(AmbitenContext.hasActiveContext(), false);
  } else if (scenario === "drain-SIGINT" || scenario === "drain-SIGTERM") {
    let enteredQuery;
    const entered = new Promise(resolve => { enteredQuery = resolve; });
    const pending = new Promise(resolve => { releaseQuery = resolve; });
    UserModel.beforeFind(async () => { enteredQuery(); await pending; });
    let baseClosed = false;
    const originalClose = database.close.bind(database);
    database.close = async () => { baseClosed = true; await originalClose(); };
    const call = mcp.callTool({ name: "workspace_list_users", arguments: {} });
    await Promise.race([entered, delay(5000).then(() => { throw new Error("Tool did not enter"); })]);
    // Windows cannot deliver Unix signals with child.kill; emit the registered
    // process signal in this isolated child while a real MCP HTTP call is active.
    process.emit(scenario.slice("drain-".length));
    assert.equal(getRuntimeStatus().shuttingDown, true);
    assert.equal(await checkRuntimeReadiness(), false);
    const closing = app.shutdown("repeat");
    assert.equal(closing, app.shutdown("repeat again"));
    await delay(50);
    assert.equal(baseClosed, false);
    releaseQuery();
    const result = await call;
    assert.ok(!result.isError);
    assert.equal(result.structuredContent.tenantId, "tenant-a");
    await closing;
    assert.equal(baseClosed, true);
    assert.equal(getRuntimeStatus().initialized, false);
    assert.equal(MultiTenantManager.getAllTenants().length, 0);
    assert.equal(app.server.listening, false);
    assert.equal(process.listenerCount("SIGINT"), 0);
    assert.equal(process.listenerCount("SIGTERM"), 0);
  } else {
    throw new Error("Unknown scenario: " + scenario);
  }
  console.log("PASS: MCP " + scenario);
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  releaseQuery();
  await mcp.close().catch(() => {});
  await app?.shutdown("test complete").catch(error => { exitCode = 1; console.error(error); });
}
process.exit(exitCode);
