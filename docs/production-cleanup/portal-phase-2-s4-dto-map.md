# Portal Phase 2 S4 DTO map

**ENVIRONMENT=EMULATOR.**

| Public DTO            | Allowlisted content                                                         |
| --------------------- | --------------------------------------------------------------------------- |
| Customer              | id, name/business name, email, phone                                        |
| Invoice               | id/number, status, public token, public totals/dates                        |
| Proposal              | id/title, status, public token, public subtotal/install/removal dates       |
| Job                   | id/title/stage/type, public schedule/property references                    |
| Job detail            | public scope summary, access notes, package/photos, owned property/schedule |
| Contact               | public contact identity, role/title, phone/email, primary flag              |
| Document              | id/title/category/url/created date                                          |
| Message               | direction/channel/body, attachment/status/read timestamps                   |
| Notification/timeline | explicit display/action and timestamp fields                                |
| Dashboard             | composed allowlisted customer/resource DTOs and public portal settings      |

Prohibited field set: `internalNotes`, `margin`, `profit`, `tokenHash`, `otp`, `otpHash`, `stripeCustomerId`, `sessionVersion`, `laborCost`, `commission`. Raw document spreads or direct `.data()` returns from public paths fail the DTO audit.
