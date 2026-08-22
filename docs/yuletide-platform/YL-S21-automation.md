# YL-S21 — Automation

## Problem

`fireAutomationTrigger` always also ran messaging `triggerAutomation` (double sends when schedule/callers dual-invoked). Automation hub used raw `.replace` on action types and ungated create/toggle. Postgres `automations` still queryable. No `requireModule('automation')` on automation360.

## Changes

- Shared label + condition helpers; messaging fallback only when no 360 rules for the trigger
- Module + settings RBAC on automation360; UI `settings.edit` gates
- Postgres automations fenced

## Verification

Unit suite **307/307**. No production deploy.
