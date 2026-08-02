# Portal Phase 2 S4 fallback register

**ENVIRONMENT=EMULATOR.**

| Path                                         | Failure behavior                                                     | Status                 |
| -------------------------------------------- | -------------------------------------------------------------------- | ---------------------- |
| `colListByCustomerId`                        | Propagates query failure; never scans organization collection        | Approved               |
| Timeline/notifications                       | Returns empty list on index/query failure; never broadens scope      | Approved fail-closed   |
| Dashboard calendar                           | Customer equality query; failure propagates; no all-events catch     | Approved               |
| Portal list readers                          | Customer equality query or reviewed customer helper                  | Approved               |
| Magic access token                           | Compatibility authentication entry point; scope still server-derived | Reviewed compatibility |
| Organization-wide read then in-memory filter | None permitted                                                       | P0 blocker             |

An index failure may reduce availability, but it must never expand the result set.
