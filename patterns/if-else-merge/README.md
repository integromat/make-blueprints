# If-else with merge

Branches on the order priority, builds a different message in each branch, then joins both branches back into a single flow that makes one API call. The purpose-built alternative to router workarounds for exclusive branching that must converge again.

**Teaches**

- `builtin:BasicIfElse` uses **`branches`, not `routes`**, and `"mapper": null`. Each branch has a `type`: `"condition"` (requires `conditions` in the same OR-of-ANDs form as filters) or `"else"` (no `conditions`, at most one).
- Branches are evaluated **in order and exactly one executes** — unlike a router, where every matching route runs.
- A branch with `"merge": true` continues into `builtin:BasicMerge`, which must be the **very next module** after the if-else. Branches without `merge` end the path after their flow completes.
- `BasicMerge` (`"mapper": null`) defines `outputs`: each output has a `name` and a `mappings` array with **one entry per `merge: true` branch, in branch order**. Downstream references it as `{{5.message}}`.
- An optional `filters` array on the merge (same length as `mappings`, `null` entries allowed) can gate merged output per branch.
- Do not nest routers or other if-else modules inside merged branches — the platform rejects the ambiguous merge semantics.
- A `condition` branch with empty/missing `conditions` or an empty `flow` is silently **disabled** — never publish such branches.

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger, payload `{"orderId", "priority"}` |
| `builtin:BasicIfElse` | 1 | Two branches: `priority = high` + else |
| `util:ComposeTransformer` | 1 | Build the message (one per branch) |
| `builtin:BasicMerge` | 1 | Rejoin: output `message` from either branch |
| `http:MakeRequest` | 4 | Single POST with the merged message |

**After import**

1. Open module 1 and create/select a webhook.
2. Replace the example URL; send test payloads with `priority` set to `high` and anything else.
