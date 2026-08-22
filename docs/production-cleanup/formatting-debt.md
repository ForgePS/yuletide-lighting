# Formatting debt

**Baseline tag:** `p0.1-complete-with-limitations`  
**Gate:** `npm run format:changed:check` (changed files only)

## Historical drift

Phase 0.1 reported ~676 Prettier drifts across the monorepo. A repository-wide format commit is **not** authorized mixed with functional P0.2 work.

## Policy

- New or modified files since the P0.1 baseline must pass Prettier.
- Untouched historical drift does not fail the gate.
- Directory-scoped cleanup commits may be scheduled later (one domain at a time).

## Recommended staged cleanup (later)

1. `packages/types`
2. `packages/validators`
3. `packages/firebase`
4. `packages/api`
5. `apps/web/src`
6. `docs/`

## Intentionally excluded from the changed-file gate

- `package-lock.json`
- `*.tsbuildinfo`
- `node_modules/`, `.next/`, generated Firebase hosting artifacts

## Commands

```bash
npm run format:changed
npm run format:changed:check
```
