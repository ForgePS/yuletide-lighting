# Mapbox staging verification

**Status:** Checklist — execute on staging; do not commit tokens  
**Public token only:** `NEXT_PUBLIC_MAPBOX_TOKEN` (`pk.*`)  
**Secret tokens:** server-only, never `NEXT_PUBLIC_*`

| Scenario                                 | Expected                          | Result |
| ---------------------------------------- | --------------------------------- | ------ |
| Missing token, maps not required         | App operational, MapUnavailable   | ☐      |
| Missing token, `MAP_FEATURES_REQUIRED=1` | Deploy/check fails                | ☐      |
| Valid public token                       | Map renders                       | ☐      |
| Invalid token                            | MapUnavailable / controlled error | ☐      |
| Provider request failure                 | Controlled error                  | ☐      |
| Token in server logs                     | Must not appear                   | ☐      |
| Secret token in browser                  | Must not appear                   | ☐      |

Local development may warn with empty token (production:check warning).
