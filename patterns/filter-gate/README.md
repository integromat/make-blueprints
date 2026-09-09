# Filter gate

Continues only for bundles that match a condition — leads with `score > 50` are forwarded, everything else stops silently. The right tool when there is no "else" branch.

**Teaches**

- Use a plain **filter, not a router**, for a simple yes/no gate.
- The filter sits on the **downstream** module (the one it guards) — never on the trigger.
- Filter shape: `conditions` is an array of OR-groups, each inner array AND-ed; numeric comparison uses `number:greater` with a string `b` value.

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger |
| `http:MakeRequest` | 4 | POST, guarded by the filter |

**After import**

1. Open module 1 and create/select a webhook.
2. Replace the example URL and adjust the filter condition to your field names.
