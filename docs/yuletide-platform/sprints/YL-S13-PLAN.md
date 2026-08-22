# YL-S13 Plan — Billing / payments harden

## Objective

EXTEND/HARDEN customer AR billing (YL-S0 baseline YL-S13): unify Stripe checkout success into `recordInvoicePayment360`, close safe-mode payment loop, align portal/pay payable amounts, null-safe staff invoice labels.

## Authorization

User authorized YL-S13. No production deploy. Live `sk_live` remains blocked.

## Deliverables

1. **Stripe webhook → `recordInvoicePayment360`** — stop writing status `partial` + org-level `payments`
2. **Safe-mode + payable alignment** — safe-mode checkout records payment; pay/portal UI uses `invoicePayableCents`
3. **Null-safe staff invoice labels** — `formatInvoiceStatusLabel` in pipeline/detail/managers/customer-billing
4. **Unit tests** for payable cents, payment type inference, labels

## Out of Scope

- Live Stripe/Connect prod ops, SaaS subscription billing, reminder email/SMS, collections polish, production deploy
