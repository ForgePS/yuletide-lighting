# Duplicate data paths

| Domain           | Canonical           | Duplicate / legacy     | Risk                      | Migration plan doc                   |
| ---------------- | ------------------- | ---------------------- | ------------------------- | ------------------------------------ |
| Properties       | org `properties`    | customer `properties`  | Split brain reads         | `data-migration-plan.md` §properties |
| Jobs             | org `jobs`          | customer `jobs`        | Split brain reads         | §jobs                                |
| Messages         | `conversations`     | `messageThreads`       | Incomplete thread history | §messages                            |
| Proposals public | proposals360 public | legacy proposal public | Token scope drift         | §proposals                           |
| Invoices public  | invoices360 public  | legacy invoice public  | Token scope drift         | §invoices                            |

## Policy

- Stop new writes to legacy paths once domain migrates.
- Compatibility readers only when required; emit deprecation metrics.
- No silent merge of conflicting records.
