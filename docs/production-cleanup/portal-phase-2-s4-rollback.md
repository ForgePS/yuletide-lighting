# Portal Phase 2 S4 rollback

**ENVIRONMENT=EMULATOR.**

S4 introduces static gates, tests, documentation, and stricter public serialization. It performs no migration or production write.

If a regression is found:

1. Stop the checkpoint; do not deploy.
2. Revert the specific S4 code change while retaining customer-scoped query behavior.
3. Do not restore organization-wide fallback reads or raw public document returns.
4. Re-run both S4 audits and the dedicated emulator suite.
5. Record any required compatibility exception in the fallback register before review.

Data rollback is not applicable because no production data is touched.
