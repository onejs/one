import { readFileSync, writeFileSync, symlinkSync } from 'node:fs'
const root = '/private/tmp/one-footer-navigation'
const script = readFileSync(`${root}/benchmark-site.mjs`, 'utf8')
writeFileSync(`${root}/benchmark.mjs`, script.replace("execFileSync('git',['rev-parse','HEAD'],{cwd:site.cwd,encoding:'utf8'}).trim()", "site.name === 'one' ? '5ae610515' : 'd4b0454f6'"))
try { symlinkSync('/Volumes/Studio-Ext/worktrees/one-start-footer-hmr-sol/node_modules', `${root}/node_modules`) } catch {}
for (const target of ['exports/build.mjs', 'exports/build.native.js']) {
  const file = `${root}/one/node_modules/vxrn/dist/${target}`
  const code = readFileSync(file, 'utf8')
  if (!code.includes('Error.stackTraceLimit = Number.POSITIVE_INFINITY;')) throw new Error(file)
  writeFileSync(file, code.replace('Error.stackTraceLimit = Number.POSITIVE_INFINITY;', ''))
}
