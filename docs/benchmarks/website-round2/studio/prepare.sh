#!/usr/bin/env bash
set -euo pipefail

# run through a heavy window; fixtures are app-only archives, never repo copies.
root=$(git rev-parse --show-toplevel)
cd "$root"
fixtures="$root/.build/website-round2"
mkdir -p "$fixtures/evidence/setup"
bun install --frozen-lockfile > "$fixtures/evidence/setup/source-install.log" 2>&1
for site in one start; do
  (cd "$fixtures/$site" && npm ci --workspaces=false --legacy-peer-deps --no-audit --no-fund) > "$fixtures/evidence/setup/$site-install.log" 2>&1
done
# only javascript outputs are consumed; the prior host hit a compiler declaration error.
SKIP_TYPES=1 bun release --into "$fixtures/one" > "$fixtures/evidence/setup/release-one.log" 2>&1
bun release --skip-build --into "$fixtures/start" > "$fixtures/evidence/setup/release-start.log" 2>&1
node --input-type=module - "$fixtures" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpus, totalmem, hostname } from 'node:os'
import { join } from 'node:path'
const root = process.argv[2]
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const names = ['react', 'react-dom', 'tamagui', 'vite', '@vxrn/mdx-rust', 'oxc-transform-react']
const sites = Object.fromEntries(['one', 'start'].map(site => [site, {
  archive: git('rev-parse', site === 'one' ? 'origin/tm/one-site-baseline' : 'origin/tm/tanstack-site'),
  lockHash: hash(join(root, site, 'package-lock.json')),
  versions: Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(join(root, site, 'node_modules', name, 'package.json'))).version])),
  mdxHash: hash(join(root, site, 'node_modules/@vxrn/mdx-rust/dist/index.mjs')),
}]))
if (JSON.stringify(sites.one.versions) !== JSON.stringify(sites.start.versions) || sites.one.mdxHash !== sites.start.mdxHash) throw new Error('fixture package mismatch')
writeFileSync(join(root, 'evidence/setup/provenance.json'), JSON.stringify({
  host: hostname(), cpu: cpus()[0].model, cores: cpus().length,
  ramBytes: totalmem(), node: process.version, source: git('rev-parse', 'HEAD'),
  skipTypes: true, sites,
}, null, 2) + '\n')
JS
printf 'fixture setup complete\n'
