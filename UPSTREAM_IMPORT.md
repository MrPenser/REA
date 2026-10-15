# REA upstream import

**Status:** SOURCE_SNAPSHOT_IMPORTED / LINUX_BUILD_AND_MCP_BOOTSTRAP_PASS (see [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md))

- Upstream: https://github.com/morluto/rea
- Original revision: `b2257653ca74e1013553d5bd916a0ef85a3c7678`
- Import: pinned source-tree snapshot; independent Git history, not an upstream fork.
- Upstream MIT `LICENSE` and `THIRD_PARTY_NOTICES.md` retained.
- All 3,908 upstream non-workflow blob/gitlink paths were compared by Git object SHA and mode against the pinned upstream tree: **0 mismatches**.
- The 29 original `.github/workflows/` files are stored, not activated, in `upstream_archive/REA_ORIGINAL_WORKFLOWS_b2257653ca74.tar.gz` because the import token cannot install new workflow files.
- All 5 Git submodule pointers (`third_party/`) are retained by SHA; submodule contents have **not** been downloaded.
- No dependencies were installed, no build or tests were run, and no ASTRADELIA integration was performed.

## Updating from upstream

Compare upstream changes against this pinned revision before importing a subsequent snapshot. Avoid directly activating third-party GitHub Actions workflows without reviewing their permissions and behavior.
