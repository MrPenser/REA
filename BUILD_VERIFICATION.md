# REA build verification (2026-10-15)

## Verified snapshot

- Repository: https://github.com/MrPenser/REA
- Original upstream: https://github.com/morluto/rea
- Upstream revision: `b2257653ca74e1013553d5bd916a0ef85a3c7678`
- First full green build commit: `d51dac6319faa34420ab87ae8c50214d18cdc927`
- Full green CI run: https://github.com/MrPenser/REA/actions/runs/38741370484
- Workflow: `.github/workflows/build-rea.yml`
- Platform: GitHub-hosted `ubuntu-24.04`, Node.js from `.nvmrc` (`24.18.0`)
- Package identity: `rea-agents@6.5.0`

## Observed checks

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | PASS |
| `npm run build:cached` | PASS |
| `npm run typecheck` | PASS |
| `node scripts/rea.mjs --help` | PASS |
| Spawn compiled production MCP on stdio + initialize + `tools/list` | PASS; 207 advertised tools |
| `npm run test:mcp` | PASS; 768 passed, 5 skipped, 0 failed (139 test files; 138 passed, 1 skipped) |
| `npm pack --ignore-scripts` | PASS |

## Saved artifact

- GitHub Actions artifact: [rea-build-node24-linux](https://github.com/MrPenser/REA/actions/runs/38741370484/artifacts/11976313825)
- Inside the Actions ZIP: `rea-agents-6.5.0.tgz` and `SHA256SUMS.txt`
- `rea-agents-6.5.0.tgz` SHA-256: `ad2f165d8561f369236aabeef375f3c0a9db06cfb941f9d61097b6fd2765f5c2`
- GitHub Actions ZIP SHA-256: `ec8d1d3b7cd808df34234cab177c11e357c5582ecc062896f478e6c73aefa287`
- Artifact retention: 30 days from 2026-10-15

## Boundaries / not yet verified

- This is a **Linux CI build**, not a standalone Windows executable. Windows native installation and integration have not been tested.
- No Ghidra/IDA, browser automation, APK or other external-analysis provider was validated end-to-end by this build gate.
- 207 tools were advertised by MCP; this is not a claim that every tool passed an end-to-end functional test.
- No source-code changes to upstream REA were made for the build. Only our CI workflow, smoke harness, and provenance documents were added.
- No integration with ASTRADELIA / MEDEUS was performed.

**Verdict:** `LINUX_BUILD_AND_MCP_BOOTSTRAP_PASS`; `WINDOWS_RUNTIME_NOT_VERIFIED`; `FULL_PROVIDER_E2E_NOT_VERIFIED`.

## Subsequent Windows validation

The original 2026-10-15 Linux snapshot verification above remains valid. A separate Windows x64 CI lane has now produced a pinned native addon and successfully performed production CLI/MCP static JavaScript analysis. See [WINDOWS_VERIFICATION.md](WINDOWS_VERIFICATION.md) for verified commit, logs, E2E result, hashes, and remaining limitations.

Current combined status: `LINUX_BUILD_PASS` + `WINDOWS_NATIVE_BUILD_PASS` + `WINDOWS_JAVASCRIPT_STATIC_ANALYSIS_E2E_PASS` + `FULL_EXTERNAL_PROVIDER_E2E_NOT_VERIFIED`.
