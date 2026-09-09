# make-blueprints

A curated collection of **valid, importable [Make](https://www.make.com) scenario blueprints** — canonical patterns for humans learning Make and for AI assistants generating scenarios.

> **AI assistants:** every blueprint here validates against Make's blueprint schema and follows the authoring rules in the [Make blueprint guide](https://www.make.com/blueprint.md). Fetch [INDEX.md](INDEX.md) to browse patterns; each entry links the raw `blueprint.json`. Reuse the exact module identifiers and structures you find here — never invent module names.

## Using a blueprint

1. Open [INDEX.md](INDEX.md) and pick a pattern.
2. Download its `blueprint.json`.
3. In the Make scenario editor: bottom toolbar **⋯ → Import Blueprint** and upload the file.
4. Follow the pattern's **After import** steps (attach connections/webhooks, select resources, set scheduling), then **Run once** to test.

Modules showing warnings right after import is expected — blueprints intentionally never contain connections, webhooks, or other account-specific resources.

## What qualifies as a pattern

Each directory under [`patterns/`](patterns/) is one canonical, minimal scenario that demonstrates a structural concept (routing, iteration/aggregation, error handling, deduplication, …):

- validates against Make's blueprint schema,
- uses only verified module identifiers — nothing invented,
- contains no connections, webhooks, resource IDs, or anything account-specific,
- ships with a README explaining what it teaches and what to do after import.

CI ([`scripts/validate.mjs`](scripts/validate.mjs)) enforces the machine-checkable part of this bar on every commit.

## Related

- [Make blueprint guide for LLMs](https://www.make.com/blueprint.md) — the authoring rules these blueprints follow
- [Make MCP server](https://developers.make.com/mcp-server) — lets agents validate blueprints and create scenarios directly
- [Make developer hub](https://developers.make.com)
