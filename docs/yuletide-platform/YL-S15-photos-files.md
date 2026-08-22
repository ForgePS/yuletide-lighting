# YL-S15 — Photos / files

## Problem

Staff Admin upload/proxy bypassed Storage rules (no MIME/size/path sanitization); portal treated missing document visibility as customer-visible; storage UI lacked null-safe labels; HEIC passed Zod then failed upload; storage photos were never ticketed; external HTTPS returned previewable with null URL.

## Changes

- Shared staff Storage path + upload contract helpers
- Document visibility fail-closed + explicit create defaults
- Null-safe storage labels
- Portal HEIC align, ticketed storage photos, deny unticketable URLs

## Verification

Unit suite **284/284**. No production Storage deploy.
