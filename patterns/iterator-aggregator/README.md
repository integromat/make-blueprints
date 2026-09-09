# Iterator and Aggregator

Receives an order containing an array of items, processes each item individually, then recombines everything into a single HTTP request. Think of the pair as opening and closing a for-loop.

**Teaches**

- `builtin:BasicFeeder` (Iterator) turns one bundle containing an array into one bundle per item; downstream modules reference item fields as `{{2.name}}`.
- `builtin:BasicAggregator` closes the loop: `parameters.feeder` points at the **module that opened the loop** (the iterator, id 2 — never a module in the middle).
- The aggregator's `mapper` defines each aggregated item's shape; downstream only the aggregator's own output is available (`{{4.array}}`) — modules before the loop are out of scope after aggregation.
- IML over the result: `{{join(map(4.array; "line"); ", ")}}` — semicolon argument separators.
- Forgetting the aggregator is the classic bug: everything downstream fires once per item.

**Modules**

| Module | Version | Role |
|---|---|---|
| `gateway:CustomWebHook` | 1 | Instant trigger, payload `{"items": [{"name", "qty"}]}` |
| `builtin:BasicFeeder` | 1 | Iterate `{{1.items}}` |
| `util:ComposeTransformer` | 1 | Build one text line per item |
| `builtin:BasicAggregator` | 1 | Recombine (`feeder: 2`) |
| `http:MakeRequest` | 4 | Single POST with the joined summary |

**After import**

1. Open module 1 and create/select a webhook.
2. Replace the example URL; send a test payload with an `items` array.
