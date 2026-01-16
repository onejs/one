/**
 * Quick flicker detection test
 * Tests for visible flicker during hydration by measuring timing gaps
 */
import { chromium } from 'playwright'

const SERVER_URL = process.env.ONE_SERVER_URL || 'http://localhost:3000'
const MAX_FLICKER_GAP_MS = 50

async function testFlicker(path: string) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.addInitScript(() => {
    ;(window as any).__flickerData = {
      removalCount: 0,
      additionCount: 0,
      maxTimingGap: 0,
      lastRemovalTime: 0,
      timingGaps: [] as number[],
      mutations: [] as any[],
    }

    const startObserving = () => {
      const target = document.getElementById('root') || document.body
      const observer = new MutationObserver((mutations) => {
        const data = (window as any).__flickerData
        const now = performance.now()

        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.removedNodes) {
              if (node.nodeType === 1) {
                const textLen = (node as Element).textContent?.length || 0
                if (textLen > 100) {
                  data.removalCount++
                  data.lastRemovalTime = now
                  data.mutations.push({
                    type: 'removal',
                    timestamp: now,
                    textLength: textLen,
                    nodeName: (node as Element).nodeName,
                    text: (node as Element).textContent?.slice(0, 50),
                  })
                }
              }
            }

            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) {
                const textLen = (node as Element).textContent?.length || 0
                if (textLen > 100 && data.lastRemovalTime > 0) {
                  const gap = now - data.lastRemovalTime
                  data.additionCount++
                  data.timingGaps.push(gap)
                  data.maxTimingGap = Math.max(data.maxTimingGap, gap)
                  data.mutations.push({
                    type: 'addition',
                    timestamp: now,
                    timingGapMs: gap,
                    textLength: textLen,
                    nodeName: (node as Element).nodeName,
                    text: (node as Element).textContent?.slice(0, 50),
                  })
                }
              }
            }
          }
        }
      })

      observer.observe(target, { childList: true, subtree: true })
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving)
    } else {
      requestAnimationFrame(startObserving)
    }
  })

  console.log(`Testing ${path}...`)
  await page.goto(`${SERVER_URL}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(3000)

  const flickerData = await page.evaluate(() => (window as any).__flickerData)

  console.log(`\n=== FLICKER ANALYSIS for ${path} ===`)
  console.log(`Removals: ${flickerData.removalCount}`)
  console.log(`Additions: ${flickerData.additionCount}`)
  console.log(`Max gap: ${flickerData.maxTimingGap.toFixed(2)}ms`)
  console.log(
    `Gaps: [${flickerData.timingGaps.map((g: number) => g.toFixed(2)).join(', ')}]`
  )

  const hasVisibleFlicker = flickerData.maxTimingGap > MAX_FLICKER_GAP_MS

  if (hasVisibleFlicker) {
    console.log(`❌ VISIBLE FLICKER (gap > ${MAX_FLICKER_GAP_MS}ms)`)
  } else if (flickerData.removalCount > 0) {
    console.log(`⚠️ Content removal but no visible flicker`)
  } else {
    console.log(`✅ NO FLICKER`)
  }

  await browser.close()
  return { path, ...flickerData, hasVisibleFlicker }
}

async function main() {
  const paths = [
    '/', // Homepage - served from (hydration-delay)/index+ssg.tsx
    '/ssg-flicker-test',
    '/flicker-home',
    '/delay-test',
  ]

  for (const path of paths) {
    await testFlicker(path)
  }
}

main().catch(console.error)
