import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpus, totalmem, hostname } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
const root = process.argv[2]
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const names = ['react', 'react-dom', 'tamagui', 'vite', '@vxrn/mdx-rust', 'oxc-transform-react']
const sites = Object.fromEntries(['one', 'start'].map(site => [site, {
  archive: git('rev-parse', site === 'one' ? 'origin/tm/one-site-baseline' : 'origin/tm/tanstack-site'),
  lockHash: hash(join(root, site, 'package-lock.json')),
  versions: Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(join(root, site, 'node_modules', name, 'package.json'))).version])),
  mdxHash: hash(join(root, site, 'node_modules/@vxrn/mdx-rust/dist/index.mjs')),
  compilerHash: hash(createRequire(join(root, site, 'node_modules', site === 'one' ? '@vxrn/compiler' : '@vitejs/plugin-react', 'package.json')).resolve('oxc-transform-react')),
}]))
writeFileSync(join(root, 'evidence/setup/provenance.json'), JSON.stringify({
  host: hostname(), cpu: cpus()[0].model, cores: cpus().length,
  ramBytes: totalmem(), node: process.version, source: git('rev-parse', 'HEAD'),
  skipTypes: true, sites,
}, null, 2) + '\n')
if (JSON.stringify(sites.one.versions) !== JSON.stringify(sites.start.versions) || sites.one.mdxHash !== sites.start.mdxHash || sites.one.compilerHash !== sites.start.compilerHash) throw new Error('fixture package mismatch; see saved provenance')