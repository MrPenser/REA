// Non-destructive smoke test of the compiled REA MCP stdio entrypoint.
// No external reverse-engineering targets are opened or analyzed.
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["scripts/rea.mjs", "mcp"],
  cwd: process.cwd(),
  env: { ...process.env, CI: "true" },
  stderr: "pipe",
});

let stderr = "";
transport.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
const client = new Client({ name: "rea-build-smoke", version: "1.0.0" });

try {
  await client.connect(transport, { timeout: 30_000 });
  const result = await client.listTools(undefined, { timeout: 30_000 });
  assert.ok(Array.isArray(result.tools), "MCP tools/list did not return a tools array");
  assert.ok(result.tools.length > 0, "MCP tools/list returned no tools");
  for (const tool of result.tools) {
    assert.ok(typeof tool.name === "string" && tool.name.length > 0, "MCP tool missing name");
  }
  console.log(JSON.stringify({
    check: "REA_MCP_STDIO_HANDSHAKE_AND_TOOLS_LIST",
    status: "PASS",
    tool_count: result.tools.length,
    sample_tool_names: result.tools.slice(0, 8).map((tool) => tool.name),
  }));
} catch (error) {
  console.error("REA_MCP_STDIO_HANDSHAKE_AND_TOOLS_LIST=FAIL");
  if (stderr.trim()) console.error(stderr.slice(-10_000));
  throw error;
} finally {
  await client.close().catch(() => {});
  await transport.close().catch(() => {});
}
