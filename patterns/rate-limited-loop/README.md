# Rate-limited loop

Iterates over an array of items and calls an external API once per item, pausing between calls with `util:FunctionSleep` to respect the target API's rate limit.

**Teaches**

- After an iterator, **every** downstream module runs once per item — placing a Sleep inside the loop paces all following calls.
- `util:FunctionSleep` takes `duration` in seconds (1–300) in `mapper`.
- Mapped values can be embedded inside other mapper strings: the URL itself contains `{{2.id}}`.
- Long sleeps burn scenario execution time; for large volumes prefer splitting work across scheduled runs or queueing via a data store.

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger, payload `{"items": [{"id", "email"}]}` |
| `builtin:BasicFeeder` | 1 | Iterate `{{1.items}}` |
| `util:FunctionSleep` | 1 | Pause 1s per item |
| `http:MakeRequest` | 4 | PUT per item |

**After import**

1. Open module 1 and create/select a webhook.
2. Replace the example URL and tune the sleep duration to the API's limits.
