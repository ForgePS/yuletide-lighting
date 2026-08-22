# YL-S22 — Public token / security

## Problem

CRM public links (`/p` `/a` `/pay` `/review` `/m`) accepted any string via `getByPublicToken` (including empty/short tokens). Zod bars were inconsistent (`min(1)` vs `min(8)`). Stripe checkout only required length ≥ 8. Client Firestore mirrors were already deny-all.

## Changes

- Shared helpers + `publicAccessTokenSchema`
- Fail-closed Admin SDK lookups and aligned public/API/checkout inputs
- Staff rotate mutations for proposal/invoice tokens

## Verification

Unit suite **310/310**. No production deploy. HASH_ONLY / live cross-org remain backlog.
