# Data store dedupe

Processes each incoming record exactly once. A Make data store remembers which keys were already seen; records that already exist are silently dropped. The standard idempotency pattern for webhooks and polling sources that can deliver duplicates.

**Teaches**

- `datastore:ExistRecord` → filter on `{{2.exist}}` (`boolean:equal` / `false`) → `datastore:AddRecord` is the check-then-set sequence.
- The `datastore` parameter (which data store to use) is a **resource selector and is omitted** — like connections, the user picks it after import.
- `datastore:AddRecord` shape: `key`, nested `data` object, `overwrite: false`.
- `{{now}}` as a timestamp value.

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger, payload with a stable `id` |
| `datastore:ExistRecord` | 1 | Has this key been seen? |
| `datastore:AddRecord` | 1 | Remember the key (filtered: only new) |
| `http:MakeRequest` | 4 | Forward the new record |

**After import**

1. Open module 1 and create/select a webhook.
2. Create a data store (fields: `email` text, `processedAt` date) and select it in modules 2 and 3.
3. Replace the example URL.
