# Portal Phase 2 S4 DTO evidence

**ENVIRONMENT=EMULATOR.**

Every seeded portal source record includes values under all prohibited S4 field names. The integration suite checks each prohibited field independently across customer, invoice, proposal, job, property, document, contact, message, notification, and job-detail DTOs. It separately verifies the dashboard customer excludes `internalNotes` and `portalToken`.

Timeline and notification readers construct explicit DTOs after reading Firestore data; they no longer cast raw document objects into public types.

Static command: `npm run audit:portal-public-dtos`  
Static result: **PENDING**  
Integration result: **PENDING**
