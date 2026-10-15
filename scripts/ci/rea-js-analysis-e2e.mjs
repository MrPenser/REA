#!/usr/bin/env node
// E2E on a synthetic, self-owned JS app: real REA CLI and production MCP
// inspect the same files without executing the JS application.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const exec = promisify(execFile);
const fixture = await mkdtemp(join(tmpdir(), "rea-e2e-javascript-"));
const inspect = (payload, surface) => {
  assert.ok(payload && typeof payload === "object", `${surface}: missing payload`);
  assert.ok(typeof payload.evidence_id === "string" && payload.evidence_id.length > 0,
    `${surface}: no evidence_id`);
  const graph = payload.normalized_result?.graph;
  assert.ok(Array.isArray(graph?.nodes) && graph.nodes.length > 0,
    `${surface}: missing application graph nodes`);
  assert.ok(Array.isArray(graph?.edges),
    `${surface}: missing application graph edges`);
  const modules = graph.nodes.filter((node) => node.kind === "javascript-module");
  assert.ok(modules.length >= 2, `${surface}: expected at least two source modules, got ${modules.length}`);
  const imports = graph.edges.filter((edge) => edge.relation === "imports");
  assert.ok(imports.length >= 1, `${surface}: expected a real cross-module import edge`);
  return {
    evidence_id: payload.evidence_id,
    module_count: modules.length,
    import_edges: imports.length,
    graph_nodes: graph.nodes.length,
    graph_edges: graph.edges.length,
  };
};

let transport;
let client;
try {
  await writeFile(join(fixture, "math.js"), "export function add(a, b) { return a + b; }\n");
  await writeFile(join(fixture, "main.js"),
    "import { add } from './math.js';\nexport const total = add(2, 3);\nexport function greet(name) { return 'Hello, ' + name; }\n");
  const cli = await exec(process.execPath,
    ["scripts/rea.mjs", "analyze-javascript-application", fixture, "--format", "json"],
    { cwd: process.cwd(), timeout: 90_000, maxBuffer: 12 * 1024 * 1024, env: { ...process.env, REA_LOG_LEVEL: "silent" } },
  );
  const cliFacts = inspect(JSON.parse(cli.stdout), "CLI");

  transport = new StdioClientTransport({
    command: process.execPath,
    args: ["scripts/rea.mjs", "mcp"],
    cwd: process.cwd(),
    env: { ...process.env, CI: "true", REA_LOG_LEVEL: "silent" },
    stderr: "pipe",
  });
  client = new Client({ name: "rea-e2e-js", version: "1.0.0" });
  await client.connect(transport, { timeout: 30_000 });
  const result = await client.callTool({
    name: "analyze_javascript_application",
    arguments: { input_path: fixture, format: "directory" },
  }, { timeout: 90_000 });
  assert.notEqual(result.isError, true, "MCP analysis returned tool error");
  const mcpFacts = inspect(result.structuredContent, "MCP");
  assert.equal(cliFacts.evidence_id, mcpFacts.evidence_id,
    "same fixture should produce the same evidence identity through CLI and MCP");

  console.log(JSON.stringify({
    check: "REA_REAL_JAVASCRIPT_APPLICATION_ANALYSIS",
    status: "PASS",
    platform: process.platform,
    cli: cliFacts,
    mcp: mcpFacts,
    note: "Static inspection of two authored modules; application code was not executed",
  }));
} catch (error) {
  console.error("REA_REAL_JAVASCRIPT_APPLICATION_ANALYSIS=FAIL");
  throw error;
} finally {
  if (client) await client.close().catch(() => {});
  if (transport) await transport.close().catch(() => {});
  await rm(fixture, { recursive: true, force: true });
}
