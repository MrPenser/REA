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

## Safe valid-example sweep (separate workflow)

- CI run, both Linux and Windows: https://github.com/MrPenser/REA/actions/runs/38770265230
- Linux individual ledger: https://github.com/MrPenser/REA/actions/runs/38770265230/artifacts/11992175083
- Windows individual ledger: https://github.com/MrPenser/REA/actions/runs/38770265230/artifacts/11991191493
- Script: `scripts/ci/rea-207-mcp-valid-examples.mjs`

| Check | Linux | Windows |
| --- | ---: | ---: |
| Catalog tools considered | 207 | 207 |
| Canonical valid samples identified | 206 | 206 |
| Safe valid invocations via production MCP | 95 | 95 |
| Successful handler results | 22 | 22 |
| Typed error/unavailability responses (NOT functional passes) | 73 | 73 |
| Transport call failures | 0 | 0 |
| Successful output-schema mismatches | 0 | 0 |
| Excluded due to external/target/process/network/filesystem effects | 111 | 111 |
| Without canonical valid sample | 1 | 1 |

These are **95 safely invoked tools**, not 95 successful functional E2Es.
Returning an error (even a correctly delivered MCP error) does not prove a provider works.

## Strict gates
- `CATALOG_207_PASS`: **YES** on both platforms.
- `SCHEMA_ADMISSION_207_PASS`: **YES**, with individual per-tool transport evidence.
- `HANDLER_VALID_INVOCATION_207_PASS`: **NO**. The later valid-example sweep invoked 95 of 207 safely: 22 successes, 73 unavailable/error responses. The remaining 112 were not safely executed as valid examples.
- `PROVIDER_FUNCTIONAL_207_PASS`: **NOT ESTABLISHED**.
- Tool advertisements and negative validation are not proofs that external native/Android/browser/hardware providers work.
- Previously verified real E2E lanes: Windows JavaScript CLI/MCP, Go binaries, Ghidra native analysis; see the successful dedicated workflow runs. These should not be automatically attributed to all 207 tools.
- Tools that require privileged runtime setup, an external provider, target samples or mutable state require individual E2E cases; do not silently count them as PASS.
- This audit has **not** integrated REA into ASTRADELIA.

## Next gate
Create evidence-linked positive E2E cases for every tool, tracking
`TOOL_NAME -> FIXTURE_ID -> PROVIDER_ID -> VALID_INVOCATION -> OBSERVED_RESULT -> EVIDENCE_SHA256 -> CI_RUN_ID`.
Only those individually passing may be classified `TOOL_FUNCTIONAL_E2E_PASS`.
