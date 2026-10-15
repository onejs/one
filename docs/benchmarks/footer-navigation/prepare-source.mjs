import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
const root = '/private/tmp/one-footer-navigation'
for (const name of ['control', 'candidate']) {
  const packageRoot = `${root}/${name}/node_modules/vxrn`
  let count = 0
  const walk = dir => {
    for (const file of readdirSync(dir, {withFileTypes:true})) {
      const path = `${dir}/${file.name}`
      if (file.isDirectory()) walk(path)
      else if (/\/exports\/build\.(?:ts|mjs|cjs|native\.js)$/.test(path)) {
        const code = readFileSync(path, 'utf8')
        const next = code.replace(/Error\.stackTraceLimit\s*=\s*Number\.POSITIVE_INFINITY;?\n/, '')
        if (code === next) throw new Error(`stack-limit assignment missing: ${path}`)
        writeFileSync(path, next); count++
      }
    }
  }
  walk(`${packageRoot}/src`); walk(`${packageRoot}/dist`)
  if (count !== 3) throw new Error(`${name}: patched ${count} targets`)
}
let script = readFileSync(`${root}/benchmark.mjs`, 'utf8')
const start = "{name:'start',cwd:resolve(values.start),port:4412,entry:'features/site/HomePage.tsx',dev:['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4412'],build:['node_modules/vite/bin/vite.js','build'],prod:['scripts/serve-start.mjs']}"
const candidate = "{name:'candidate',cwd:resolve(values.start),port:4412,entry:'app/index.tsx',dev:['node_modules/one/run.mjs','dev','--host','127.0.0.1','--port','4412'],build:['node_modules/one/run.mjs','build'],prod:['node_modules/one/run.mjs','serve','--host','127.0.0.1','--port','4412']}"
if (!script.includes(start)) throw new Error('descriptor missing')
script = script.replace(start, candidate).replace("{name:'one'", "{name:'control'").replace("site.name === 'one' ? '5ae610515' : 'd4b0454f6'", "'322e913d2 source; fixture 5ae610515'").replace("site.name==='one'?'one':'@tanstack/react-start'", "'one'")
writeFileSync(`${root}/same-source.mjs`, script)
