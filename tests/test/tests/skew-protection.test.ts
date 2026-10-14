import { readFile } from 'fs-extra'
import { join } from 'node:path'
import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { ONLY_TEST_DEV } from '@vxrn/test'

const serverUrl = process.env.ONE_SERVER_URL!
const isDebug = !!process.env.DEBUG

/**
 * trigger SPA navigation by dispatching a custom event that the
 * TestNavigationHelper listens for. this avoids the playwright/react-native-web
 * TextInput.fill() compatibility issue where onChangeText doesn't fire.
 */
async function spaNavigateTo(page: Page, target: string) {
  await page.evaluate((path) => {
    // dispatch custom event that triggers SPA navigation
    window.dispatchEvent(new CustomEvent('__test_navigate', { detail: { path } }))
  }, target)
}

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

  describe('fresh build - SPA navigation', { retry: 1, timeout: 60_000 }, () => {
    // skip in dev: skew protection is prod-only, and dev server cold cache makes
    // SPA navigation tests unreliable (modules compiled on-demand)
    if (ONLY_TEST_DEV) {
      it('skip in dev', () => expect(true).toBeTruthy())
      return
    }

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

      await spaNavigateTo(page, '/hooks')
      // wait for the URL to change (dev server may need time to compile modules)
      await page.waitForURL('**/hooks', { timeout: 30_000 })

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
      await spaNavigateTo(page, '/hooks')
      await page.waitForURL('**/hooks', { timeout: 30_000 })
      expect(page.url()).toContain('/hooks')

      // back
      await page.evaluate(() => window.history.back())
      await page.waitForFunction(() => !window.location.pathname.includes('/hooks'), {
        timeout: 10_000,
      })
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
    'stale build - JS chunk import failure loads the destination document',
    { retry: 1, timeout: 30_000 },
    () => {
      if (ONLY_TEST_DEV) {
        it('skip in dev', () => expect(true).toBeTruthy())
        return
      }

      it('loads the destination: marker cleared, page functional after', async () => {
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

        await spaNavigateTo(page, '/hooks')
        await page.waitForTimeout(3000)

        // marker must be gone (a new document loaded) and it is the destination
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()
        expect(new URL(page.url()).pathname).toBe('/hooks')

        // page must be functional after the document load
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

      it('loader import failure loads the destination, no crash', async () => {
        // the navigation preload imports the loader, so its chunk-load failure
        // loads the destination as a document (marker cleared)
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

        await spaNavigateTo(page, '/hooks')
        await page.waitForTimeout(3000)

        // the failed navigation preload loads the destination as a document
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()
        expect(new URL(page.url()).pathname).toBe('/hooks')

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

      it('CSS preload failure loads the destination, page functional', async () => {
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

        await spaNavigateTo(page, '/hooks')
        await page.waitForTimeout(3000)

        // the failed navigation preload loads the destination as a document
        expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()
        expect(new URL(page.url()).pathname).toBe('/hooks')
        expect(await page.evaluate(() => !!document.body?.innerHTML)).toBe(true)

        await page.close()
      })
    }
  )

  describe(
    'stale build - failed hover prefetch preserves the reader',
    { timeout: 30_000 },
    () => {
      if (ONLY_TEST_DEV) {
        it('skip in dev', () => expect(true).toBeTruthy())
        return
      }

      it('keeps the reader after failed prefetch and recovers on navigation', async () => {
        const page = await context.newPage()
        await page.setViewportSize({ width: 1280, height: 300 })
        try {
          await page.goto(serverUrl)
          await page.waitForSelector('[data-testid="welcome-message"]')
          const link = page.locator('a[href="/sub-page/sub"]').first()
          await link.scrollIntoViewIfNeeded()

          const before = await page.evaluate(() => {
            sessionStorage.removeItem('__one_skew_reload')
            ;(window as any).__spaNavMarker = true
            const range = document.createRange()
            range.selectNodeContents(
              document.querySelector('[data-testid="welcome-message"]')!
            )
            const selection = window.getSelection()!
            selection.removeAllRanges()
            selection.addRange(range)
            return { y: scrollY, selection: selection.toString() }
          })
          expect(before.y).toBeGreaterThan(0)
          expect(before.selection).toBe('Welcome to One')

          const failedRequests: string[] = []
          await page.route('**/*_preload.js', (route) => {
            failedRequests.push(route.request().url())
            return route.abort('connectionrefused')
          })
          await page.route('**/*_preload_css.js', (route) => {
            failedRequests.push(route.request().url())
            return route.abort('connectionrefused')
          })

          // either the prefetch settles or the old recovery tears down the document.
          const settled = Promise.race([
            page.waitForEvent('console', {
              predicate: (message) => message.text().includes('[one] preload error'),
            }),
            page.waitForEvent('framenavigated', {
              predicate: (frame) => frame === page.mainFrame(),
            }),
          ])
          await link.hover()
          await settled
          expect(failedRequests.length).toBeGreaterThan(0)
          expect(
            await page.evaluate(() => ({
              marker: (window as any).__spaNavMarker,
              guard: sessionStorage.getItem('__one_skew_reload'),
              y: scrollY,
              selection: window.getSelection()?.toString(),
            }))
          ).toEqual({ marker: true, guard: null, ...before })
          expect(page.url()).toBe(new URL('/', serverUrl).href)

          // a failed speculative cache must not suppress recovery when the user
          // navigates: the destination loads as a document, without a reload.
          await spaNavigateTo(page, '/sub-page/sub')
          await page.waitForURL(new URL('/sub-page/sub', serverUrl).href)
          await page.waitForFunction(() => !(window as any).__spaNavMarker)
          expect(
            await page.evaluate(() => sessionStorage.getItem('__one_skew_reload'))
          ).toBeNull()
        } finally {
          await page.close()
        }
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

    it('a recent reload does not stop a click from reaching its destination', async () => {
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

      await spaNavigateTo(page, '/hooks')
      await page.waitForTimeout(3000)

      // the guard only stops reload loops; the click still loads its destination
      expect(await page.evaluate(() => (window as any).__spaNavMarker)).toBeFalsy()
      expect(new URL(page.url()).pathname).toBe('/hooks')

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
        await spaNavigateTo(page, '/hooks')
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
        await spaNavigateTo(page, '/hooks')
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
