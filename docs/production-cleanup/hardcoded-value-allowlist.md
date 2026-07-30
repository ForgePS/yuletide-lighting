# Hardcoded-value allowlist (reviewed)

**Reviewer:** Auto (P0.1 remediation)  
**Review date:** 2026-07-30  
**Source report:** `docs/production-cleanup/hardcoded-value-report.md` (21 findings)

Classification key: Technical constant | Stable internal key | Test fixture | Migration value | Editable platform default | Editable tenant setting | Invalid hardcoded business value | False positive

| File | Line / pattern | Value | Classification | Reason |
|------|----------------|-------|----------------|--------|
| `apps/web/src/app/sign-in/forgot-password/page.tsx` | 57 | `you@company.com` | False positive | UI placeholder hint, not a business contact |
| `apps/web/src/app/sign-in/page.tsx` | 210 | `you@company.com` | False positive | UI placeholder hint |
| `apps/web/src/app/sign-up/page.tsx` | 80 | `you@company.com` | False positive | UI placeholder hint |
| `apps/web/src/components/creator/subscription-control-panel.tsx` | 188 | `$75/mo` | Editable platform default | Mirrors `SUBSCRIPTION_PRICING`; Creator SaaS plan label |
| `apps/web/src/components/creator/subscription-control-panel.tsx` | 189 | `$750/yr` | Editable platform default | Mirrors `SUBSCRIPTION_PRICING`; Creator SaaS plan label |
| `apps/web/src/components/settings/subscription-settings-page.tsx` | 260 | `$75` / `$750` / `save $150` | Editable platform default | Same SaaS plan catalog copy |
| `apps/web/src/components/settings/subscription-settings-page.tsx` | 361 | `min={50}` | Technical constant | Input step constraint for promo amount editor |
| `apps/web/src/lib/portal-qr.ts` | 382 | `hello@yuletidelighting.com` | Editable tenant setting | Fallback only; prefer org company/support settings — Phase 2 config wiring |
| `apps/web/src/lib/report-utils.ts` | 23 | `$1,000` | False positive | Example natural-language prompt string, not a threshold |
| `packages/firebase/src/inventory360.ts` | 658 | `$500` | False positive | Example query string in assistant fallback |
| `packages/types/src/billing.ts` | 14 | `7500` / `$75 / month` | Editable platform default | Canonical SaaS subscription catalog |
| `packages/types/src/billing.ts` | 15 | `75000` / `$750 / year` | Editable platform default | Canonical SaaS subscription catalog |
| `packages/types/src/creator.ts` | 240 | `support@yuletide.com` | Editable platform default | `DEFAULT_PLATFORM_SETTINGS`; overridable via Creator |
| `packages/types/src/reports.ts` | 374 | `$1,000` overdue alert | Editable platform default | Heuristic report helper threshold pending configurable report settings |
| `packages/types/src/reports.ts` | 376 | `$1,000` overdue answer | Editable platform default | Same heuristic helper string |
| `packages/types/src/website-cms-defaults.ts` | 36 | `$48,250` | Editable platform default | Marketing CMS seed KPI; editable in Website CMS |
| `packages/types/src/website-cms-defaults.ts` | 139 | `$75` | Editable platform default | CMS seed plan price |
| `packages/types/src/website-cms-defaults.ts` | 144 | `$7/mo` | Editable platform default | CMS seed add-on copy |
| `packages/types/src/website-cms-defaults.ts` | 154 | `$750` | Editable platform default | CMS seed yearly price |
| `packages/types/src/website-cms-defaults.ts` | 155 | `$62.50/mo` | Editable platform default | CMS seed period copy |
| `packages/types/src/website-cms-defaults.ts` | 156 | `Save $150` | Editable platform default | CMS seed badge copy |

## Summary

- **Total findings:** 21  
- **False positives:** 5  
- **Technical constants:** 1  
- **Editable platform defaults:** 14  
- **Editable tenant settings:** 1  
- **Invalid hardcoded business values (blocker):** 0  
- **Corrected violations this phase:** 0 (none were invalid tenant business hardcoding)  
- **Remaining warnings:** Phase 0.1 allowlist review complete; migrate platform defaults into config registry in Phase 2  

No invalid tenant holiday-lighting business prices/taxes remain unclassified. Platform SaaS pricing and CMS seeds remain code defaults pending Phase 2 configuration registry migration (explicitly allowed as platform defaults during P0.1).
