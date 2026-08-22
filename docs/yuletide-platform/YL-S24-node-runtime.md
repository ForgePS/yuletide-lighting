# YL-S24 — Node / Functions runtime (BACKLOG-009)

## Problem

Firebase `nodejs20` decommissions **2026-10-30**. Repo engines/CI/deploy guidance still pinned Node 20 for Hosting frameworksBackend (Next.js SSR Cloud Function).

## Changes

- Policy helpers + unit tests (`runtime-policy.ts`)
- `engines.node: "22"`, `.nvmrc`, CI Node 22
- Deploy script + `check:node-runtime` warn on mismatch

## Verification

Unit suite **315/315**. No production deploy — next authorized Hosting deploy applies the runtime.
