# Tech Debt Tracker

## How to Use
Track meaningful debt items with an owner, impact, and next action. Keep entries concrete and review regularly.

## Active Debt
| ID | Area | Issue | Impact | Owner | Status | Target | Next Step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TD-001 | Alerting | `apps/api/src/routes/alerts.ts` exists, but no scheduler/notification integration consumes it, so stale data alerts are not delivered proactively. | High: stale ingest can go unnoticed and degrade metrics trust. | Backend (TBD) | Open | 2026-03-15 | Add a scheduled check (or push notification path) and define ownership for alert handling. |
| TD-002 | Data Quality | Current checks focus on missing-day coverage (`/api/data-quality/summary`) and basic parser sanity warnings; anomaly thresholds are not persisted or surfaced as first-class incidents. | Medium: bad upstream data can pass through as plausible trends. | Data pipeline (TBD) | Open | 2026-03-29 | Define threshold rules (calorie/sleep/workout anomalies) and persist quality findings per run. |

## Deferred/Accepted Debt
| ID | Area | Rationale | Revisit Date | Owner |
| --- | --- | --- | --- | --- |
| TD-D01 | Web Deployment Runbook | `docs/DEPLOY_GCP.md` intentionally documents API-only deployment; web hosting target is still undecided. | 2026-04-15 | Platform (TBD) |

## Recently Resolved
| ID | Area | Resolution | Closed On |
| --- | --- | --- | --- |
| TD-003 | Insights Robustness | Pipeline insights path now accepts both unified diff and direct markdown model outputs, matching rerun behavior. | 2026-02-12 |
| TD-004 | Test Coverage | Added web smoke checks (critical pages + auth-route guard contracts) into `@health-agent/api` test suite used by CI. | 2026-02-12 |

## Review Cadence
Review this tracker every two weeks (or at each release cut). Move resolved items into "Recently Resolved" and refresh target dates during planning.
