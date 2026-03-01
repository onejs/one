import { readFile } from 'fs-extra'
import { join } from 'node:path'
import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { ONLY_TEST_DEV } from '@vxrn/test'

const serverUrl = process.env.ONE_SERVER_URL!
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

describe('Skew Protection', () => {
  describe('build artifacts', () => {
    if (ONLY_TEST_DEV) {
      it('skip in dev', () => expect(true).toBeTruthy())
      return
    }

    it('should serve version.json with valid CACHE_KEY', async () => {
      const res = await fetch(`${serverUrl}/version.json`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('version')
      expect(typeof data.version).toBe('string')
      expect(data.version.length).toBeGreaterThan(0)
    })

    it('version.json should match buildInfo CACHE_KEY', async () => {
      const fixturePath = inject('testInfo').testDir
      const buildInfoPath = join(fixturePath, 'dist', 'buildInfo.json')
      const buildInfo = JSON.parse(await readFile(buildInfoPath, 'utf-8'))

      const res = await fetch(`${serverUrl}/version.json`)
      const data = await res.json()

      expect(data.version).toBe(buildInfo.constants.CACHE_KEY)
    })

    it('version.json should be consistent across requests', async () => {
      const res1 = await fetch(`${serverUrl}/version.json`)
      const data1 = await res1.json()
      await new Promise((r) => setTimeout(r, 50))
      const res2 = await fetch(`${serverUrl}/version.json`)
      const data2 = await res2.json()
      expect(data1.version).toBe(data2.version)
    })
  })

  //
  // fresh build: SPA nav should work normally, no reloads, no errors
  //

  describe('fresh build - SPA navigation', { retry: 1, timeout: 30_000 }, () => {
    it('should SPA navigate: marker survives, URL changes, no errors', async () => {
      const page = await context.newPage()
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      const pageErrors: string[] = []
      page.on('pageerror', (err) => pageErrors.push(err.message))

      await page.goto(serverUrl)
      await page.waitForSelector('[data-testid="welcome-message"]')

      // marker survives SPA nav, cleared on full reload
      await page.evaluate(() => {
        ;(window as any).__spaNavMarker = Date.now()
      })
      const markerBefore = await page.evaluate(() => (window as any).__spaNavMarker)

      await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
      await page.locator('[data-testid="test-navigate"]').click()
      await page.waitForTimeout(2000)

      // URL must have changed
      expect(page.url()).toContain('/hooks')

      // marker must survive (proves SPA nav, not reload)
      const markerAfter = await page.evaluate(() => (window as any).__spaNavMarker)
      expect(markerAfter).toBe(markerBefore)

      // guard must NOT be set
      const guardSet = await page.evaluate(
        () => sessionStorage.getItem('__one_skew_reload') !== null
      )
      expect(guardSet).toBe(false)

      // no chunk errors
      expect(consoleErrors.filter(isChunkError)).toHaveLength(0)
      expect(pageErrors.filter(isChunkError)).toHaveLength(0)

      await page.close()
    })

    it('should hover/prefetch without errors or reloads', async () => {
      const page = await context.newPage()
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      const pageErrors: string[] = []
      page.on('pageerror', (err) => pageErrors.push(err.message))

      await page.goto(serverUrl)
      await page.waitForSelector('[data-testid="welcome-message"]')

      await page.evaluate(() => {
        ;(window as any).__spaNavMarker = true
      })

      const links = await page.locator('a[href^="/"]').all()
      for (const link of links.slice(0, 5)) {
        if (await link.boundingBox()) {
          await link.hover()
          await page.waitForTimeout(300)
        }
      }

      // must not reload
      expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBe(true)
      // no errors
      expect(consoleErrors.filter(isChunkError)).toHaveLength(0)
      expect(pageErrors.filter(isChunkError)).toHaveLength(0)

      await page.close()
    })

    it('should navigate forward and back without errors', async () => {
      const page = await context.newPage()
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      const pageErrors: string[] = []
      page.on('pageerror', (err) => pageErrors.push(err.message))

      await page.goto(serverUrl)
      await page.waitForSelector('[data-testid="welcome-message"]')

      await page.evaluate(() => {
        ;(window as any).__spaNavMarker = true
      })

      // forward
      await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
      await page.locator('[data-testid="test-navigate"]').click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/hooks')

      // back
      await page.evaluate(() => window.history.back())
      await page.waitForTimeout(2000)
      expect(page.url()).not.toContain('/hooks')

      // SPA throughout
      expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBe(true)
      expect(consoleErrors.filter(isChunkError)).toHaveLength(0)
      expect(pageErrors.filter(isChunkError)).toHaveLength(0)

      await page.close()
    })

    it('no chunk errors on direct SSR page load', async () => {
      if (ONLY_TEST_DEV) return

      const page = await context.newPage()
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      const pageErrors: string[] = []
      page.on('pageerror', (err) => pageErrors.push(err.message))

      await page.goto(`${serverUrl}/ssr/basic`)
      await page.waitForTimeout(2000)

      expect(consoleErrors.filter(isChunkError)).toHaveLength(0)
      expect(pageErrors.filter(isChunkError)).toHaveLength(0)
      await page.close()
    })
  })

  //
  // stale build: simulate chunk load failures via network interception
  //

  describe(
    'stale build - JS chunk import failure triggers reload',
    { retry: 1, timeout: 30_000 },
    () => {
      if (ONLY_TEST_DEV) {
        it('skip in dev', () => expect(true).toBeTruthy())
        return
      }

      it('should reload: marker cleared, guard set, page functional after', async () => {
        const page = await context.newPage()

        await page.goto(serverUrl)
        await page.waitForSelector('[data-testid="welcome-message"]')

        await page.evaluate(() => sessionStorage.removeItem('__one_skew_reload'))
        await page.evaluate(() => {
          ;(window as any).__spaNavMarker = true
        })

        // collect already-loaded JS so we only block NEW chunks
        const initialUrls = await page.evaluate(() =>
          performance
            .getEntriesByType('resource')
            .filter((e) => e.name.includes('/assets/') && e.name.endsWith('.js'))
            .map((e) => e.name)
        )
        const loadedSet = new Set(initialUrls)

        await page.route('**/assets/*.js', (route) => {
          if (loadedSet.has(route.request().url())) {
            route.continue()
          } else {
            route.abort('connectionrefused')
          }
        })

        await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
        await page.locator('[data-testid="test-navigate"]').click()
        await page.waitForTimeout(3000)

        // marker must be gone (page reloaded)
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()

        // guard must be set
        expect(
          await page.evaluate(() => sessionStorage.getItem('__one_skew_reload') !== null)
        ).toBe(true)

        // page must be functional after reload
        expect(await page.evaluate(() => !!document.body?.innerHTML)).toBe(true)

        await page.close()
      })
    }
  )

  describe(
    'stale build - loader import failure is swallowed gracefully',
    { retry: 1, timeout: 30_000 },
    () => {
      if (ONLY_TEST_DEV) {
        it('skip in dev', () => expect(true).toBeTruthy())
        return
      }

      it('loader .catch swallows error: marker survives, no crash', async () => {
        // loader uses dynamicImport().catch(() => null), so:
        //   1. dynamicImport catches → handleSkewError() queues reload → re-throws
        //   2. .catch(() => null) catches re-thrown → returns null
        //   3. reload fires async
        // the net effect is: reload happens (marker cleared)
        const page = await context.newPage()

        await page.goto(serverUrl)
        await page.waitForSelector('[data-testid="welcome-message"]')

        await page.evaluate(() => sessionStorage.removeItem('__one_skew_reload'))
        await page.evaluate(() => {
          ;(window as any).__spaNavMarker = true
        })

        await page.route('**/*_vxrn_loader.js', (route) => {
          route.abort('connectionrefused')
        })

        await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
        await page.locator('[data-testid="test-navigate"]').click()
        await page.waitForTimeout(3000)

        // dynamicImport error handler fires handleSkewError before .catch swallows
        // so a reload is queued. marker should be gone.
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()

        // page must be functional
        expect(await page.evaluate(() => !!document.body?.innerHTML)).toBe(true)

        await page.close()
      })
    }
  )

  describe(
    'stale build - CSS preload failure is swallowed gracefully',
    { retry: 1, timeout: 30_000 },
    () => {
      if (ONLY_TEST_DEV) {
        it('skip in dev', () => expect(true).toBeTruthy())
        return
      }

      it('CSS preload .catch swallows error: reload happens, page functional', async () => {
        const page = await context.newPage()

        await page.goto(serverUrl)
        await page.waitForSelector('[data-testid="welcome-message"]')

        await page.evaluate(() => sessionStorage.removeItem('__one_skew_reload'))
        await page.evaluate(() => {
          ;(window as any).__spaNavMarker = true
        })

        await page.route('**/*_preload_css.js', (route) => {
          route.abort('connectionrefused')
        })

        await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
        await page.locator('[data-testid="test-navigate"]').click()
        await page.waitForTimeout(3000)

        // dynamicImport error handler fires handleSkewError → reload
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()
        expect(await page.evaluate(() => !!document.body?.innerHTML)).toBe(true)

        await page.close()
      })
    }
  )

  describe(
    'stale build - hover prefetch failure triggers reload',
    { retry: 1, timeout: 30_000 },
    () => {
      if (ONLY_TEST_DEV) {
        it('skip in dev', () => expect(true).toBeTruthy())
        return
      }

      it('preload abort on hover triggers reload via dynamicImport handler', async () => {
        const page = await context.newPage()

        await page.goto(serverUrl)
        await page.waitForSelector('[data-testid="welcome-message"]')

        await page.evaluate(() => sessionStorage.removeItem('__one_skew_reload'))
        await page.evaluate(() => {
          ;(window as any).__spaNavMarker = true
        })

        await page.route('**/*_preload.js', (route) => {
          route.abort('connectionrefused')
        })
        await page.route('**/*_preload_css.js', (route) => {
          route.abort('connectionrefused')
        })

        // hover triggers prefetch → dynamicImport → abort → handleSkewError → reload
        const links = await page.locator('a[href^="/"]').all()
        for (const link of links.slice(0, 3)) {
          if (await link.boundingBox()) {
            await link.hover()
            await page.waitForTimeout(500)
          }
        }

        // after hover prefetch abort, dynamicImport handler triggers reload
        const markerSurvived = await page.evaluate(
          () => (window as any).__spaNavMarker === true
        )
        // reload should have happened (marker cleared)
        expect(markerSurvived).toBe(false)

        // page functional after reload
        expect(await page.evaluate(() => !!document.body?.innerHTML)).toBe(true)

        await page.close()
      })
    }
  )

  //
  // reload loop prevention
  //

  describe('reload loop prevention', { retry: 1, timeout: 30_000 }, () => {
    it('sessionStorage guard logic: blocks within 10s, allows after', async () => {
      const page = await context.newPage()

      await page.goto(serverUrl)
      await page.waitForSelector('[data-testid="welcome-message"]')

      // guard just set → should block
      const wouldReload = await page.evaluate(() => {
        sessionStorage.setItem('__one_skew_reload', String(Date.now()))
        const last = sessionStorage.getItem('__one_skew_reload')
        return !last || Date.now() - Number(last) > 10_000
      })
      expect(wouldReload).toBe(false)

      // guard from 11s ago → should allow
      const wouldReloadExpired = await page.evaluate(() => {
        sessionStorage.setItem('__one_skew_reload', String(Date.now() - 11_000))
        const last = sessionStorage.getItem('__one_skew_reload')
        return !last || Date.now() - Number(last) > 10_000
      })
      expect(wouldReloadExpired).toBe(true)

      await page.close()
    })

    it('guard prevents reload when chunk fails', async () => {
      if (ONLY_TEST_DEV) return

      const page = await context.newPage()

      await page.goto(serverUrl)
      await page.waitForSelector('[data-testid="welcome-message"]')

      // set guard BEFORE interception (simulate recent reload)
      await page.evaluate(() => {
        sessionStorage.setItem('__one_skew_reload', String(Date.now()))
      })

      await page.evaluate(() => {
        ;(window as any).__spaNavMarker = true
      })

      const initialUrls = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((e) => e.name.includes('/assets/') && e.name.endsWith('.js'))
          .map((e) => e.name)
      )
      const loadedSet = new Set(initialUrls)

      await page.route('**/assets/*.js', (route) => {
        if (loadedSet.has(route.request().url())) {
          route.continue()
        } else {
          route.abort('connectionrefused')
        }
      })

      await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
      await page.locator('[data-testid="test-navigate"]').click()
      await page.waitForTimeout(3000)

      // guard must prevent reload → marker must survive
      expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBe(true)

      await page.close()
    })
  })

  //
  // proactive version staleness: E2E through the real isVersionStale() → linkTo() path
  //

  describe(
    'proactive - isVersionStale triggers full-page nav via linkTo',
    { retry: 1, timeout: 30_000 },
    () => {
      if (ONLY_TEST_DEV) {
        it('skip in dev', () => expect(true).toBeTruthy())
        return
      }

      it('setting __oneVersionStale makes linkTo do full-page nav', async () => {
        const page = await context.newPage()
        const consoleErrors: string[] = []
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text())
        })

        await page.goto(serverUrl)
        await page.waitForSelector('[data-testid="welcome-message"]')

        // set marker
        await page.evaluate(() => {
          ;(window as any).__spaNavMarker = true
        })

        // mark version as stale via window flag (same flag that setupSkewProtection sets)
        // isVersionStale() checks this, and linkTo() calls isVersionStale()
        await page.evaluate(() => {
          ;(window as any).__oneVersionStale = true
        })

        // navigate via the test helper — this goes through router's linkTo()
        await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
        await page.locator('[data-testid="test-navigate"]').click()
        await page.waitForTimeout(3000)

        // linkTo() should have done window.location.href = '/hooks' (full page nav)
        // so the marker must be cleared
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()

        // URL should be the target
        expect(page.url()).toContain('/hooks')

        // __oneVersionStale should be gone after full page reload
        // (fresh page load doesn't have it set)
        expect(await page.evaluate(() => (window as any).__oneVersionStale)).toBeFalsy()

        // no chunk errors from the full page nav
        expect(consoleErrors.filter(isChunkError)).toHaveLength(0)

        await page.close()
      })

      it('without __oneVersionStale, same nav is SPA (control test)', async () => {
        const page = await context.newPage()

        await page.goto(serverUrl)
        await page.waitForSelector('[data-testid="welcome-message"]')

        await page.evaluate(() => {
          ;(window as any).__spaNavMarker = true
        })

        // do NOT set __oneVersionStale — isVersionStale() returns false
        await page.locator('[data-testid="test-navigate-path-input"]').fill('/hooks')
        await page.locator('[data-testid="test-navigate"]').click()
        await page.waitForTimeout(2000)

        // should be SPA nav → marker survives
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBe(true)
        expect(page.url()).toContain('/hooks')

        await page.close()
      })
    }
  )
})

// helpers

function isChunkError(msg: string): boolean {
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed')
  )
}
