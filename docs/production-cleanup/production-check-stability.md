# Production check stability (P0.2C)

## Prior flake

Under full `production:check` load, the Firebase rules suite once failed while the same suite passed when run alone.

### Root cause

- `npm run test:integration` and `npm run test:firebase-rules` both use `firebase emulators:exec` against shared ports **8080 / 9199**.
- Under full-gate load, emulator shutdown after one suite can leave ports briefly occupied or leave orphaned Java emulator processes before the next suite starts.
- Assertion failures were not the intermittent failure mode; startup/port contention was.

### Corrections applied

1. Run Firebase rules **before** integration inside `production:check` (serial emulator suites).
2. Wait for ports 8080/9199/4400 to be free between emulator suites.
3. Capture suite stdout/stderr for classification.
4. Allow **at most one** targeted retry only when the failure matches infrastructure patterns (`EADDRINUSE`, emulator failed to start, etc.).
5. Never retry pure Vitest assertion failures as infrastructure failures.
6. Document original failure when a retry succeeds (WARN, not silent).

## Consecutive full runs (acceptance batch)

Date: 2026-07-31  
Command: `npm run production:check`  
Working tree: format gate clean before batch

| Run | Exit | Launch blockers | Firebase rules | Result |
| --- | ---: | --------------: | -------------- | ------ |
| 1   |    0 |               0 | PASS           | passed |
| 2   |    0 |               0 | PASS           | passed |
| 3   |    0 |               0 | PASS           | passed |
| 4   |    0 |               0 | PASS           | passed |
| 5   |    0 |               0 | PASS           | passed |

**Acceptance:** five consecutive full runs, zero blockers, no Firebase rules flake, consistent exit code 0.

### Earlier diagnostic batch (not acceptance)

An earlier five-run loop saw Run 1 PASS and Runs 2–5 FAIL on `format-changed` only (docs written mid-loop were unformatted). Firebase rules still **PASS**ed on every run in that batch — confirming the prior emulator flake is corrected. After `npm run format:changed`, the acceptance batch above passed 5/5.
