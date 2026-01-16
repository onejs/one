import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * SSG Hydration Flicker Tests
 *
 * Tests that SSG pages with route group layouts don't flicker after hydration.
 * This catches a regression where SSG content inside a (group)/_layout.tsx would:
 * 1. Render correctly from SSG
 * 2. Hydrate
 * 3. Flicker (slot becomes empty)
 * 4. Re-render content again
 *
 * The bug is particularly bad with:
 * - Route group layouts that just wrap with <Slot />
 * - Nested route groups like (site)/(legal)/
 * - The index page of a route group
 *
 * Key insight: The TIMING GAP between content removal and re-addition is what
 * causes visible flicker. If removal and addition happen in the same event
 * loop tick, users don't see flicker. If there's a gap (e.g., 300ms), users
 * see content disappear and reappear.
 *
 * This test measures that timing gap and fails if it exceeds a threshold.
 */

// Maximum allowed gap (in ms) between content removal and re-addition
// If the gap is larger than this, users will perceive visible flicker
const MAX_FLICKER_GAP_MS = 50

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

describe('SSG Hydration Flicker Tests', () => {
  /**
   * Tests that a page doesn't have visible flicker during hydration by:
   * 1. Injecting a MutationObserver before the page loads
   * 2. Tracking timestamps of content removal and re-addition
   * 3. Failing if the timing gap between removal and addition exceeds threshold
   *
   * Key insight: Content removal followed by immediate re-addition (same event
   * loop tick) is fine and won't cause visible flicker. But if there's a delay
   * (e.g., 300ms), users will see the content disappear and reappear.
   */
  async function testNoFlickerDuringHydration(
    url: string,
    rootElementId: string,
    markerElementId: string,
    expectedMarkerText: string
  ) {
    const page = await context.newPage()

    // Inject MutationObserver before page loads to catch all mutations with timing
    await page.addInitScript(
      ({ rootId }) => {
        ;(window as any).__flickerData = {
          flickerDetected: false,
          visibleFlicker: false, // True if there was a timing gap
          maxTimingGap: 0, // Maximum gap between removal and addition
          mutations: [],
          removalCount: 0,
          additionAfterRemoval: 0,
          lastRemovalTimestamp: 0,
          timingGaps: [] as number[], // All recorded timing gaps
        }

        const startObserving = () => {
          // Observe from #root to catch Slot-level removals
          const targetNode = document.getElementById('root') || document.body
          const contentRoot = document.getElementById(rootId)

          if (!contentRoot) {
            // Content hasn't rendered yet, try again
            requestAnimationFrame(startObserving)
            return
          }

          const observer = new MutationObserver((mutations) => {
            const data = (window as any).__flickerData
            const now = performance.now()

            for (const mutation of mutations) {
              if (mutation.type === 'childList') {
                // Check for meaningful content removal (not just text nodes)
                const meaningfulRemovals = Array.from(mutation.removedNodes).filter(
                  (n) => n.nodeType === 1 // Element nodes only
                )

                if (meaningfulRemovals.length > 0) {
                  data.removalCount += meaningfulRemovals.length
                  data.flickerDetected = true
                  data.lastRemovalTimestamp = now
                  data.mutations.push({
                    type: 'removal',
                    timestamp: now,
                    count: meaningfulRemovals.length,
                    removed: meaningfulRemovals.map((n) => ({
                      nodeName: n.nodeName,
                      id: (n as Element).id,
                      text: n.textContent?.slice(0, 100),
                    })),
                    target: (mutation.target as Element).id || mutation.target.nodeName,
                  })
                }

                // Track if content was added back after removal (flicker pattern)
                const meaningfulAdditions = Array.from(mutation.addedNodes).filter(
                  (n) => n.nodeType === 1
                )
                if (meaningfulAdditions.length > 0 && data.removalCount > 0) {
                  data.additionAfterRemoval += meaningfulAdditions.length

                  // Calculate timing gap since last removal
                  if (data.lastRemovalTimestamp > 0) {
                    const gap = now - data.lastRemovalTimestamp
                    data.timingGaps.push(gap)
                    data.maxTimingGap = Math.max(data.maxTimingGap, gap)

                    data.mutations.push({
                      type: 'addition',
                      timestamp: now,
                      timingGapMs: gap,
                      count: meaningfulAdditions.length,
                      added: meaningfulAdditions.map((n) => ({
                        nodeName: n.nodeName,
                        id: (n as Element).id,
                        text: n.textContent?.slice(0, 100),
                      })),
                      target: (mutation.target as Element).id || mutation.target.nodeName,
                    })
                  }
                }
              }
            }
          })

          observer.observe(targetNode, { childList: true, subtree: true })
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startObserving)
        } else {
          requestAnimationFrame(startObserving)
        }
      },
      { rootId: rootElementId }
    )

    await page.goto(`${serverUrl}${url}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // Wait for hydration

    // Verify content still exists
    const contentExists = await page.evaluate(
      ({ markerId, expectedText }) => {
        const marker = document.getElementById(markerId)
        return marker !== null && marker.textContent?.includes(expectedText)
      },
      { markerId: markerElementId, expectedText: expectedMarkerText }
    )

    expect(
      contentExists,
      `Content marker "${markerElementId}" should exist after hydration`
    ).toBe(true)

    // Check for flicker
    const flickerData = await page.evaluate(() => (window as any).__flickerData)

    // Determine if there was VISIBLE flicker (timing gap exceeds threshold)
    flickerData.visibleFlicker = flickerData.maxTimingGap > MAX_FLICKER_GAP_MS

    // Always log flicker analysis for visibility
    console.log(`Flicker analysis for ${url}:`)
    console.log(`  - Content removal detected: ${flickerData.removalCount} elements`)
    console.log(`  - Content re-addition: ${flickerData.additionAfterRemoval} elements`)
    console.log(`  - Max timing gap: ${flickerData.maxTimingGap.toFixed(2)}ms`)
    console.log(`  - Visible flicker: ${flickerData.visibleFlicker}`)
    console.log(
      `  - Timing gaps: [${flickerData.timingGaps.map((g: number) => g.toFixed(2)).join(', ')}]`
    )
    if (flickerData.mutations.length > 0 && isDebug) {
      console.log(`  - Mutations:`, JSON.stringify(flickerData.mutations, null, 2))
    }

    await page.close()

    return flickerData
  }

  it('should not flicker on SSG page in route group', async () => {
    const result = await testNoFlickerDuringHydration(
      '/ssg-flicker-test',
      'ssg-flicker-test-root',
      'ssg-content-marker',
      'should not flicker'
    )

    // The key assertion: timing gap must be below threshold
    // Content removal/re-addition in the same event loop tick is OK
    expect(
      result.visibleFlicker,
      `SSG page should not have visible flicker (max gap: ${result.maxTimingGap.toFixed(2)}ms, threshold: ${MAX_FLICKER_GAP_MS}ms)`
    ).toBe(false)
  })

  it('should not flicker on SSG page inside route group with layout', async () => {
    // This tests (flicker-test)/flicker-home+ssg.tsx - an SSG page inside a route group
    // with a _layout.tsx that just wraps with <Slot />
    // This was the original bug: SSG pages inside route groups would flicker after hydration
    const result = await testNoFlickerDuringHydration(
      '/flicker-home',
      'flicker-home-root',
      'flicker-home-marker',
      'homepage inside a route group'
    )

    // The key assertion: timing gap must be below threshold
    expect(
      result.visibleFlicker,
      `SSG page in route group with layout should not have visible flicker (max gap: ${result.maxTimingGap.toFixed(2)}ms, threshold: ${MAX_FLICKER_GAP_MS}ms)`
    ).toBe(false)
  })

  it('should not have visible flicker in hydration delay test', async () => {
    // This tests (hydration-delay)/delay-test+ssg.tsx - specifically designed to
    // catch the hydration delay bug where route group layouts cause content to
    // be removed and re-added with a visible timing gap
    const result = await testNoFlickerDuringHydration(
      '/delay-test',
      'delay-test-root',
      'delay-test-marker',
      'should hydrate without a visible delay'
    )

    // This is the critical test case that should catch the bug
    expect(
      result.visibleFlicker,
      `Hydration delay test should not have visible flicker (max gap: ${result.maxTimingGap.toFixed(2)}ms, threshold: ${MAX_FLICKER_GAP_MS}ms)`
    ).toBe(false)
  })

  it('should load SSG page in nested route groups without errors', async () => {
    // Tests (site)/(legal)/terms-of-service+ssg.tsx
    // For nested route groups, we verify the page loads and content is present after hydration
    const page = await context.newPage()
    await page.goto(`${serverUrl}/terms-of-service`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Check that the content is still there after hydration
    const content = await page.evaluate(() => document.body.textContent)
    expect(content).toContain('Terms of Service')
    expect(content).toContain('nested route group SSG')

    await page.close()
  })

  it('should have SSG content in initial HTML', async () => {
    const response = await fetch(`${serverUrl}/ssg-flicker-test`)
    const html = await response.text()

    expect(html).toContain('SSG Flicker Test')
    expect(html).toContain('should not flicker after hydration')
    expect(html).toContain('id="ssg-flicker-test-root"')
    expect(html).toContain('id="ssg-content-marker"')
  })

  it('should have route group SSG content in initial HTML', async () => {
    const response = await fetch(`${serverUrl}/flicker-home`)
    const html = await response.text()

    // The (flicker-test)/flicker-home+ssg.tsx page
    expect(html).toContain('Flicker Home Test')
    expect(html).toContain('id="flicker-home-root"')
    expect(html).toContain('id="flicker-home-marker"')
  })
})
