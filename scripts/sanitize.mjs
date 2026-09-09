#!/usr/bin/env node
// Converts an exported Make scenario (⋯ → Export Blueprint, or the API/MCP
// scenarios_get response) into the minimal authoring subset this repo publishes:
//
//   - strips connection/webhook/resource bindings (__IMTCONN__, __IMTKEY__,
//     hook, datastore, agent) — these are account-specific and cannot be
//     created by an import
//   - strips exporter-only module metadata (restore, expect, interface,
//     parameters echo, advanced) — designer coordinates are kept
//   - normalizes top-level metadata to { version, scenario, designer.orphans }
//     and drops export extras (scheduling, interface, instant, zone, ...)
//   - warns about strings that look like secrets, e-mails, or internal URLs —
//     review every warning by hand before publishing
//
// Usage: node scripts/sanitize.mjs <exported.json> [-o patterns/<slug>/blueprint.json]

import { readFileSync, writeFileSync } from 'node:fs';

const STRIP_PARAM_KEYS = ['__IMTCONN__', '__IMTKEY__', 'hook', 'datastore', 'agent', 'apiKeyKeychain', 'basicAuthKeychain', 'oAuthAccount', 'proxyKeychain', 'bodyDataStructure'];
const STRIP_MODULE_META = ['restore', 'expect', 'interface', 'parameters', 'advanced'];
const SCENARIO_SETTINGS = ['roundtrips', 'maxErrors', 'autoCommit', 'autoCommitTriggerLast', 'freshVariables'];
const WARN_PATTERNS = [
  [/[A-Za-z0-9._%+-]+@(?!example\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, 'e-mail address'],
  [/https?:\/\/(?!api\.example\.com|status\.example\.com|www\.make\.com|developers\.make\.com)[^\s"']+/g, 'non-placeholder URL'],
  [/(?:api[_-]?key|bearer|token)["\s:=]+[A-Za-z0-9_\-]{20,}/gi, 'credential-looking string'],
  [/\b\d{6,}\b/g, 'long numeric id (team/spreadsheet/channel?)'],
];

function sanitizeModule(mod) {
  const out = { id: mod.id, module: mod.module, version: mod.version };
  if (mod.parameters) {
    out.parameters = Object.fromEntries(
      Object.entries(mod.parameters).filter(([k]) => !STRIP_PARAM_KEYS.includes(k))
    );
  }
  if ('mapper' in mod) out.mapper = mod.mapper;
  if (mod.filter) out.filter = mod.filter;
  const designer = mod.metadata?.designer;
  out.metadata = { designer: { x: designer?.x ?? 0, y: designer?.y ?? 0 } };
  if (mod.onerror) out.onerror = mod.onerror.map(sanitizeModule);
  if (mod.routes) out.routes = mod.routes.map((r) => ({ flow: (r.flow ?? []).map(sanitizeModule) }));
  if (mod.branches) {
    // builtin:BasicIfElse (ADR-0009) — keep the semantic branch fields only
    out.branches = mod.branches.map((b) => {
      const br = { type: b.type };
      if (b.label) br.label = b.label;
      if (b.conditions) br.conditions = b.conditions;
      if (b.merge) br.merge = true;
      if (b.disabled) br.disabled = true;
      br.flow = (b.flow ?? []).map(sanitizeModule);
      return br;
    });
  }
  if (mod.outputs) out.outputs = mod.outputs; // builtin:BasicMerge
  if (mod.filters) out.filters = mod.filters; // builtin:BasicMerge per-branch filters
  return out;
}

function sanitize(input) {
  const bp = input.blueprint ?? input; // accept a scenarios_get response or a bare blueprint
  const out = { name: bp.name ?? 'Untitled pattern' };
  if (bp.description) out.description = bp.description;
  out.flow = (bp.flow ?? []).map(sanitizeModule);
  const settings = bp.metadata?.scenario ?? {};
  out.metadata = {
    version: 1,
    scenario: Object.fromEntries(SCENARIO_SETTINGS.map((k) => [k, settings[k] ?? defaultsFor(k)])),
    designer: { orphans: [] },
  };
  return out;
}

function defaultsFor(key) {
  return { roundtrips: 1, maxErrors: 3, autoCommit: true, autoCommitTriggerLast: true, freshVariables: false }[key];
}

// --- run ---------------------------------------------------------------

const args = process.argv.slice(2);
const inPath = args.find((a) => !a.startsWith('-'));
const outFlag = args.indexOf('-o');
if (!inPath) {
  console.error('Usage: node scripts/sanitize.mjs <exported.json> [-o <output.json>]');
  process.exit(1);
}

const result = sanitize(JSON.parse(readFileSync(inPath, 'utf8')));
const json = JSON.stringify(result, null, 2) + '\n';

let warnings = 0;
for (const [re, label] of WARN_PATTERNS) {
  for (const m of json.matchAll(re)) {
    warnings++;
    console.error(`WARN possible ${label}: "${m[0]}" — replace with a placeholder or remove`);
  }
}

if (outFlag !== -1 && args[outFlag + 1]) {
  writeFileSync(args[outFlag + 1], json);
  console.error(`Written to ${args[outFlag + 1]}${warnings ? ` with ${warnings} warning(s) to resolve` : ''}`);
} else {
  process.stdout.write(json);
}
process.exitCode = warnings ? 2 : 0;
