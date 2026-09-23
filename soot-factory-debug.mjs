#!/usr/bin/env bun
// run multiple trials against running soot to see if bug reproduces.
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const TRIALS = 1

const chain = (s) => {
  if (!s) return null
  let cur = s
  const out = []
  for (let i = 0; i < 10 && cur?.routes && cur.index != null; i++) {
    const r = cur.routes[cur.index]
    if (!r) break
    out.push(r.name)
    cur = r.state
  }
  return out.join(' > ')
}

const runTrial = async (browser, trial) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    // exact user flow: go to /?skipWelcome, wait for auto-redirect to /project/xyz, wait 20s, click Factory
    await page.goto(`${BASE}/?skipWelcome`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await page.waitForURL(/\/project\/[^/]+\/main(?:[?#]|$)/, { timeout: 60_000 })
    await page.waitForSelector('a >> text=Factory', { timeout: 20_000 })
    // let soot settle — per the user it needs ~20s for heavy loading
    await page.waitForTimeout(20_000)

    // probe: is the DialogAbout welcome overlay covering the page?
    const dialogInfo = await page.evaluate(() => {
      const overlay = document.querySelector('[data-one-source*="DialogAbout"]')
      return overlay ? {
        present: true,
        state: overlay.getAttribute('data-state'),
        pointerEvents: getComputedStyle(overlay).pointerEvents,
      } : { present: false }
    })
    console.log(`  dialog:`, JSON.stringify(dialogInfo))

    await page.evaluate(() => {
      const w = window
      w.__log = []
      const op = history.pushState.bind(history)
      const or = history.replaceState.bind(history)
      history.pushState = function (s, t, u) { w.__log.push(['pushState', u]); return op(s, t, u) }
      history.replaceState = function (s, t, u) { w.__log.push(['replaceState', u]); return or(s, t, u) }
    })

    const beforeUrl = new URL(page.url()).pathname
    await page.click('a >> text=Factory')
    await page.waitForTimeout(1_500)

    const after = await page.evaluate((chainFn) => {
      const w = window
      return {
        url: location.pathname,
        focused: (() => {
          const s = w.__oneDevtools?.rootState
          if (!s) return null
          let cur = s
          const out = []
          for (let i = 0; i < 10 && cur?.routes && cur.index != null; i++) {
            const r = cur.routes[cur.index]
            if (!r) break
            out.push(r.name)
            cur = r.state
          }
          return out.join(' > ')
        })(),
        log: w.__log,
        hasFloor: /floor/i.test(document.body.innerText),
        hasNoBeans: /no beans yet/i.test(document.body.innerText),
      }
    })

    const navigated =
      after.url.endsWith('/factory') && (after.hasFloor || after.hasNoBeans)
    console.log(
      `trial ${trial}: ${navigated ? '✓' : '✗'}  ` +
        `before=${beforeUrl}  after=${after.url}  ` +
        `focused=${after.focused}  ` +
        `events=${JSON.stringify(after.log)}`
    )
    return navigated
  } finally {
    await context.close()
  }
}

const main = async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const results = []
    for (let i = 1; i <= TRIALS; i++) {
      try {
        results.push(await runTrial(browser, i))
      } catch (e) {
        console.log(`trial ${i}: ERROR ${e.message}`)
        results.push(false)
      }
    }
    const ok = results.filter(Boolean).length
    console.log(`\nresult: ${ok}/${TRIALS} navigated`)
    process.exit(ok === TRIALS ? 0 : 1)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error('fatal:', e)
  process.exit(2)
})
