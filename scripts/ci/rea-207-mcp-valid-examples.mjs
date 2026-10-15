#!/usr/bin/env node
// Production MCP valid-example sweep, limited to effects that cannot touch
// external processes, network, filesystem, UI or target/device state.
// A returned 'unavailable' is *not* a functional E2E pass.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { TOOL_CONTRACTS } from "../../dist/contracts/toolContracts.js";

const destination = resolve(process.argv[2] ?? "verification-results/mcp-safe-valid-examples.json");
const digest = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const forbidden = [
  "mutatesTarget", "writesFilesystem", "launchesProcess", "accessesNetwork",
  "changesUiState", "mayDiscardData", "executesForeignCode", "mutatesDevice",
];
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["scripts/rea.mjs", "mcp"],
  cwd: process.cwd(),
  env: { ...process.env, CI: "true" },
  stderr: "pipe",
});
const client = new Client({ name: "rea-valid-probe-audit", version: "1.0.0" });
const records = [];
let failed = false;
try {
  await client.connect(transport, { timeout: 60_000 });
  const available = (await client.listTools()).tools.map((x) => x.name);
  assert.deepEqual(available.slice().sort(), TOOL_CONTRACTS.map((x) => x.name).sort());
  for (const contract of TOOL_CONTRACTS) {
    const disallow = forbidden.filter((key) => contract.effects[key]);
    const record = {
      tool: contract.name,
      kind: contract.kind,
      admitted_sample: contract.inputSchema.safeParse(contract.examples[0].input).success,
      reason_skipped: disallow,
      result: "NOT_RUN",
    };
    records.push(record);
    assert.ok(record.admitted_sample, "invalid canonical example: " + contract.name);
    if (disallow.length > 0) { record.result = "OUT_OF_SAFE_SCOPE"; continue; }
    const example = contract.examples[0].input;
    try {
      const response = await client.callTool({ name: contract.name, arguments: example }, undefined, { timeout: 12_000 });
      record.result = response.isError ? "RUNTIME_ERROR_OR_UNAVAILABLE" : "RESPONSE_SUCCESS";
      record.response_sha256 = digest(response);
      record.response_structured = response.structuredContent != null;
      record.output_schema_valid = response.isError ? null : contract.outputSchema.safeParse(response.structuredContent).success;
      if (!response.isError && !record.output_schema_valid) {
        record.result = "SUCCESS_OUTPUT_SCHEMA_MISMATCH";
        failed = true;
      }
    } catch (error) {
      record.result = "CALL_FAILED";
      record.error = String(error).slice(0, 400);
      failed = true;
    }
    if (records.length % 25 === 0) console.log("SAFE_SWEEP_PROGRESS=" + records.length + "/" + TOOL_CONTRACTS.length);
  }
} catch (error) {
  failed = true;
  console.error(String(error));
} finally {
  const summary = {
    total_tools: TOOL_CONTRACTS.length,
    schema_valid_examples: records.filter((x) => x.admitted_sample).length,
    safely_invoked: records.filter((x) => !["NOT_RUN","OUT_OF_SAFE_SCOPE"].includes(x.result)).length,
    successful_handlers: records.filter((x) => x.result === "RESPONSE_SUCCESS").length,
    errors_or_unavailable: records.filter((x) => x.result === "RUNTIME_ERROR_OR_UNAVAILABLE").length,
    call_failures: records.filter((x) => x.result === "CALL_FAILED").length,
    output_schema_mismatches: records.filter((x) => x.result === "SUCCESS_OUTPUT_SCHEMA_MISMATCH").length,
    excluded_due_to_external_effects: records.filter((x) => x.result === "OUT_OF_SAFE_SCOPE").length,
    provider_specific_full_e2e_coverage: "NOT_MEASURED_BY_THIS_SUITE",
    verdict: failed ? "FAIL" : "SAFE_VALID_EXAMPLES_OBSERVED",
  };
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify({ timestamp: new Date().toISOString(), platform: process.platform, summary, tools: records }, null, 2) + "\n");
  console.log("REA_207_SAFE_VALID_SWEEP=" + JSON.stringify(summary));
  await client.close().catch(()=>{});
  await transport.close().catch(()=>{});
}
if (failed) process.exitCode = 1;
