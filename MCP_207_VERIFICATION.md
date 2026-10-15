# REA MCP-207 audit / verification boundary

**Date:** 2026-10-15

## Source and scope
- Repository: https://github.com/MrPenser/REA
- Audited revision: `a0bc1f3b3130f7169f770f44b44ecf1431936f52`
- Verified Linux and Windows CI: https://github.com/MrPenser/REA/actions/runs/38769464972
- Source audit script: `scripts/ci/rea-207-mcp-catalog-audit.mjs`
- Linux evidence: https://github.com/MrPenser/REA/actions/runs/38769464972/artifacts/11990364351
- Windows evidence: https://github.com/MrPenser/REA/actions/runs/38769464972/artifacts/11990449479

## Directly observed on BOTH Linux and Windows
| Check | Result |
| --- | --- |
| Production MCP handshake + tool catalog | **207 / 207** advertised |
| Matches canonical named contracts (unique names) | **207 / 207** |
| Both advertised JSON schemas valid and compilable (AJV 2020) | **207 / 207** |
| Unknown-key rejection over real MCP transport (each individual tool) | **207 / 207** |
| Valid empty safe queries (separate from all 207) | **2 / 2 successful** |
| Provider-specific positive E2E inside the catalog audit | **0** — not measured by this suite |

Full Linux MCP boundary suite, same run: **768 passed, 5 skipped, 0 failed** across **139 files** (138 passed, 1 skipped).

## Strict gates
- `CATALOG_207_PASS`: **YES** on both platforms.
- `SCHEMA_ADMISSION_207_PASS`: **YES**, with individual per-tool transport evidence.
- `HANDLER_VALID_INVOCATION_207_PASS`: **NO EVIDENCE**, only two target-free positive responses in the catalog audit.
- `PROVIDER_FUNCTIONAL_207_PASS`: **NOT ESTABLISHED**.
- Tool advertisements and negative validation are not proofs that external native/Android/browser/hardware providers work.
- Previously verified real E2E lanes: Windows JavaScript CLI/MCP, Go binaries, Ghidra native analysis; see the successful dedicated workflow runs. These should not be automatically attributed to all 207 tools.
- Tools that require privileged runtime setup, an external provider, target samples or mutable state require individual E2E cases; do not silently count them as PASS.
- This audit has **not** integrated REA into ASTRADELIA.

## Next gate
Create evidence-linked positive E2E cases for every tool, tracking
`TOOL_NAME -> FIXTURE_ID -> PROVIDER_ID -> VALID_INVOCATION -> OBSERVED_RESULT -> EVIDENCE_SHA256 -> CI_RUN_ID`.
Only those individually passing may be classified `TOOL_FUNCTIONAL_E2E_PASS`.
