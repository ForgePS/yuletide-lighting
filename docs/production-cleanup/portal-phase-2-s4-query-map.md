# Portal Phase 2 S4 query map

**ENVIRONMENT=EMULATOR. NO DEPLOYMENT.**

Classifications: `SAFE_CANONICAL` is directly customer-scoped; `SAFE_WITH_COMPATIBILITY` preserves a reviewed legacy/public-token path; `REQUIRES_REMEDIATION` and `BLOCKER` may not ship.

| Portal surface                                       | Canonical constraint                           | Classification          |
| ---------------------------------------------------- | ---------------------------------------------- | ----------------------- |
| Dashboard proposals/invoices/jobs/properties/mockups | `customerId == authorized customer`            | SAFE_CANONICAL          |
| Dashboard calendar                                   | calendar `customerId == authorized customer`   | SAFE_CANONICAL          |
| Timeline                                             | customer + `customerVisible == true`           | SAFE_CANONICAL          |
| Notifications                                        | `portalUserId == acting user`                  | SAFE_CANONICAL          |
| Contacts, service issues, agreements, reviews        | `customerId == authorized customer`            | SAFE_CANONICAL          |
| Documents                                            | `listCustomerDocuments360(org, customer)`      | SAFE_CANONICAL          |
| Storage, referrals, rebook                           | customer-scoped helper APIs                    | SAFE_CANONICAL          |
| Messages                                             | conversation lookup by authorized customer     | SAFE_CANONICAL          |
| Properties, consultations, takedowns                 | authorized customer query/helper               | SAFE_CANONICAL          |
| Invoice/proposal/job lists                           | `colListByCustomerId`                          | SAFE_CANONICAL          |
| Job detail                                           | record ownership assertion / generic not-found | SAFE_CANONICAL          |
| `/pay`, `/p`, agreement links                        | separate resource public tokens                | SAFE_WITH_COMPATIBILITY |
| Organization scan fallbacks                          | prohibited by static gate                      | BLOCKER if introduced   |

No current `REQUIRES_REMEDIATION` or `BLOCKER` item is accepted by S4.
