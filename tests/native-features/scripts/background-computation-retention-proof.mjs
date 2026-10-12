import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { chromium } from 'playwright'

const out = '/tmp/one-background-retention/',
  source = 'packages/one/src/background/useBackgroundComputation.ts'
mkdirSync(out, { recursive: true })
const expected = process.argv[2] ?? 'retained'
assert.ok(expected === 'retained' || expected === 'released')
const sourceSha256 = createHash('sha256').update(readFileSync(source)).digest('hex')
execFileSync(
  'bun',
  [
    'build',
    'tests/native-features/fixtures/background-computation/retention.mjs',
    '--target',
    'browser',
    '--outfile',
    out + 'background-retention.bundle.js',
  ],
  { timeout: 30000 }
)
const bundle = readFileSync(out + 'background-retention.bundle.js')
const server = createServer((request, response) => {
  if (request.url === '/bundle.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(bundle)
  } else {
    response.setHeader('Content-Type', 'text/html')
    response.end('<div id="probe"></div><script type="module" src="/bundle.js"></script>')
  }
})
let browser,
  report = {
    scope:
      'actual generic hook mounted in Chromium with a synthetic 16 MiB output; explicit React state references, no phone, app memory or collection claim',
    sourceSha256,
  }
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(8121, '127.0.0.1', resolve)
  })
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:8121')
  await page.waitForFunction(() => Boolean(globalThis.__qaBackgroundRetention))
  await page.evaluate(() => globalThis.__qaBackgroundRetention.render(true, 0, true))
  report.ready = await page.evaluate(() => globalThis.__qaBackgroundRetention.inspect())
  assert.equal(report.ready.executed, 1)
  assert.equal(report.ready.disposed, 0)
  assert.equal(report.ready.resultNull, false)
  assert.equal(report.ready.currentNull, false)
  await page.evaluate(() => globalThis.__qaBackgroundRetention.render(false, 1, false))
  report.inactive = await page.evaluate(() =>
    globalThis.__qaBackgroundRetention.inspect()
  )
  for (let tick = 2; tick < 7; tick++)
    await page.evaluate(
      (tick) => globalThis.__qaBackgroundRetention.render(false, tick, false),
      tick
    )
  report.afterFiveInactiveCommits = await page.evaluate(() =>
    globalThis.__qaBackgroundRetention.inspect()
  )
  assert.equal(report.afterFiveInactiveCommits.disposed, 1)
  assert.equal(report.afterFiveInactiveCommits.executed, 1)
  assert.equal(report.afterFiveInactiveCommits.resultNull, true)
  assert.equal(report.afterFiveInactiveCommits.currentNull, true)
  assert.equal(
    report.ready.currentBytes,
    16 * 1024 * 1024,
    'real owner output positive control missing'
  )
  assert.equal(
    report.ready.resultCurrentExact,
    true,
    'published result differs from owner'
  )
  if (expected === 'released')
    assert.equal(
      report.afterFiveInactiveCommits.refs.length,
      0,
      'inactive hook still holds its output in React state'
    )
  else {
    assert.ok(
      report.ready.refs.some((ref) => ref.bytes === 16 * 1024 * 1024),
      'ready state reference positive control missing'
    )
    assert.ok(
      report.afterFiveInactiveCommits.refs.length > 0,
      'baseline retention observation missing'
    )
  }
  await page.evaluate(() => globalThis.__qaBackgroundRetention.render(true, 7, true))
  report.reactivated = await page.evaluate(() =>
    globalThis.__qaBackgroundRetention.inspect()
  )
  assert.equal(report.reactivated.created, 2)
  assert.equal(report.reactivated.currentRevision, 1)
  await page.evaluate(async () => {
    const p = globalThis.__qaBackgroundRetention
    p.configure({ index: 2, hold: true })
    await p.render(true, 8, false)
  })
  report.pending = await page.evaluate(() => globalThis.__qaBackgroundRetention.inspect())
  assert.equal(report.pending.currentNull, true)
  await page.evaluate(async () => {
    const p = globalThis.__qaBackgroundRetention
    p.configure({ index: 3 })
    await p.render(true, 9, false)
    const ready = p.render(true, 10, true)
    await Promise.all([ready, p.release()])
  })
  report.latest = await page.evaluate(() => globalThis.__qaBackgroundRetention.inspect())
  assert.equal(report.latest.currentRevision, 3)
  assert.equal(report.latest.currentIndex, 3)
  assert.equal(report.latest.skipped, 1)
  await page.evaluate(async () => {
    const p = globalThis.__qaBackgroundRetention
    p.configure({ index: 4 }, 'second')
    await p.render(true, 11, true)
  })
  report.factoryChanged = await page.evaluate(() =>
    globalThis.__qaBackgroundRetention.inspect()
  )
  assert.equal(report.factoryChanged.currentRevision, 1)
  assert.equal(report.factoryChanged.currentFactory, 'second')
  await page.evaluate(async () => {
    const p = globalThis.__qaBackgroundRetention
    p.configure({ index: 5, hold: true }, 'second')
    await p.render(true, 12, false)
    await p.render(false, 13, false)
    await p.release()
    await p.render(false, 14, false)
  })
  report.disposedPending = await page.evaluate(() =>
    globalThis.__qaBackgroundRetention.inspect()
  )
  assert.equal(report.disposedPending.currentNull, true)
  assert.equal(report.disposedPending.resultNull, true)
  assert.equal(report.disposedPending.skipped, 2)
  assert.equal(report.disposedPending.executed, 6)
  assert.equal(report.disposedPending.created, 3)
  assert.equal(report.disposedPending.disposed, 3)
  assert.equal(report.disposedPending.readerStable, true)
  assert.ok(
    report.disposedPending.commits.every(
      (row) => row.resultRevision === null || row.resultCurrentExact
    ),
    'a commit published a stale owner result'
  )
  await page.evaluate(() => globalThis.__qaBackgroundRetention.unmount())
  report.ok = true
} catch (error) {
  report.failure = String(error)
  throw error
} finally {
  writeFileSync(out + 'background-retention-report.json', JSON.stringify(report, null, 2))
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
console.log('BACKGROUND_RETENTION', JSON.stringify(report))
