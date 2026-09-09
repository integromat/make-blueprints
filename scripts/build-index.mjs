#!/usr/bin/env node
// Generates INDEX.md from index.json. Run after adding or editing a pattern:
//   node scripts/build-index.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_BASE = 'https://raw.githubusercontent.com/integromat/make-blueprints/main/patterns';

export function buildIndexMd(index) {
  const lines = [
    '# Blueprint index',
    '',
    '> Machine-generated from [index.json](index.json) — do not edit by hand.',
    '> Every blueprint validates against the Make blueprint schema and follows',
    '> the authoring rules in https://www.make.com/blueprint.md.',
    '',
    '| Pattern | Description | Trigger | Demonstrates | Modules |',
    '|---|---|---|---|---|',
  ];
  for (const e of index) {
    lines.push(
      `| [${e.title}](patterns/${e.slug}/) ([raw](${RAW_BASE}/${e.slug}/blueprint.json)) ` +
      `| ${e.description} | ${e.trigger} | ${e.patterns.join(', ')} | ${e.modules.map((m) => `\`${m}\``).join(', ')} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const index = JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8'));
  writeFileSync(join(ROOT, 'INDEX.md'), buildIndexMd(index));
  console.log(`INDEX.md regenerated (${index.length} entries).`);
}
