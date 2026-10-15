# Windows build & static-analysis E2E verification — 2026-10-15

## Evidence identity

- Repository: https://github.com/MrPenser/REA
- Upstream REA revision: `b2257653ca74e1013553d5bd916a0ef85a3c7678`
- Tested repository commit: `1e694ba549024256376b9057285f79da67aec140`
- Successful GitHub Actions run: https://github.com/MrPenser/REA/actions/runs/38746653872
- Workflow: `.github/workflows/rea-windows-e2e.yml`
- Environment: GitHub-hosted Ubuntu 24.04 cross-compiler + Windows Server 2022 x64, Node.js 24.18.0
- Package: `rea-agents@6.5.0`

## Result

| Verification | Observed outcome |
| --- | --- |
| Linux cross-compile Windows x64 N-API 8 addon | PASS |
| Native addon manifest version, SHA-256, PE x64, ABI verification | PASS |
| Transfer Windows addon to Windows CI runner | PASS |
| Windows `npm ci --no-audit --no-fund` | PASS |
| Windows `npm run build:cached` | PASS |
| Windows `npm run typecheck` | PASS |
| Windows CLI `--help` | PASS |
| Windows stdio MCP initialize and `tools/list` | PASS, 207 advertised tools |
| Real static analysis of two authored JavaScript modules via CLI | PASS, 5 discovered module nodes, 2 import edges, 8 graph nodes, 9 graph edges |
| Same analysis via production MCP `analyze_javascript_application` | PASS, same structural counts; distinct invocation evidence IDs |
| Windows `npm pack --ignore-scripts` | PASS |
| Uploaded Windows npm package as Actions artifact | PASS |

The fixture consisted of `main.js`, which imported `add` from `math.js`, and `math.js`, which exported the function. Both CLI and MCP reported the import relation. **The test did not execute the fixture application** and did not inspect an external third-party target.

## Artifact and cryptographic evidence

- [Windows package artifact](https://github.com/MrPenser/REA/actions/runs/38746653872/artifacts/11980336110), includes `rea-agents-6.5.0.tgz` and `SHA256SUMS.txt`.
- `rea-agents-6.5.0.tgz` SHA-256: `46358b494012fb7a0f72b17626124f124fc4d6daf83eb9d552ce44b3f8e1bd53`
- GitHub Windows package ZIP SHA-256: `809f4c420c3d891e02df99fb2940c5cf00c419032bf17364b9dc57afbd222b14`
- [Windows native addon artifact](https://github.com/MrPenser/REA/actions/runs/38746653872/artifacts/11980030864), including manifest.
- N-API addon `rea-windows-x64.node` SHA-256: `e2ae60b371cb7bfebfe109cb3799c4febabb953832a01a9912264e7ee059e75d`
- GitHub native artifact ZIP SHA-256: `c28442b5548da3903d7020e6b362f391220db1bc0a5a4c261b9a3f3ef25810c9`
- Artifact retention: 30 days.

## Scope and remaining gates

- `WINDOWS_NATIVE_BUILD_PASS`, `WINDOWS_MCP_BOOTSTRAP_PASS`, `WINDOWS_JAVASCRIPT_STATIC_ANALYSIS_E2E_PASS`.
- This is a Node.js/npm distribution, **not** a standalone Windows `.exe`.
- Native Ghidra, IDA, browser/CDP, APK, other external-provider E2E and agent integration have **not** been verified here.
- No integration with ASTRADELIA or MEDEUS was made.
- No full Windows test suite is claimed. This is a targeted environment and capability gate, not an all-features certification.

## Failure classification during setup

1. Initial Windows E2E failed because the copied upstream source did not contain ignored `native/windows/build` outputs. **Packaging prerequisite / CI harness gap**, corrected by cross-building on Linux from the pinned source and verifying the addon and manifest.
2. First cross-build attempt failed before checkout due to a mistyped `actions/setup-node` pinned SHA. **CI harness error**, corrected without changing REA runtime code.
3. Subsequent E2E reached successful CLI and MCP analysis but the assertion incorrectly required two separately generated `evidence_id` values to match. **Test assertion error**, fixed to compare structural facts (module count and import edges).

None of the three failures establishes a product algorithm regression.
