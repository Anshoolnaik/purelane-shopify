#!/usr/bin/env node
/**
 * Install the Purelane sections into a Dawn theme checkout.
 *
 * This repository is a partial theme on purpose: it has assets, sections,
 * snippets and one template, but no layout, config or locales. Those come from
 * Dawn. Nothing here overwrites a Dawn file except templates/index.json, which
 * is the homepage this build exists to replace.
 *
 * Usage:
 *   node scripts/install-into-dawn.mjs ../dawn
 *   node scripts/install-into-dawn.mjs ../dawn --dry-run
 */

import { readdirSync, statSync, copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const themeRoot = resolve(here, '..', 'theme');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find((a) => !a.startsWith('--')) || '');

const FONT_LINKS = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;

function fail(message) {
  console.error('\n  ' + message + '\n');
  process.exit(1);
}

if (!args.length || args.every((a) => a.startsWith('--'))) {
  fail('Usage: node scripts/install-into-dawn.mjs <path-to-dawn> [--dry-run]');
}

if (!existsSync(target)) {
  fail(`Target does not exist: ${target}`);
}

// A Dawn checkout has a layout/theme.liquid. Refuse to scribble into anything else.
if (!existsSync(join(target, 'layout', 'theme.liquid'))) {
  fail(
    `That does not look like a theme: ${target}\n` +
      '  Expected to find layout/theme.liquid.\n' +
      '  Run `shopify theme pull --store <store>.myshopify.com` first.'
  );
}

console.log(`\n  Purelane -> ${target}${dryRun ? '  (dry run)' : ''}\n`);

let copied = 0;
let overwritten = 0;

for (const folder of ['assets', 'sections', 'snippets', 'templates']) {
  const from = join(themeRoot, folder);
  if (!existsSync(from)) continue;

  const to = join(target, folder);
  if (!existsSync(to) && !dryRun) mkdirSync(to, { recursive: true });

  for (const name of readdirSync(from)) {
    const src = join(from, name);
    if (!statSync(src).isFile()) continue;

    const dest = join(to, name);
    const exists = existsSync(dest);

    if (exists) overwritten++;
    copied++;

    console.log(`  ${exists ? 'replace' : 'add    '}  ${folder}/${name}`);
    if (!dryRun) copyFileSync(src, dest);
  }
}

// The one edit to a Dawn file: the two font families the design uses.
const layoutPath = join(target, 'layout', 'theme.liquid');
const layout = readFileSync(layoutPath, 'utf8');

if (layout.includes('family=Outfit')) {
  console.log('\n  fonts    already present in layout/theme.liquid');
} else if (!layout.includes('</head>')) {
  console.log('\n  fonts    could not find </head> — add the links manually, see SETUP.md');
} else {
  console.log('\n  fonts    adding Outfit + Inter to layout/theme.liquid');
  if (!dryRun) {
    writeFileSync(layoutPath, layout.replace('</head>', FONT_LINKS + '\n</head>'), 'utf8');
  }
}

console.log(
  `\n  ${copied} files (${overwritten} replaced)${dryRun ? ' — nothing written' : ''}\n` +
    '\n  Next:\n' +
    `    cd ${target}\n` +
    '    shopify theme dev --store <your-store>.myshopify.com\n'
);
