import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import lighthouse from './tools/node_modules/lighthouse/core/index.js'
import { launch } from './tools/node_modules/chrome-launcher/dist/index.js'

const root = import.meta.dirname
const output = join(root, 'evidence/lcp-diagnostic-heavy/lighthouse')
mkdirSync(output, { recursive: true })
const provenance = JSON.parse(readFileSync(join(root, 'evidence/setup/provenance.json')))
const summaries = []
for (const [site, port, args] of [
  ['one', 4421, ['node_modules/one/run.mjs', 'serve', '--host', '127.0.0.1', '--port', '4421']],
  ['start', 4422, ['scripts/serve-start.mjs']],
]) {
  let log = ''
  let chrome
  const server = spawn(process.execPath, args, {
    cwd: join(root, site),
    env: { ...process.env, PORT: String(port), NO_COLOR: '1' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(log || 'no readiness announcement')), 60000)
      const data = (chunk) => {
        log += chunk
        if (/Local:\s+http/.test(log)) { clearTimeout(timeout); resolve() }
      }
      server.stdout.on('data', data)
      server.stderr.on('data', data)
      server.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`server exit ${code}: ${log}`)) })
    })
    chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
    const result = await lighthouse(`http://127.0.0.1:${port}/`, {
      port: chrome.port,
      output: ['json', 'html'],
      logLevel: 'error',
    })
    const { lhr, artifacts } = result
    writeFileSync(join(output, `${site}.json`), JSON.stringify(lhr, null, 2))
    writeFileSync(join(output, `${site}.html`), result.report[1])
    for (const key of ['Trace', 'DevtoolsLog']) {
      if (artifacts[key]) writeFileSync(join(output, `${site}-${key}.json`), JSON.stringify(artifacts[key]))
    }
    assert.equal(lhr.runtimeError, undefined, JSON.stringify(lhr.runtimeError))
    const summary = {
      site,
      lighthouse: lhr.lighthouseVersion,
      userAgent: lhr.userAgent,
      settings: lhr.configSettings,
      scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, value]) => [key, value.score])),
      metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map((key) => [key, lhr.audits[key].numericValue])),
      warnings: lhr.runWarnings,
      findings: Object.values(lhr.audits).filter((audit) => audit.score !== null && audit.score < 1).map(({ id, title, displayValue, details }) => ({ id, title, displayValue, details })),
    }
    summaries.push(summary)
    writeFileSync(join(output, 'summary.json'), JSON.stringify({ provenance, quiet: false, timingExcludedFromAcceptance: true, singleRunObservation: true, summaries }, null, 2))
    console.log(JSON.stringify({ site, scores: summary.scores, metrics: summary.metrics, warnings: summary.warnings }))
  } finally {
    if (chrome) await chrome.kill()
    writeFileSync(join(output, `${site}-server.log`), log)
    if (server.exitCode === null) { process.kill(-server.pid, 'SIGTERM'); await once(server, 'exit') }
  }
}
