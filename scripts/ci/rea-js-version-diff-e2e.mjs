#!/usr/bin/env node
// E2E: real comparison of two different, test-owned JavaScript applications.
// Evidence is produced by REA's production analysis/comparison code, not mocked.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), "rea-version-diff-e2e-"));
const left = join(root, "v1");
const right = join(root, "v2");

try {
  await Promise.all([mkdir(left), mkdir(right)]);
  await writeFile(join(left, "math.js"),
    "export function add(a,b) { return a+b; }\nexport const generation = 1;\n");
  await writeFile(join(left, "main.js"),
    "import { add } from './math.js';\nexport const result = add(2,3);\n");
  await writeFile(join(right, "math.js"),
    "export function add(a,b) { return a+b+10; }\nexport const generation = 2;\n");
  await writeFile(join(right, "feature.js"),
    "export function bonus(value) { return value*3; }\n");
  await writeFile(join(right, "main.js"),
    "import { add } from './math.js';\nimport { bonus } from './feature.js';\nexport const result = bonus(add(2,3));\n");

  const { stdout, stderr } = await exec(
    process.execPath,
    ["scripts/verify/javascript/application-workflows.mjs", "--left", left, "--right", right],
    {
      cwd: process.cwd(),
      env: { ...process.env, REA_LOG_LEVEL: "silent" },
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    }
  );
  const report = JSON.parse(stdout);
  assert.equal(report.verified, true, "Version workflow did not verify its evidence");
  assert.ok(typeof report.comparison_id === "string" && report.comparison_id.length > 0,
    "Missing authenticated comparison identity");
  assert.ok(typeof report.evidence_id === "string" && report.evidence_id.length > 0,
    "Missing evidence identity");
  assert.notEqual(report.left?.root_artifact_sha256, report.right?.root_artifact_sha256,
    "Different application versions got the same artifact digest");
  const summary = report.summary;
  assert.ok(summary && typeof summary === "object", "Missing version-change summary");
  const deltas = ["added", "removed", "changed"].reduce(
    (sum, key) => sum + (Number.isInteger(summary[key]) ? summary[key] : 0), 0
  );
  assert.ok(deltas > 0, "REA reported no changes between materially different input trees");
  // There must be no hidden evidence failure from the underlying CLI/workflow.
  console.log(JSON.stringify({
    check: "REA_JAVASCRIPT_VERSION_DIFFERENCE_E2E",
    status: "PASS",
    platform: process.platform,
    comparison_id: report.comparison_id,
    evidence_id: report.evidence_id,
    summary,
    coverage: report.coverage,
    trace_summary: report.trace?.summary ?? null,
    export_shape_summary: report.export_shape_comparison?.summary ?? null,
    observation: "Two intentionally different source versions; application was not executed",
    verifier: report.verifier_run ?? null,
  }));
  if (stderr.trim()) console.error(stderr.slice(-3000));
} catch (error) {
  console.error("REA_JAVASCRIPT_VERSION_DIFFERENCE_E2E=FAIL");
  throw error;
} finally {
  await rm(root, { recursive: true, force: true });
}
