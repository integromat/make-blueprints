# Contributing a blueprint

Every published blueprint is, in effect, training data for AI assistants — quality beats quantity. One pattern = one lesson, as small as possible.

## Workflow

1. **Build and test the scenario in Make.** It must actually run.
2. **Export it**: scenario editor → bottom toolbar **⋯ → Export Blueprint**.
3. **Sanitize** the export into the publishable authoring subset:

   ```sh
   node scripts/sanitize.mjs export.json -o patterns/<slug>/blueprint.json
   ```

   The script strips connections, webhooks, resource IDs and exporter-only metadata, and warns about anything that looks like a secret, an e-mail, or an internal URL. **Resolve every warning by hand** — replace real endpoints with `https://api.example.com/...`, real names with generic ones.
4. **Describe it**: add `patterns/<slug>/README.md` (what it teaches, module table, after-import steps — copy the format of an existing pattern) and an entry in `index.json`.
5. **Regenerate the index**: `node scripts/build-index.mjs`.
6. **Validate**: `node scripts/validate.mjs` must pass — CI runs the same check on your PR.
7. **Optionally validate live**: `MAKE_ZONE=https://<zone>.make.com node scripts/validate-live.mjs` checks every module identifier against the real Make app catalog via the public validation endpoint (once enabled on the zone). CI runs this automatically when the `MAKE_ZONE` repository variable is set.

## The quality bar

- Demonstrates **one** structural concept; no kitchen sinks.
- Only verified module identifiers (from your own export — never typed from memory).
- No connections, webhooks (`hook`), data store / spreadsheet / channel IDs, or team-specific anything. Connection-type parameters are omitted entirely, not filled with placeholders.
- Example URLs use `example.com` domains; example data is generic.
- `metadata.designer` coordinates laid out sanely (x step 300; branches offset in y).
- Reviewed by a maintainer by importing into a real Make account and eyeballing the result in the editor.
