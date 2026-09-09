#!/usr/bin/env node
// Validates every blueprint in patterns/ against the repo's quality bar,
// and checks index.json and INDEX.md are in sync with the pattern directories.
// Structural rules follow https://www.make.com/blueprint.md — this script is
// the machine-checkable subset of that guide's pre-output checklist.
//
// Usage: node scripts/validate.mjs

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndexMd } from './build-index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATTERNS_DIR = join(ROOT, 'patterns');

const MODULE_ID_RE = /^[a-z][a-z0-9-]*:[A-Za-z0-9]+$/;
const IML_REF_RE = /\{\{\s*`?(\d+)`?\s*[.}]/g;
// Keys that must never appear in a published blueprint: connection/webhook/resource
// bindings are account-specific and cannot be created by an import.
const FORBIDDEN_PARAM_KEYS = ['__IMTCONN__', '__IMTKEY__', 'hook', 'datastore', 'agent', 'apiKeyKeychain', 'basicAuthKeychain', 'oAuthAccount', 'proxyKeychain', 'bodyDataStructure'];
// Exporter-only metadata. Published blueprints stick to the minimal authoring
// subset; designer coordinates are the only module metadata we keep.
const FORBIDDEN_MODULE_META = ['restore', 'expect', 'interface', 'parameters', 'advanced'];
const SECRET_PATTERNS = [
  [/[A-Za-z0-9._%+-]+@(?!example\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'non-example.com email address'],
  [/we\.make\.com|make\.atlassian\.net/, 'internal Make URL'],
  [/(?:api[_-]?key|bearer|token)["\s:=]+[A-Za-z0-9_\-]{20,}/i, 'credential-looking string'],
];

let failures = 0;
const fail = (ctx, msg) => { failures++; console.error(`FAIL ${ctx}: ${msg}`); };

function* walkModules(flow, path = 'flow') {
  for (let i = 0; i < flow.length; i++) {
    const mod = flow[i];
    const ctx = `${path}[${i}]`;
    yield [mod, ctx, i === 0 && path === 'flow'];
    for (let r = 0; r < (mod.routes?.length ?? 0); r++) {
      yield* walkModules(mod.routes[r].flow ?? [], `${ctx}.routes[${r}].flow`);
    }
    for (let b = 0; b < (mod.branches?.length ?? 0); b++) {
      yield* walkModules(mod.branches[b].flow ?? [], `${ctx}.branches[${b}].flow`);
    }
    if (mod.onerror) yield* walkModules(mod.onerror, `${ctx}.onerror`);
  }
}

// ADR-0009: BasicMerge must immediately follow its BasicIfElse; outputs[].mappings
// (and filters, when present) carry one entry per merge:true branch, in branch order.
function checkMergePairing(flow, ctx, path = 'flow') {
  for (let i = 0; i < flow.length; i++) {
    const mod = flow[i];
    const where = `${ctx} ${path}[${i}]`;
    if (mod.module === 'builtin:BasicMerge') {
      const prev = flow[i - 1];
      if (!prev || prev.module !== 'builtin:BasicIfElse') {
        fail(where, 'builtin:BasicMerge must immediately follow a builtin:BasicIfElse');
      } else {
        const mergeCount = (prev.branches ?? []).filter((b) => b.merge === true).length;
        if (mergeCount === 0) fail(where, 'merge module present but no branch of the preceding if-else has merge:true');
        if (mod.mapper != null) fail(where, 'merge mapper must be null or omitted');
        if (!Array.isArray(mod.outputs) || mod.outputs.length === 0) {
          fail(where, 'merge must define an outputs array');
        } else {
          mod.outputs.forEach((o, oi) => {
            if (typeof o.name !== 'string' || !o.name) fail(where, `outputs[${oi}].name is required`);
            if (!Array.isArray(o.mappings) || o.mappings.length !== mergeCount) {
              fail(where, `outputs[${oi}].mappings must have exactly ${mergeCount} entries (one per merge:true branch, in branch order)`);
            }
          });
        }
        if (mod.filters && mod.filters.length !== mergeCount) {
          fail(where, `filters must have exactly ${mergeCount} entries (one per merge:true branch; null = no filter)`);
        }
      }
    }
    if (mod.module === 'builtin:BasicIfElse' && (mod.branches ?? []).some((b) => b.merge === true)) {
      const next = flow[i + 1];
      if (!next || next.module !== 'builtin:BasicMerge') {
        fail(where, 'if-else has merge:true branches — builtin:BasicMerge must be the very next module');
      }
    }
    (mod.routes ?? []).forEach((r, ri) => checkMergePairing(r.flow ?? [], ctx, `${path}[${i}].routes[${ri}].flow`));
    (mod.branches ?? []).forEach((b, bi) => checkMergePairing(b.flow ?? [], ctx, `${path}[${i}].branches[${bi}].flow`));
    if (mod.onerror) checkMergePairing(mod.onerror, ctx, `${path}[${i}].onerror`);
  }
}

function validateBlueprint(slug, bp) {
  const ctx = `patterns/${slug}`;

  const allowedTop = ['name', 'description', 'flow', 'metadata'];
  for (const key of Object.keys(bp)) {
    if (!allowedTop.includes(key)) fail(ctx, `unexpected top-level key "${key}"`);
  }
  if (typeof bp.name !== 'string' || bp.name.length < 1 || bp.name.length > 120) {
    fail(ctx, 'name must be a 1-120 character string');
  }
  if (!Array.isArray(bp.flow) || bp.flow.length === 0) fail(ctx, 'flow must be a non-empty array');
  if (bp.metadata?.version !== 1) fail(ctx, 'metadata.version must be 1');
  if (typeof bp.metadata?.scenario !== 'object') fail(ctx, 'metadata.scenario is required');
  if (!Array.isArray(bp.metadata?.designer?.orphans)) fail(ctx, 'metadata.designer.orphans is required');

  const ids = new Set();
  for (const [mod, mctx, isFirst] of walkModules(bp.flow ?? [])) {
    const where = `${ctx} ${mctx}`;
    if (!Number.isInteger(mod.id) || mod.id < 1) fail(where, `module id must be an integer >= 1 (got ${mod.id})`);
    if (ids.has(mod.id)) fail(where, `duplicate module id ${mod.id}`);
    ids.add(mod.id);
    if (typeof mod.module !== 'string' || !MODULE_ID_RE.test(mod.module)) {
      fail(where, `invalid module identifier "${mod.module}"`);
    }
    if (mod.module === 'placeholder:Placeholder') fail(where, 'placeholder:Placeholder is not a real module');
    if (!Number.isInteger(mod.version) || mod.version < 1) fail(where, 'module version must be a positive integer');

    for (const key of FORBIDDEN_PARAM_KEYS) {
      if (mod.parameters && key in mod.parameters) {
        fail(where, `parameters.${key} must be omitted — connections/webhooks/resources are attached by the user after import`);
      }
    }
    if (mod.metadata) {
      for (const key of Object.keys(mod.metadata)) {
        if (FORBIDDEN_MODULE_META.includes(key)) {
          fail(where, `module metadata.${key} is exporter-only — run scripts/sanitize.mjs`);
        }
      }
      const d = mod.metadata.designer;
      if (!d || typeof d.x !== 'number' || typeof d.y !== 'number') {
        fail(where, 'metadata.designer.x/y coordinates are required');
      }
    } else {
      fail(where, 'metadata.designer is required');
    }

    if (mod.module === 'builtin:BasicRouter') {
      if (mod.mapper !== null) fail(where, 'router mapper must be null');
      if (!Array.isArray(mod.routes) || mod.routes.length === 0) fail(where, 'router must have routes');
      if (mod.filter) fail(where, 'router must not carry a filter — put it on the first module inside a route');
      for (let r = 0; r < (mod.routes?.length ?? 0); r++) {
        if (!Array.isArray(mod.routes[r].flow) || mod.routes[r].flow.length === 0) {
          fail(where, `routes[${r}].flow must be non-empty`);
        }
      }
    }
    if (mod.module === 'builtin:BasicAggregator') {
      if (!Number.isInteger(mod.parameters?.feeder)) fail(where, 'aggregator parameters.feeder must be a module id');
    }
    // ADR-0009: IfElse branch rules
    if (mod.module === 'builtin:BasicIfElse') {
      if (mod.mapper !== null) fail(where, 'if-else mapper must be null');
      if (!Array.isArray(mod.branches) || mod.branches.length === 0) fail(where, 'if-else must have a branches array');
      const branches = mod.branches ?? [];
      if (branches.filter((b) => b.type === 'else').length > 1) fail(where, 'at most one branch may have type "else"');
      branches.forEach((br, b) => {
        if (br.type !== 'condition' && br.type !== 'else') fail(where, `branches[${b}].type must be "condition" or "else"`);
        if (br.type === 'else' && br.conditions) fail(where, `branches[${b}] is an else branch and must not have conditions`);
        if (br.type === 'condition' && (!Array.isArray(br.conditions) || br.conditions.length === 0)) {
          fail(where, `branches[${b}] has empty/missing conditions — the branch would be silently disabled`);
        }
        if (!Array.isArray(br.flow) || br.flow.length === 0) fail(where, `branches[${b}].flow is empty — the branch would be silently disabled`);
        if (br.disabled) fail(where, `branches[${b}] is disabled — do not publish disabled branches`);
        for (const [inner] of walkModules(br.flow ?? [])) {
          if (inner.module === 'builtin:BasicRouter' || inner.module === 'builtin:BasicIfElse') {
            fail(where, `branches[${b}] contains branching module ${inner.module} — prohibited inside if-else branches`);
          }
        }
      });
    }
    if (isFirst && mod.filter) fail(where, 'the first module of a scenario must not have a filter');
  }

  checkMergePairing(bp.flow ?? [], ctx);

  // Aggregator feeders must point at real modules.
  for (const [mod, mctx] of walkModules(bp.flow ?? [])) {
    if (mod.module === 'builtin:BasicAggregator' && !ids.has(mod.parameters?.feeder)) {
      fail(`${ctx} ${mctx}`, `aggregator feeder ${mod.parameters?.feeder} does not reference an existing module id`);
    }
  }

  // Every {{N....}} reference must point at an existing module id.
  // (Upstream-in-same-path checking is intentionally out of scope for v1.)
  const raw = JSON.stringify(bp);
  for (const match of raw.matchAll(IML_REF_RE)) {
    const ref = Number(match[1]);
    if (!ids.has(ref)) fail(ctx, `IML reference {{${ref}....}} points at a non-existent module id`);
  }

  for (const [re, label] of SECRET_PATTERNS) {
    const hit = raw.match(re);
    if (hit) fail(ctx, `possible leak (${label}): "${hit[0]}"`);
  }
}

// --- run ---------------------------------------------------------------

const dirs = readdirSync(PATTERNS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const index = JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8'));
const indexSlugs = index.map((e) => e.slug);

for (const slug of dirs) {
  const bpPath = join(PATTERNS_DIR, slug, 'blueprint.json');
  const readmePath = join(PATTERNS_DIR, slug, 'README.md');
  if (!existsSync(bpPath)) { fail(`patterns/${slug}`, 'missing blueprint.json'); continue; }
  if (!existsSync(readmePath)) fail(`patterns/${slug}`, 'missing README.md');

  let bp;
  try {
    bp = JSON.parse(readFileSync(bpPath, 'utf8'));
  } catch (e) {
    fail(`patterns/${slug}`, `blueprint.json does not parse: ${e.message}`);
    continue;
  }
  validateBlueprint(slug, bp);

  const entry = index.find((e) => e.slug === slug);
  if (!entry) {
    fail(`patterns/${slug}`, 'missing entry in index.json');
  } else {
    for (const field of ['title', 'description', 'trigger', 'patterns', 'modules']) {
      if (!entry[field]) fail(`index.json[${slug}]`, `missing field "${field}"`);
    }
    const used = [...new Set([...walkModules(bp.flow ?? [])].map(([m]) => m.module))].sort();
    if (JSON.stringify(used) !== JSON.stringify([...(entry.modules ?? [])].sort())) {
      fail(`index.json[${slug}]`, `modules list out of sync — blueprint uses: ${used.join(', ')}`);
    }
  }
}

for (const slug of indexSlugs) {
  if (!dirs.includes(slug)) fail('index.json', `entry "${slug}" has no patterns/${slug}/ directory`);
}

const expectedIndexMd = buildIndexMd(index);
const actualIndexMd = existsSync(join(ROOT, 'INDEX.md')) ? readFileSync(join(ROOT, 'INDEX.md'), 'utf8') : '';
if (expectedIndexMd !== actualIndexMd) {
  fail('INDEX.md', 'out of date — run: node scripts/build-index.mjs');
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`OK — ${dirs.length} blueprint(s) passed all checks.`);
