# REA extended evidence tests — 2026-10-15

## Evidence authority and scope

- Repository: https://github.com/MrPenser/REA
- Upstream source baseline: `morluto/rea@b2257653ca74e1013553d5bd916a0ef85a3c7678`
- Verified REA revision: `825e2a15e3fbbda462554f7821fbe1a4de69455f`
- Green run: https://github.com/MrPenser/REA/actions/runs/38748000514
- Raw evidence archive: https://github.com/MrPenser/REA/actions/runs/38748000514/artifacts/11980142725
- Runner: GitHub-hosted Ubuntu 24.04, Node.js 24.18.0, Go 1.24.13
- CI workflow: `.github/workflows/rea-extended-e2e.yml`
- Tested code: production REA build (`npm ci`, `npm run build:cached`) and test-owned source/binary fixtures
- Files and process lineage were observed and verifiers terminated without observed descendants.

## Results

| Gate | Outcome | Observed evidence |
| --- | --- | --- |
| JS source version comparison | PASS | REA detected 9 added, 6 removed, 2 changed, 0 unknown graph entities |
| JS coverage | PASS within supplied inputs | `complete-within-inputs`; 0 omitted graph entities |
| JS feature trace | PASS with limits | 2 matched seeds, 8 nodes and 9 edges; 12 observed and 6 inferred facts |
| JS export-return shapes | INCONCLUSIVE | 2 `unknown` export-shape items. Do not claim verified return-type changes. |
| Real Go binary analysis via CLI and production MCP | PASS | 15 binary variants, 30 public-interface checks |
| Native formats / architectures | PASS within Go metadata scope | ELF, Windows PE, macOS Mach-O; x86, x86_64, ARM64, PPC64, MIPS |
| Stripped / special cases | PASS | stripped, ELF sectionless, PIE, unstripped and non-UTF8 metadata probes |
| Omitted Go test coverage | None reported | `omitted_coverage: []` |
| Cleanup | PASS | verifier lineage had zero descendants |

## Fingerprints

- GitHub Actions evidence ZIP SHA-256: `8be253599030749ad4b9d15a93326ed10a6107e759f6f324bb56e6dbe4fa7a88`
- `go-binary-e2e.json` SHA-256: `fd86f5dc06b54b4bd19ca492a7eff3dc61b5efe59549303ba5db155237687ab6`
- `js-version-diff.json` SHA-256: `24d85342b714d9723d5321a918cc1fb2aaceb462374d98ecf353e3ffe5eb622a`
- `commit.txt` SHA-256: `e0877d8d77109080b6efaf98cc5b433bcc0c7fb29b1ad660f2b198f3fdda2813`

## Interpretation and limitations

The Go verification checks genuine compiled binaries from nine target OS/architecture combinations, including additional variants. It proves that REA can retrieve and authenticate Go binary metadata using its public CLI and MCP surfaces. It is **not** proof of deep machine-code decompilation, arbitrary third-party targets, every advertised MCP tool, or runtime execution of those binaries.

The JS comparison reads source artifacts without executing the target program. Export-shape inference was partially unknown; preserve this limitation instead of claiming comprehensive semantic recovery.

For baseline Windows execution and npm packaging, see [WINDOWS_VERIFICATION.md](WINDOWS_VERIFICATION.md). No ASTRADELIA/Medeus integration or architectural change was performed.

**Verdict:** `REA_JS_VERSION_DIFF_E2E_PASS` + `REA_GO_BINARY_MULTIFORMAT_E2E_PASS`. Ghidra full native analysis remains a separate gate.
