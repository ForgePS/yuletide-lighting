# YL-S13 — Billing / payments

## Problem

Stripe invoice success wrote non-canonical payment/status paths; safe-mode checkout did not close the AR loop; pay/portal payable amounts drifted; staff invoice UIs crashed or showed raw status on null/legacy values.

## Changes

- Shared `invoicePayableCents` / `inferInvoicePaymentType` / `formatInvoiceStatusLabel` (+ `canceled`→`cancelled`)
- Webhook + safe-mode checkout → `recordInvoicePayment360`
- Pay page + portal billing aligned on payable cents
- Staff invoice labels null-safe

## Verification

Unit suite **272/272**. No production deploy / no live Stripe.
