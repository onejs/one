import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'

type Sample = { kind: string; y: number; url: string; source: boolean; target: boolean }

declare global {
  interface Window {
    __scrollRouteGate?: Promise<void>
    __releaseScrollRoute: () => void
    __gateReads: number
    __scrollTrace: Sample[]
  }
}

let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
  })
})
afterAll(async () => {
  await browser.close()
})

test('scroll resets once, after the destination commits rather than while it suspends', async () => {
  const page = await browser.newPage()
  try {
    await page.goto(`${process.env.ONE_SERVER_URL}/scroll-source`, {
      waitUntil: 'networkidle',
    })
    await page.getByTestId('scroll-source').waitFor()
    await page.evaluate(() => {
      window.scrollTo(0, 1200)
      window.__scrollTrace = []
      const sample = (kind: string) =>
        window.__scrollTrace.push({
          kind,
          y: scrollY,
          url: location.pathname,
          source: !!document.querySelector('[data-testid="scroll-source"]'),
          target: !!document.querySelector('[data-testid="scroll-target"]'),
        })
      const scroll = window.scrollTo.bind(window)
      window.scrollTo = ((x: number, y: number) => {
        sample('scrollTo')
        scroll(x, y)
      }) as typeof window.scrollTo
      new MutationObserver(() => sample('content')).observe(document.body, {
        childList: true,
        subtree: true,
      })
      window.__gateReads = 0
      const gate = new Promise<void>((resolve) => {
        window.__releaseScrollRoute = resolve
      })
      Object.defineProperty(window, '__scrollRouteGate', {
        get() {
          window.__gateReads++
          return gate
        },
      })
      sample('start')
    })
    await page.getByTestId('scroll-next').click()
    await page.waitForFunction(() => window.__gateReads > 0)
    const pending = await page.evaluate(() => ({
      y: scrollY,
      trace: window.__scrollTrace,
    }))
    expect(pending.y, JSON.stringify(pending.trace)).toBe(1200)
    expect(pending.trace.filter((s) => s.kind === 'scrollTo')).toEqual([])
    await expect(page.getByTestId('scroll-source').count()).resolves.toBe(1)

    await page.evaluate(() => window.__releaseScrollRoute())
    await page.getByTestId('scroll-target').waitFor()
    await page.waitForURL('**/scroll-target')
    await page.waitForFunction(() => scrollY === 0)
    const trace = await page.evaluate(() => window.__scrollTrace)
    const calls = trace.filter((s) => s.kind === 'scrollTo')
    expect(calls, JSON.stringify(trace)).toHaveLength(1)
    expect(calls[0]).toMatchObject({ source: false, target: true, y: 1200 })

    await page.goBack()
    await page.getByTestId('scroll-source').waitFor()
    await page.waitForFunction(() => scrollY === 1200)
  } finally {
    await page.close()
  }
})

test('hash navigation scrolls to the destination heading after it commits', async () => {
  const page = await browser.newPage()
  try {
    await page.goto(`${process.env.ONE_SERVER_URL}/scroll-source`, {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => window.scrollTo(0, 1200))
    await page.getByTestId('scroll-hash').click()
    await page.getByTestId('scroll-target').waitFor()
    await page.waitForFunction(
      () =>
        Math.abs(document.getElementById('scroll-heading')!.getBoundingClientRect().top) <
        1
    )
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(900)
  } finally {
    await page.close()
  }
})
