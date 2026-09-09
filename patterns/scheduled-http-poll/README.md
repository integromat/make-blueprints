# Scheduled status poll

Fetches a status endpoint on a schedule and posts an alert when the reported status is not `ok`. A polling scenario with no trigger module at all.

**Teaches**

- Scenarios that run on a schedule need **no trigger module** — any action module can be first. There is no "scheduler module"; scheduling is configured in the editor, outside the blueprint.
- The HTTP module with `parseResponse: true` exposes the parsed body as `{{1.data...}}`.
- A filter guards the downstream module (`text:notequal`), never the first module.
- One `formatDate()` call with the full format string for timestamps.

**Modules**

| Module | Version | Role |
|---|---|---|
| `http:MakeRequest` | 4 | GET the status endpoint (first module — no trigger) |
| `http:MakeRequest` | 4 | POST an alert, filtered |

**After import**

1. Replace both example URLs with your endpoints.
2. Set the schedule in the editor (e.g. every 15 minutes) and activate.
