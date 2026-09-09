# Lead intake — webhook, router, HTTP

Receives a lead via webhook and routes it: hot leads (`score > 50`) are POSTed to an external API with errors ignored, all leads are stored in a variable for downstream use. The canonical multi-branch scenario, identical to the complete example in the [blueprint guide](https://www.make.com/blueprint.md).

**Teaches**

- Router shape: `"mapper": null`, no filter on the router itself, conditions live on the **first module inside** each route.
- A fallback route simply has no `filter` key on its first module.
- Error handling: `onerror` on the module that may fail, ending with `builtin:Ignore`.
- Unique module ids across the whole blueprint, including inside routes and error handlers.

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger |
| `builtin:BasicRouter` | 1 | Two routes: filtered + fallback |
| `http:MakeRequest` | 4 | POST hot leads (with error handler) |
| `builtin:Ignore` | 1 | Swallow API errors |
| `util:SetVariable2` | 1 | Store the lead on the fallback route |

**After import**

1. Open module 1 and create/select a webhook.
2. Replace the example URL and adjust filter fields to your payload.
