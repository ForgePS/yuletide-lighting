# Portal Phase 2 S4 ownership model

**ENVIRONMENT=EMULATOR.**

Authoritative scope is `{ organizationId, customerId, portalAccountId, portalUserId }`, extracted from `PortalAuthorizedContext` by `getPortalResourceScope`. The client may provide only a portal token or dedicated session token plus the requested operation; client organization/customer fields are ignored.

`requirePortalOwnedRecord` fails closed when a record is missing, lacks `customerId`, belongs to another customer, or declares another organization. Public callers receive `PORTAL_RESOURCE_NOT_FOUND`; internal reason codes are reserved for sanitized telemetry.

List ownership is enforced in the datastore query. Detail ownership is checked again after loading. Nested properties and calendar rows must also match the authorized customer. Payment/signing routes use their own `/pay` and `/p` public resource tokens and do not grant portal ownership by ID.
