# Portal Phase 2 S3 — Invitation Map

**ENVIRONMENT:** EMULATOR

## Paths and records

| Area                       | Current path                                                                    |
| -------------------------- | ------------------------------------------------------------------------------- |
| Staff create/resend/revoke | `portal360Router.inviteUser`, `resendInvitation`, `revokeInvitation`            |
| Core implementation        | `packages/firebase/src/portal-invitation.ts`                                    |
| Record                     | `organizations/{orgId}/portalUsers/{portalUserId}`                              |
| Secret storage             | `invitationTokenHash`; raw token returned once to emulator delivery boundary    |
| Public claim               | `portal360Router.public.claimInvitation`                                        |
| Claim schema               | `portalClaimInvitationSchema` accepts invitation token + Firebase ID token only |
| Claim UI                   | `/portal/invite/[token]`                                                        |
| Session handoff            | claim creates a session token; `/api/portal/session` sets `__portal_session`    |

## Invitation forms

- Portal-user invitation: role-aware, email-addressed invitation stored on `portalUsers`.
- Resend replacement: old pending invitation becomes `REPLACED`; a new pending record and token are issued.
- Legacy portal magic link: account access token on `portalAccounts` / `customers.portalToken`; migration is deferred.
- QR activation link: separate `portalQrCodes` token lifecycle and OTP verification path.

## Authority and gaps

- Staff context supplies organization and actor; staff-only schema supplies customer and role.
- Public claim derives `authUserId` from a verified Firebase ID token and derives org/customer/role from the invitation record.
- S3 closes hash-at-rest, expiry, revoke, replacement, atomic claim, generic errors, and minimal claim UI.
- Legacy plaintext magic-token migration, live delivery, production rollout, and distributed production rate limiting remain out of scope.
