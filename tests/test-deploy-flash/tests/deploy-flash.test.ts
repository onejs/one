import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Deploy URL Flash Regression Guard
 *
 * Reproduces soot's bug: loading / briefly flashes /deploy in the address
 * bar before the home route's redirect fires and navigates to
 * /project/{activeProject}/main.
 *
 * Structure mirrors soot:
 *   - root layout is +ssg (spa-shell mode)
 *   - three route groups: (app), (auth), (site)
 *   - (app) has many sibling leaves: index, deploy, factory, editor, prod, ...
 *   - (app) has nested project routes with passthrough layouts at each level
 *   - (app)/_layout reads usePathname() and has a Suspense boundary
 *
 * Bug scenario:
 *   1. load /
 *   2. spa-shell hydrates, root navigator resolves (app) group
 *   3. (app) navigator initializes — should pick `index` but briefly
 *      focuses a wrong sibling (deploy) during re-initialization
 *   4. useLinking's onStateChange syncs the wrong state to the URL
 *   5. URL flashes to /deploy
 *   6. navigator corrects itself → URL goes back to /
 *   7. home route's useEffect fires router.replace → /project/target/main
 *
 * The test catches the /deploy flash at step 5.
 */

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

/**
 * Install URL flash detection before the page has hydrated.
 * Monkey-patches history.pushState and history.replaceState to record
 * every URL change. Also polls via rAF as a backstop.
 */
async function installUrlTracker(page: Page) {
  await page.addInitScript(() => {
    ;(window as any).__urlChanges = []
    const record = (source: string) => {
      ;(window as any).__urlChanges.push({
        url: location.pathname + location.search,
        time: performance.now(),
        source,
      })
    }

    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    type PushStateArgs = Parameters<History['pushState']>
    type ReplaceStateArgs = Parameters<History['replaceState']>

    history.pushState = function (...args: PushStateArgs) {
      origPush(...args)
      record('pushState')
    }
    history.replaceState = function (...args: ReplaceStateArgs) {
      origReplace(...args)
      record('replaceState')
    }

    window.addEventListener('popstate', () => record('popstate'))

    let running = true
    let lastUrl = ''
    const poll = () => {
      if (!running) return
      const cur = location.pathname + location.search
      if (cur !== lastUrl) {
        record('poll')
        lastUrl = cur
      }
      requestAnimationFrame(poll)
    }
    requestAnimationFrame(poll)
    ;(window as any).__stopUrlTracker = () => {
      running = false
    }

    record('init')
  })
}

async function collectUrlResults(page: Page) {
  return page.evaluate(() => {
    ;(window as any).__stopUrlTracker?.()
    return {
      finalUrl: location.pathname + location.search,
      urlChanges: (window as any).__urlChanges as Array<{
        url: string
        time: number
        source: string
      }>,
      homeRouteMounted: !!(window as any).__homeRouteMounted,
      deployRouteMounted: !!(window as any).__deployRouteMounted,
      homeRouteMountLog: ((window as any).__homeRouteMountLog ?? []) as Array<{
        at: number
        url: string
      }>,
      deployRouteMountLog: ((window as any).__deployRouteMountLog ?? []) as Array<{
        at: number
        url: string
      }>,
      redirectFired: (window as any).__redirectFired as
        | { at: number; fromUrl: string; toUrl: string }
        | undefined,
    }
  })
}

function getPathname(url: string) {
  return new URL(url || '/', 'http://localhost').pathname
}

async function waitForHomeRedirect(page: Page) {
  await page.waitForFunction(
    () => {
      const w = window as any
      return !!w.__homeRouteMounted && !!w.__redirectFired && location.pathname === '/project/target/main'
    },
    { timeout: 10000 }
  )
}

async function waitForDeployRouteActivity(page: Page) {
  await page.waitForFunction(
    () => {
      const w = window as any
      return !!w.__deployRouteMounted || location.pathname === '/project/target/main/deploy'
    },
    { timeout: 10000 }
  )
}

async function collectSessionProjectState(page: Page) {
  return page.evaluate(() => {
    const sessionMarker = document.querySelector('#session-marker')
    const appContainer =
      sessionMarker?.closest('#app-container') ?? document.querySelector('#app-container')
    const testWindow = window as Window & {
      __sessionRouteMountLog?: Array<{
        at: number
        url: string
        pathname: string
        params: Record<string, unknown>
      }>
    }

    return {
      url: location.pathname,
      layoutPathname: appContainer?.getAttribute('data-pathname') ?? null,
      layoutProjectId: appContainer?.getAttribute('data-project-id') ?? null,
      sessionPagePathname:
        document.querySelector('#session-page-pathname')?.textContent ?? null,
      sessionProjectId:
        document.querySelector('#session-project-id')?.textContent ?? null,
      sessionId: document.querySelector('#session-id')?.textContent ?? null,
      sessionRouteMountLog: testWindow.__sessionRouteMountLog ?? [],
    }
  })
}

async function waitForSessionState(
  page: Page,
  pathname: string,
  projectId: string,
  sessionId: string,
  timeout = 15000
) {
  await page.waitForFunction(
    (expected) => {
      const sessionMarker = document.querySelector('#session-marker')
      const appContainer =
        sessionMarker?.closest('#app-container') ??
        document.querySelector('#app-container')

      return (
        location.pathname === expected.pathname &&
        appContainer?.getAttribute('data-pathname') === expected.pathname &&
        appContainer?.getAttribute('data-project-id') === expected.projectId &&
        document.querySelector('#session-page-pathname')?.textContent ===
          expected.pathname &&
        document.querySelector('#session-project-id')?.textContent ===
          expected.projectId &&
        document.querySelector('#session-id')?.textContent === expected.sessionId
      )
    },
    { pathname, projectId, sessionId },
    { timeout }
  )
}

async function collectNestedGroupProjectState(page: Page) {
  return page.evaluate(() => {
    const nestedMarker = document.querySelector('#nested-group-session-marker')
    const appContainer =
      nestedMarker?.closest('#app-container') ?? document.querySelector('#app-container')
    const workspaceLayout =
      nestedMarker?.closest('#workspace-group-layout') ??
      document.querySelector('#workspace-group-layout')
    const panelLayout =
      nestedMarker?.closest('#panel-group-layout') ??
      document.querySelector('#panel-group-layout')
    const testWindow = window as Window & {
      __nestedGroupRouteMountLog?: Array<{
        at: number
        url: string
        pathname: string
        params: Record<string, unknown>
      }>
    }

    return {
      url: location.pathname,
      layoutPathname: appContainer?.getAttribute('data-pathname') ?? null,
      layoutProjectId: appContainer?.getAttribute('data-project-id') ?? null,
      workspacePathname: workspaceLayout?.getAttribute('data-pathname') ?? null,
      panelPathname: panelLayout?.getAttribute('data-pathname') ?? null,
      nestedPagePathname:
        document.querySelector('#nested-group-page-pathname')?.textContent ?? null,
      nestedProjectId:
        document.querySelector('#nested-group-project-id')?.textContent ?? null,
      nestedSessionId:
        document.querySelector('#nested-group-session-id')?.textContent ?? null,
      nestedGroupRouteMountLog: testWindow.__nestedGroupRouteMountLog ?? [],
    }
  })
}

async function waitForNestedGroupState(
  page: Page,
  pathname: string,
  projectId: string,
  sessionId: string,
  timeout = 15000
) {
  await page.waitForFunction(
    (expected) => {
      const nestedMarker = document.querySelector('#nested-group-session-marker')
      const appContainer =
        nestedMarker?.closest('#app-container') ??
        document.querySelector('#app-container')
      const workspaceLayout =
        nestedMarker?.closest('#workspace-group-layout') ??
        document.querySelector('#workspace-group-layout')
      const panelLayout =
        nestedMarker?.closest('#panel-group-layout') ??
        document.querySelector('#panel-group-layout')

      return (
        location.pathname === expected.pathname &&
        appContainer?.getAttribute('data-pathname') === expected.pathname &&
        appContainer?.getAttribute('data-project-id') === expected.projectId &&
        workspaceLayout?.getAttribute('data-pathname') === expected.pathname &&
        panelLayout?.getAttribute('data-pathname') === expected.pathname &&
        document.querySelector('#nested-group-page-pathname')?.textContent ===
          expected.pathname &&
        document.querySelector('#nested-group-project-id')?.textContent ===
          expected.projectId &&
        document.querySelector('#nested-group-session-id')?.textContent ===
          expected.sessionId
      )
    },
    { pathname, projectId, sessionId },
    { timeout }
  )
}

function expectSessionStateMatches(
  state: Awaited<ReturnType<typeof collectSessionProjectState>>,
  pathname: string,
  projectId: string,
  sessionId: string
) {
  expect(state.url).toBe(pathname)
  expect(state.layoutPathname).toBe(pathname)
  expect(state.sessionPagePathname).toBe(pathname)
  expect(state.layoutProjectId).toBe(projectId)
  expect(state.sessionProjectId).toBe(projectId)
  expect(state.sessionId).toBe(sessionId)
}

function expectNestedGroupStateMatches(
  state: Awaited<ReturnType<typeof collectNestedGroupProjectState>>,
  pathname: string,
  projectId: string,
  sessionId: string
) {
  expect(state.url).toBe(pathname)
  expect(state.layoutPathname).toBe(pathname)
  expect(state.workspacePathname).toBe(pathname)
  expect(state.panelPathname).toBe(pathname)
  expect(state.nestedPagePathname).toBe(pathname)
  expect(state.layoutProjectId).toBe(projectId)
  expect(state.nestedProjectId).toBe(projectId)
  expect(state.nestedSessionId).toBe(sessionId)
}

describe('loading / should not flash /deploy URL', { retry: 1 }, () => {
  test('URL should never contain /deploy when loading /', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // throttle CPU so hydration timing issues are more likely to surface
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await installUrlTracker(page)

    await page.goto(serverUrl + '/', { waitUntil: 'domcontentloaded' })

    await waitForHomeRedirect(page)

    const results = await collectUrlResults(page)

    // PRIMARY ASSERTION: /deploy should never appear in the URL history.
    // if the navigator briefly focuses the deploy sibling during spa-shell
    // hydration, useLinking will push /deploy to the browser URL.
    const deployUrlEntries = results.urlChanges.filter((e) => e.url.startsWith('/deploy'))
    expect(
      deployUrlEntries,
      `deploy URL flash detected — /deploy appeared in URL history.\n` +
        `URL changes: ${JSON.stringify(results.urlChanges, null, 2)}\n` +
        `deploy mount log: ${JSON.stringify(results.deployRouteMountLog, null, 2)}\n` +
        `home mount log: ${JSON.stringify(results.homeRouteMountLog, null, 2)}`
    ).toHaveLength(0)

    // the deploy ROUTE component should never mount when loading /
    expect(
      results.deployRouteMounted,
      `deploy route component mounted when loading /.\n` +
        `deploy mount log: ${JSON.stringify(results.deployRouteMountLog, null, 2)}`
    ).toBeFalsy()

    // verify no sibling routes briefly appeared in URL
    // (catch any wrong-sibling flash, not just deploy)
    const wrongUrls = results.urlChanges.filter((e) => {
      const url = e.url
      // only / and /project/* are valid URLs during this flow
      return (
        url !== '/' && !url.startsWith('/project/') && url !== '' // ignore empty
      )
    })
    expect(
      wrongUrls,
      `unexpected URLs appeared during / load:\n${JSON.stringify(wrongUrls, null, 2)}`
    ).toHaveLength(0)

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('home route redirect should work correctly', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await installUrlTracker(page)

    await page.goto(serverUrl + '/', { waitUntil: 'domcontentloaded' })

    await waitForHomeRedirect(page)

    const results = await collectUrlResults(page)

    // after the home redirect, we should be on /project/target/main
    expect(getPathname(results.finalUrl)).toBe('/project/target/main')

    // home route should have mounted
    expect(results.homeRouteMounted).toBe(true)

    // redirect should have fired
    expect(results.redirectFired).toBeTruthy()

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('loading /deploy directly should work without flashing other routes', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await installUrlTracker(page)

    await page.goto(serverUrl + '/deploy', { waitUntil: 'domcontentloaded' })

    await waitForDeployRouteActivity(page)

    const results = await collectUrlResults(page)

    // deploy route should mount when loading /deploy
    expect(results.deployRouteMounted).toBe(true)

    // URL should end up at /project/target/main/deploy (from the redirect)
    // or stay at /deploy (if gates don't pass)
    // but should never flash /factory, /editor, /prod, or /
    const wrongFlash = results.urlChanges.filter((e) => {
      const url = e.url
      return url !== '/deploy' && !url.startsWith('/project/')
    })
    expect(
      wrongFlash,
      `unexpected URLs during /deploy load:\n${JSON.stringify(wrongFlash, null, 2)}`
    ).toHaveLength(0)

    expect(['/deploy', '/project/target/main/deploy']).toContain(getPathname(results.finalUrl))

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test(
    'router.replace from soot-shaped session route moves browser URL to a new project id',
    { retry: 0 },
    async () => {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      try {
        await page.goto(serverUrl + '/project/default_anon-soot/main', {
          waitUntil: 'domcontentloaded',
        })
        await waitForSessionState(
          page,
          '/project/default_anon-soot/main',
          'default_anon-soot',
          'main'
        )

        const initial = await collectSessionProjectState(page)
        expectSessionStateMatches(
          initial,
          '/project/default_anon-soot/main',
          'default_anon-soot',
          'main'
        )

        await page.waitForTimeout(600)

        await page.locator('#replace-session-project').click()
        await waitForSessionState(page, '/project/proj_created/main', 'proj_created', 'main')

        const after = await collectSessionProjectState(page)
        expect(
          after.url,
          `router.replace from a soot-shaped session route did not update window.location.pathname.\n` +
            `actual: ${JSON.stringify(after, null, 2)}`
        ).toBe('/project/proj_created/main')
        expectSessionStateMatches(after, '/project/proj_created/main', 'proj_created', 'main')
        expect(errors).toHaveLength(0)
      } finally {
        await page.close()
      }
    }
  )

  test(
    'router.replace from nested route groups moves browser URL to a new project id',
    { retry: 0 },
    async () => {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      try {
        await page.goto(serverUrl + '/project/default_anon-soot/main', {
          waitUntil: 'domcontentloaded',
        })
        await waitForSessionState(
          page,
          '/project/default_anon-soot/main',
          'default_anon-soot',
          'main'
        )

        await page.locator('#replace-into-nested-group-project').click()
        await waitForNestedGroupState(
          page,
          '/nested-project/proj_nested_created/main',
          'proj_nested_created',
          'main'
        )

        const initial = await collectNestedGroupProjectState(page)
        expectNestedGroupStateMatches(
          initial,
          '/nested-project/proj_nested_created/main',
          'proj_nested_created',
          'main'
        )

        await page.waitForTimeout(600)

        await page.locator('#replace-nested-group-project').click()
        await waitForNestedGroupState(
          page,
          '/nested-project/proj_nested_replaced/main',
          'proj_nested_replaced',
          'main'
        )

        const after = await collectNestedGroupProjectState(page)
        expect(
          after.url,
          `router.replace from a doubly nested route group did not update window.location.pathname.\n` +
            `actual: ${JSON.stringify(after, null, 2)}`
        ).toBe('/nested-project/proj_nested_replaced/main')
        expectNestedGroupStateMatches(
          after,
          '/nested-project/proj_nested_replaced/main',
          'proj_nested_replaced',
          'main'
        )
        expect(errors).toHaveLength(0)
      } finally {
        await page.close()
      }
    }
  )

  test(
    'router.replace from a single group route can target a nested route group',
    { retry: 0 },
    async () => {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      try {
        await page.goto(serverUrl + '/project/default_anon-soot/main', {
          waitUntil: 'domcontentloaded',
        })
        await waitForSessionState(
          page,
          '/project/default_anon-soot/main',
          'default_anon-soot',
          'main'
        )

        await page.waitForTimeout(600)

        await page.locator('#replace-into-nested-group-project').click()
        await waitForNestedGroupState(
          page,
          '/nested-project/proj_nested_created/main',
          'proj_nested_created',
          'main'
        )

        const after = await collectNestedGroupProjectState(page)
        expect(
          after.url,
          `router.replace into a nested route group did not apply the resolved target state.\n` +
            `actual: ${JSON.stringify(after, null, 2)}`
        ).toBe('/nested-project/proj_nested_created/main')
        expectNestedGroupStateMatches(
          after,
          '/nested-project/proj_nested_created/main',
          'proj_nested_created',
          'main'
        )
        expect(errors).toHaveLength(0)
      } finally {
        await page.close()
      }
    }
  )
})
