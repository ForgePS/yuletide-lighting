# YL-S27 COMPLETE — Website CMS Phase 1

**Completed:** 2026-08-21  
**Production deploy:** NO  
**Production Firestore writes:** NO

## Shipped

1. **Schedule** — datetime-local when status=scheduled; save passes `scheduledPublishAt`; Inngest cron every 5m flips due pages to published.
2. **Versions** — Version history panel with Restore (existing `pages.versions` / `restoreVersion` API).
3. **Block styles** — padding/width/alignment/visibility/class/id editor; `BlockShell` applies styles on public pages.
4. **Rich text** — TipTap + HTML source toggle for `rich_text` blocks.
5. **Media** — focal point controls; CMS images use `loading="lazy"` + `object-position`.
6. **Global CSS/JS** — Chrome & SEO fields + inject on `CmsPageView`.
7. **Audit** — `customization-audit.ts` updated for Phase 1 rows.

## Follow-on

CMS Phases 2–4 remain deferred (see plan).
