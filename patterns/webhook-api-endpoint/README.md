# Webhook API endpoint

Turns a scenario into a synchronous HTTP API: a request arrives at the webhook URL and `gateway:WebhookRespond` returns a custom JSON response to the caller.

**Teaches**

- `gateway:WebhookRespond` sends the HTTP response for the scenario's webhook trigger — status, body and custom headers all live in `mapper`.
- Response headers use `key`/`value` pairs (unlike the HTTP module's `name`/`value`) and `status` is a string (`"200"`).
- Without a WebhookRespond module, webhook callers get an immediate generic `200 Accepted`; with it, the caller waits for the scenario.
- Works well combined with an `onerror` handler that responds with `"400"` and an error body (see the error-handler patterns).

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger |
| `gateway:WebhookRespond` | 1 | Return `200` + JSON to the caller |

**After import**

1. Open module 1 and create/select a webhook.
2. In the webhook's settings, the response is produced by module 2 — test with `curl <webhook-url>?email=test@example.com`.
