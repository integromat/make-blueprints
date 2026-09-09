# Webhook to HTTP

The minimal Make scenario: an instant webhook trigger receives data and one HTTP action forwards it to a REST API. Start here to see the smallest valid blueprint shape.

**Teaches**

- The required top-level structure: `name`, `flow`, `metadata`.
- Instant trigger via `gateway:CustomWebHook` with the `hook` parameter omitted — webhooks are attached by the user after import, never created by a blueprint.
- Dynamic values (`{{1.email}}`) belong in `mapper`; `parameters` stays empty here.

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger |
| `http:MakeRequest` | 4 | POST to an external API |

**After import**

1. Open module 1 and create/select a webhook.
2. Replace `https://api.example.com/leads` with your endpoint.
3. Run once and send a test request to the webhook URL.
