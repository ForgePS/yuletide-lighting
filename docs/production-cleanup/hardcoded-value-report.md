# Hardcoded-value audit (Phase 0 baseline)

Generated: 2026-07-30T20:08:43.706Z
Suspect lines found: 21 (showing 21)

This is a heuristic scan. Technical constants and reviewed allowlist entries must be curated in later phases.

| File | Line | Kinds | Snippet |
|------|------|-------|---------|
| `apps/web/src/app/sign-in/forgot-password/page.tsx` | 57 | email-like | `placeholder="you@company.com"` |
| `apps/web/src/app/sign-in/page.tsx` | 210 | email-like | `placeholder="you@company.com"` |
| `apps/web/src/app/sign-up/page.tsx` | 80 | email-like | `placeholder="you@company.com"` |
| `apps/web/src/components/creator/subscription-control-panel.tsx` | 188 | currency-like | `<option value="monthly">Monthly ($75/mo)</option>` |
| `apps/web/src/components/creator/subscription-control-panel.tsx` | 189 | currency-like | `<option value="yearly">Yearly ($750/yr)</option>` |
| `apps/web/src/components/settings/subscription-settings-page.tsx` | 260 | currency-like | `<SettingsSection title="Choose a plan" description="Monthly $75 · Yearly $750 (save $150)">` |
| `apps/web/src/components/settings/subscription-settings-page.tsx` | 361 | currency-like | `<input type="number" min={50} step={50} className="input" value={newPromo.amountOffCents} onChange={(e) => setNewPromo({ ...newPromo, amountOffCents: e.target.v` |
| `apps/web/src/lib/portal-qr.ts` | 382 | email-like | `<p>Support: ${escapeHtml(opts.supportPhone ?? '')} ${escapeHtml(opts.supportEmail ?? 'hello@yuletidelighting.com')}</p>` |
| `apps/web/src/lib/report-utils.ts` | 23 | currency-like | `'Show overdue invoices over $1,000',` |
| `packages/firebase/src/inventory360.ts` | 658 | currency-like | `answer: 'Try: "Show items below reorder level", "Show damaged inventory over $500", or "Forecast C9 bulb usage"',` |
| `packages/types/src/billing.ts` | 14 | currency-like | `monthly: { amountCents: 7500, interval: 'month', label: '$75 / month' },` |
| `packages/types/src/billing.ts` | 15 | currency-like | `yearly: { amountCents: 75000, interval: 'year', label: '$750 / year' },` |
| `packages/types/src/creator.ts` | 240 | email-like | `supportEmail: 'support@yuletide.com',` |
| `packages/types/src/reports.ts` | 374 | currency-like | `if (overdue.length) riskAlerts.push('${overdue.length} invoices over $1,000 past due');` |
| `packages/types/src/reports.ts` | 376 | currency-like | `answer: '${overdue.length} overdue invoice(s) over $1,000 totaling $${(overdue.reduce((s, i) => s + i.balanceCents, 0) / 100).toLocaleString()}.',` |
| `packages/types/src/website-cms-defaults.ts` | 36 | currency-like | `{ id: bid(), label: 'Revenue', value: '$48,250', change: '+12%' },` |
| `packages/types/src/website-cms-defaults.ts` | 139 | currency-like | `price: '$75',` |
| `packages/types/src/website-cms-defaults.ts` | 144 | currency-like | `'Additional users $7/mo each',` |
| `packages/types/src/website-cms-defaults.ts` | 154 | currency-like | `price: '$750',` |
| `packages/types/src/website-cms-defaults.ts` | 155 | currency-like | `period: 'per year ($62.50/mo)',` |
| `packages/types/src/website-cms-defaults.ts` | 156 | currency-like | `badge: 'Save $150',` |
