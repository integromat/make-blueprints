# Error handler with logging

Posts an order to an API; when the call fails, the error-handler route logs the failure to a logging endpoint and continues via `builtin:Ignore`. Shows that an error handler can be a full flow, not just a single directive.

**Teaches**

- `onerror` attaches to the module that may fail and contains an ordered flow of handler modules.
- The failing module's error is available inside the handler as `{{2.error.message}}`.
- Handler modules still reference upstream data (`{{1.orderId}}`) — they run in the same path.
- End the handler with a directive: `builtin:Ignore` (skip and continue) here; `builtin:Break` (retry), `builtin:Commit` / `builtin:Rollback` (transactions) are the alternatives.
- Handler modules need unique ids and their own designer coordinates (offset y by +300).

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger |
| `http:MakeRequest` | 4 | Primary API call (may fail) |
| `http:MakeRequest` | 4 | Log the error (inside `onerror`) |
| `builtin:Ignore` | 1 | Continue after logging |

**After import**

1. Open module 1 and create/select a webhook.
2. Replace both example URLs with your API and logging endpoints.
