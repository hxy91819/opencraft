# Changelog

## v0.1.11

- Validate GitHub Actions npm Trusted Publishing with the configured `npm-release` environment.
- Server runtime behavior is unchanged from v0.1.10.

## v0.1.10

- First public npm release as `@opencraft-app/opencraft`.
- Managed website and execution gateway updates with health checks and rollback.
- Preserve running Codex tasks in an independently deployed core across execution gateway upgrades.
- Resume and roll back locally built releases through the same update transaction.
- This release supports Linux x64 and Node.js 24. Codex core, CLI, and DSH engine remain separately installed; it is not a fresh-server installer.
