# Customer Portal Phase 2 session design

**ENVIRONMENT=EMULATOR**  
**Checkpoint:** P2-S2 verified

## Boundary

Portal authentication uses the dedicated `__portal_session` cookie. It is separate from the staff `__session` cookie and must never create staff authorization.

| Cookie             | Audience        | Used by                                                      |
| ------------------ | --------------- | ------------------------------------------------------------ |
| `__session`        | Staff CRM       | `/app`, `/creator`, staff tRPC (`protectedProcedure`)        |
| `__portal_session` | Customer portal | Portal tRPC (`portalPublicProcedure`), `/api/portal/session` |

`portalPublicProcedure` explicitly clears `ctx.auth` so a staff session cannot authorize portal data APIs. Staff procedures require `ctx.auth` and ignore portal cookies.

## Cookie and token

- Name: `__portal_session`
- `HttpOnly`
- `Secure` outside local development (`NODE_ENV=production`)
- `SameSite=Lax`
- `Path=/`
- 12-hour absolute TTL
- Signed server-side payload: organization, customer, portal account, portal user, role, enabled features, `sessionVersion`, issued/expiry, opaque `jti`

Verification checks account/user ownership, active states, revocation, tenant/customer alignment, signature, expiry, and current `sessionVersion`. Incrementing account or user `sessionVersion` invalidates older cookies.

## Authorization precedence (P2-S2)

`requirePortalAuthorized`:

1. If `sessionToken` (from cookie) verifies → use that acting portal user.
2. Else if magic `token` verifies → use primary portal user for that access token.
3. Else deny.

Magic URL tokens remain valid for bookmarks and compatibility. Portal UI establishes `__portal_session` after successful dashboard load, QR OTP verify, and invitation claim (`establishSession` / session API).

## API

`/api/portal/session`:

- `POST`: magic access token → `establishPortalSessionFromAccessToken` → set cookie
- `GET`: verify cookie → sanitized context
- `DELETE`: clear cookie (logout)

tRPC context (`apps/web/.../api/trpc`) reads `__portal_session` into `ctx.portalSessionToken`.

Staff:

- `portal360.logoutAllSessions` → `invalidatePortalSessions` for the customer account
- `portal360.changeUserRole` → role update + session invalidation

Lifecycle invalidation already on suspend / revoke / rotate; role change and logout-all added in S2.

## UI

- `PortalAuthedFrame` calls `establishPortalSessionCookie` after dashboard success
- QR access page establishes session before redirect
- Portal shell **Sign out** clears cookie and returns to `/portal/login`

## Compatibility

- Dual-write `customers.portalToken` retained
- Token remains in portal URLs for Phase 2
- Session-first UI without URL tokens is a later cutover (not S2)

**NO DEPLOYMENT.**
