#!/usr/bin/env node
// Validates every blueprint in patterns/ against Make's public blueprint-validation
// endpoint (POST /api/v2/blueprints/validate) — the live complement to the structural
// checks in validate.mjs. The endpoint verifies module existence against the real Make
// app catalog and returns fix instructions, so this catches hallucinated or misspelled
// module identifiers that no offline check can.
//
// The endpoint is unauthenticated but zone-gated by a feature flag (403 when off).
//
// Usage: MAKE_ZONE=https://eu1.make.com node scripts/validate-live.mjs
//    or: node scripts/validate-live.mjs https://eu1.make.com

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATTERNS_DIR = join(ROOT, 'patterns');

const base = (process.argv[2] ?? process.env.MAKE_ZONE ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('Usage: MAKE_ZONE=https://<zone>.make.com node scripts/validate-live.mjs');
  console.error('The zone must have public blueprint validation enabled.');
  process.exit(2);
}
const endpoint = `${base}/api/v2/blueprints/validate`;

let failures = 0;
const fail = (ctx, msg) => { failures++; console.error(`FAIL ${ctx}: ${msg}`); };

const dirs = readdirSync(PATTERNS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const slug of dirs) {
  const ctx = `patterns/${slug}`;
  const bpPath = join(PATTERNS_DIR, slug, 'blueprint.json');
  if (!existsSync(bpPath)) { fail(ctx, 'missing blueprint.json'); continue; }

  const blueprint = JSON.parse(readFileSync(bpPath, 'utf8'));

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blueprint }),
    });
  } catch (e) {
    fail(ctx, `request failed: ${e.message}`);
    continue;
  }

  if (res.status === 403) {
    console.error(`Public blueprint validation is disabled on ${base} (feature flag off).`);
    process.exit(2);
  }
  if (res.status === 429) { fail(ctx, 'rate limited (429) — re-run later'); continue; }
  if (!res.ok) { fail(ctx, `unexpected HTTP ${res.status}`); continue; }

  const body = await res.json();
  if (typeof body.valid !== 'boolean') {
    fail(ctx, `unexpected response shape: ${JSON.stringify(body).slice(0, 200)}`);
    continue;
  }
  if (!body.valid) {
    for (const err of body.errors ?? []) {
      fail(ctx, `${err.path}: ${err.problem} — ${err.fix}`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} live check(s) failed.`);
  process.exit(1);
}
console.log(`OK — ${dirs.length} blueprint(s) passed live validation against ${base}.`);
