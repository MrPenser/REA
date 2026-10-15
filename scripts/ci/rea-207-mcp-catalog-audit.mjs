#!/usr/bin/env node
// Full production-MCP catalog contract audit. Distinguishes admission/transport
// verification from actual provider-specific successful functionality.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Ajv2020 } from "ajv/dist/2020.js";
import { TOOL_CONTRACTS } from "../../dist/contracts/toolContracts.js";

const sha = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const output = resolve(process.argv[2] ?? "verification-results/mcp-207-catalog.json");
const expectedCount = Number(process.env.REA_EXPECTED_MCP_COUNT ?? "207");
const catalog = [...TOOL_CONTRACTS];
const canonical = new Map(catalog.map((x) => [x.name, x]));
assert.equal(canonical.size, catalog.length, "duplicate canonical tool names");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["scripts/rea.mjs", "mcp"],
  cwd: process.cwd(),
  env: { ...process.env, CI: "true" },
  stderr: "pipe",
});
let stderr = "";
transport.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
const client = new Client({ name: "rea-all-tools-audit", version: "1.0.0" });
const audit = {
  audit_kind: "PRODUCTION_MCP_CATALOG_VALIDATION_NOT_FULL_PROVIDER_E2E",
  timestamp: new Date().toISOString(),
  platform: process.platform, arch: process.arch, node: process.version,
  canonical_tool_count: catalog.length,
  expected_tool_count: expectedCount,
  tools: [],
};
let failure = null;
try {
  await client.connect(transport, { timeout: 60_000 });
  const advertised = (await client.listTools(undefined, { timeout: 60_000 })).tools;
  const seen = new Set(advertised.map((x) => x.name));
  assert.equal(seen.size, advertised.length, "duplicate advertised tools");
  assert.equal(advertised.length, expectedCount, "unexpected advertised tool count");
  assert.deepEqual([...seen].sort(), [...canonical.keys()].sort(), "catalog/production name mismatch");
  const ajv = new Ajv2020({ strict: false, validateFormats: false, addUsedSchema: false });
  for (const [index, tool] of advertised.entries()) {
    const contract = canonical.get(tool.name);
    assert.ok(contract, "missing canonical contract: " + tool.name);
    const item = {
      index: index + 1,
      name: tool.name,
      kind: contract.kind,
      effects: contract.effects,
      advertised_schema: { input: false, output: false },
      unknown_key_probe: "NOT_RUN",
      positive_safe_empty: "NOT_APPLICABLE",
    };
    audit.tools.push(item);
    for (const type of ["inputSchema", "outputSchema"]) {
      const schema = tool[type];
      assert.ok(schema && typeof schema === "object", tool.name + " has no " + type);
      assert.equal(ajv.validateSchema(schema), true, tool.name + " invalid " + type + ": " + ajv.errorsText(ajv.errors));
      ajv.compile(schema);
      ajv.removeSchema();
      item.advertised_schema[type === "inputSchema" ? "input" : "output"] = true;
    }
    const invalid = { ...(contract.examples[0]?.input ?? {}), __rea_unknown_admission_probe__: true };
    assert.equal(contract.inputSchema.safeParse(invalid).success, false, tool.name + " canonical unexpected acceptance of unknown field");
    try {
      const result = await client.callTool({ name: tool.name, arguments: invalid }, undefined, { timeout: 30_000 });
      assert.equal(result.isError, true, tool.name + " accepted unknown root key");
      item.unknown_key_probe = "REJECTED";
      item.probe_response_sha256 = sha(result);
    } catch (cause) {
      item.unknown_key_probe = "FAILED";
      item.probe_error = String(cause).slice(0, 800);
      throw cause;
    }
    // Isolated empty-session read-only probes have no filesystem, process,
    // network, target/device, or UI effects and need no caller-supplied paths.
    const noEffects = Object.entries(contract.effects).every(([key, value]) =>
      key === "idempotent" ? value === true : value === false
    );
    if (noEffects && contract.inputSchema.safeParse({}).success) {
      const valid = await client.callTool({ name: tool.name, arguments: {} }, undefined, { timeout: 30_000 });
      assert.ok(valid && typeof valid === "object", tool.name + " returned no MCP response");
      item.positive_safe_empty = valid.isError === true ? "HANDLER_ERROR_TYPED_OR_UNAVAILABLE" : "RESPONSE_SUCCESS";
      item.safe_response_sha256 = sha(valid);
    }
    if ((index + 1) % 25 === 0) console.log("MCP_AUDIT_PROGRESS=" + (index + 1) + "/" + advertised.length);
  }
} catch (cause) {
  failure = cause;
  audit.failure = String(cause).slice(0, 2000);
  audit.stderr_tail = stderr.slice(-3500);
} finally {
  audit.summary = {
    advertised_count: audit.tools.length,
    both_schemas_valid: audit.tools.filter((x) => x.advertised_schema.input && x.advertised_schema.output).length,
    rejected_unknown_key: audit.tools.filter((x) => x.unknown_key_probe === "REJECTED").length,
    safe_valid_empty_invocations: audit.tools.filter((x) => x.positive_safe_empty !== "NOT_APPLICABLE").length,
    safe_valid_empty_responses: audit.tools.filter((x) => x.positive_safe_empty === "RESPONSE_SUCCESS").length,
    safe_valid_empty_expected_errors: audit.tools.filter((x) => x.positive_safe_empty === "HANDLER_ERROR_TYPED_OR_UNAVAILABLE").length,
    real_provider_e2e_tested_by_this_suite: 0,
    verdict: failure ? "FAIL" : "CATALOG_ADMISSION_PASS_PROVIDER_E2E_NOT_COVERED",
  };
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, JSON.stringify(audit, null, 2) + "\n");
  console.log("REA_207_CATALOG_AUDIT_SUMMARY=" + JSON.stringify(audit.summary));
  await client.close().catch(() => {});
  await transport.close().catch(() => {});
}
if (failure) throw failure;
assert.equal(audit.summary.rejected_unknown_key, expectedCount, "incomplete runtime input admission coverage");
assert.equal(audit.summary.both_schemas_valid, expectedCount, "incomplete schema coverage");
