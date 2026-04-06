import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

if (!serverUrl) {
  throw new Error('ONE_SERVER_URL is required')
}

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

// helper: wait for page to be fully loaded (spa content rendered)
async function waitForSpaContent(page: Page, selector: string, timeout = 15000) {
  await page.waitForSelector(selector, { timeout })
}

// helper: collect all URL changes during page load
async function collectNavigations(page: Page, url: string, timeout = 15000) {
  const urls: string[] = []
  const errors: string[] = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (
      msg.type() === 'error' &&
      (text.includes('Hydration') ||
        text.includes('hydration') ||
        text.includes('did not match') ||
        text.includes('server-rendered HTML'))
    ) {
      errors.push(text)
    }
  })

  // track URL changes
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      urls.push(frame.url())
    }
  })

  await page.goto(url)
  // wait for spa content to render (any page element)
  await page.waitForFunction(
    () => {
      const el =
        document.querySelector('#beta-signup-page') ||
        document.querySelector('#admin-page') ||
        document.querySelector('#dashboard-app-page') ||
        document.querySelector('#home-page') ||
        document.querySelector('#about-page') ||
        document.querySelector('#channel-page') ||
        document.querySelector('#server-page')
      return el !== null
    },
    {},
    { timeout }
  )

  return { urls, errors }
}

// --- spa-shell html checks ---

describe('SPA Shell HTML', () => {
  test('root layout content is in server HTML', async () => {
    const html = await fetch(serverUrl + '/beta/signup').then((r) => r.text())
    expect(html).toContain('id="root-nav"')
    expect(html).toContain('Root SSG Layout')
  })

  test('spa page content is NOT in server HTML (spa-shell mode)', async () => {
    const html = await fetch(serverUrl + '/beta/signup').then((r) => r.text())
    expect(html).not.toContain('Beta Signup')
    expect(html).toContain('data-one-spa-content')
  })

  test('server renders correct pathname in shell', async () => {
    const html = await fetch(serverUrl + '/beta/signup').then((r) => r.text())
    expect(html).toContain('/beta/signup')
  })

  test('middleware does not break spa-shell mode', async () => {
    const res = await fetch(serverUrl + '/beta/signup')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html.length).toBeGreaterThan(0)
  })
})

// --- critical: route stability on reload ---
// this is the core bug: reloading on /beta/signup should NOT redirect to /admin or /app/undefined

describe('Route stability on page reload', () => {
  test('/beta/signup stays on /beta/signup after reload', async () => {
    const page = await context.newPage()
    const { urls, errors } = await collectNavigations(page, serverUrl + '/beta/signup')

    const pageContent = await page.textContent('#beta-signup-page')
    expect(pageContent).toContain('Beta Signup')

    const pathname = await page.textContent('#page-pathname')
    expect(pathname).toBe('/beta/signup')

    expect(page.url()).toContain('/beta/signup')

    // should NOT have navigated to any other route
    const unexpectedNavs = urls.filter(
      (u) => !u.includes('/beta/signup') && !u.includes('about:blank')
    )
    expect(unexpectedNavs).toEqual([])
    expect(errors).toEqual([])

    await page.close()
  })

  test('/admin stays on /admin after reload', async () => {
    const page = await context.newPage()
    const { urls, errors } = await collectNavigations(page, serverUrl + '/admin')

    const pageContent = await page.textContent('#admin-page')
    expect(pageContent).toContain('Admin')

    const pathname = await page.textContent('#page-pathname')
    expect(pathname).toBe('/admin')

    expect(page.url()).toContain('/admin')

    const unexpectedNavs = urls.filter(
      (u) => !u.includes('/admin') && !u.includes('about:blank')
    )
    expect(unexpectedNavs).toEqual([])
    expect(errors).toEqual([])

    await page.close()
  })

  test('/dashboard/test-app stays on /dashboard/test-app after reload', async () => {
    const page = await context.newPage()
    const { urls, errors } = await collectNavigations(
      page,
      serverUrl + '/dashboard/test-app'
    )

    const pageContent = await page.textContent('#dashboard-app-page')
    expect(pageContent).toContain('Dashboard')

    const pathname = await page.textContent('#page-pathname')
    expect(pathname).toBe('/dashboard/test-app')

    const appId = await page.textContent('#app-id')
    expect(appId).toBe('test-app')

    expect(page.url()).toContain('/dashboard/test-app')

    const unexpectedNavs = urls.filter(
      (u) => !u.includes('/dashboard/test-app') && !u.includes('about:blank')
    )
    expect(unexpectedNavs).toEqual([])
    expect(errors).toEqual([])

    await page.close()
  })

  test('/my-server/my-channel does not redirect to a different route', async () => {
    // regression: resetRoot after spa-shell hydration must not re-resolve
    // the URL to a different route (e.g. /deploy?projectId=...)
    const page = await context.newPage()
    const { urls, errors } = await collectNavigations(
      page,
      serverUrl + '/my-server/my-channel'
    )

    await waitForSpaContent(page, '#channel-page')
    expect(page.url()).toContain('/my-server/my-channel')

    // no unexpected navigations — only /my-server/my-channel and about:blank
    const unexpectedNavs = urls.filter(
      (u) => !u.includes('/my-server/my-channel') && !u.includes('about:blank')
    )
    expect(unexpectedNavs).toEqual([])

    await page.close()
  })

  test('/ stays on / after reload', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/')
    await waitForSpaContent(page, '#home-page')

    const pageContent = await page.textContent('#home-page')
    expect(pageContent).toContain('Home Page')

    const currentUrl = new URL(page.url())
    expect(currentUrl.pathname).toBe('/')

    await page.close()
  })

  test('repeated reloads on /beta/signup are stable', async () => {
    const page = await context.newPage()

    for (let i = 0; i < 5; i++) {
      await page.goto(serverUrl + '/beta/signup')
      await waitForSpaContent(page, '#beta-signup-page')

      const pathname = await page.textContent('#page-pathname')
      expect(pathname).toBe('/beta/signup')
      expect(page.url()).toContain('/beta/signup')
    }

    await page.close()
  })
})

// --- static route priority over dynamic ---
// (chat)/[serverId]/[channelId] can match /beta/signup as serverId=beta, channelId=signup
// but the static route (authed)/beta/signup must win

describe('Static routes take priority over dynamic catch-all groups', () => {
  test('/beta/signup matches (authed) not (chat)/[serverId]/[channelId]', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/beta/signup')
    await waitForSpaContent(page, '#beta-signup-page')

    // should render the static route, not the dynamic catch-all
    expect(await page.$('#beta-signup-page')).toBeTruthy()
    expect(await page.$('#channel-page')).toBeNull()
    expect(await page.$('#server-page')).toBeNull()

    await page.close()
  })

  test('/admin matches (authed) not (chat)', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/admin')
    await waitForSpaContent(page, '#admin-page')

    expect(await page.$('#admin-page')).toBeTruthy()
    expect(await page.$('#server-page')).toBeNull()

    await page.close()
  })

  test('truly dynamic two-segment path matches (chat) group', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/my-server/my-channel')
    await waitForSpaContent(page, '#channel-page')

    expect(await page.$('#channel-page')).toBeTruthy()

    const serverId = await page.textContent('#server-id')
    expect(serverId).toBe('my-server')

    const channelId = await page.textContent('#channel-id')
    expect(channelId).toBe('my-channel')

    await page.close()
  })

  test('single-segment dynamic path matches (chat) server page', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/some-server')
    await waitForSpaContent(page, '#server-page')

    expect(await page.$('#server-page')).toBeTruthy()

    const serverId = await page.textContent('#server-id')
    expect(serverId).toBe('some-server')

    await page.close()
  })
})

// --- client-side navigation ---

describe('Client-side navigation between route groups', () => {
  test('navigate from /beta/signup to /admin', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/beta/signup')
    await waitForSpaContent(page, '#beta-signup-page')

    await page.click('#link-to-admin')
    await waitForSpaContent(page, '#admin-page')

    expect(await page.textContent('#page-pathname')).toBe('/admin')
    expect(page.url()).toContain('/admin')

    // root layout should still be present
    expect(await page.textContent('#root-label')).toBe('Root SSG Layout')

    await page.close()
  })

  test('navigate from /admin to /beta/signup', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/admin')
    await waitForSpaContent(page, '#admin-page')

    await page.click('#link-to-beta-signup')
    await waitForSpaContent(page, '#beta-signup-page')

    expect(await page.textContent('#page-pathname')).toBe('/beta/signup')
    expect(page.url()).toContain('/beta/signup')

    await page.close()
  })

  test('navigate from home to /beta/signup', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/')
    await waitForSpaContent(page, '#home-page')

    await page.click('#link-to-beta-signup')
    await waitForSpaContent(page, '#beta-signup-page')

    expect(await page.textContent('#page-pathname')).toBe('/beta/signup')

    await page.close()
  })

  test('navigate from home to /dashboard/test-app', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/')
    await waitForSpaContent(page, '#home-page')

    await page.click('#link-to-dashboard')
    await waitForSpaContent(page, '#dashboard-app-page')

    expect(await page.textContent('#page-pathname')).toBe('/dashboard/test-app')
    expect(await page.textContent('#app-id')).toBe('test-app')

    await page.close()
  })
})

// --- no hydration errors ---

describe('No hydration or console errors', () => {
  test('no hydration errors on /beta/signup', async () => {
    const page = await context.newPage()
    const errors: string[] = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (
        msg.type() === 'error' &&
        (text.includes('Hydration') ||
          text.includes('hydration') ||
          text.includes('did not match') ||
          text.includes('server-rendered HTML'))
      ) {
        errors.push(text)
      }
    })

    await page.goto(serverUrl + '/beta/signup')
    await waitForSpaContent(page, '#beta-signup-page')
    await page.waitForTimeout(1000)

    expect(errors).toEqual([])
    await page.close()
  })

  test('no critical console errors on /beta/signup', async () => {
    const page = await context.newPage()
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    await page.goto(serverUrl + '/beta/signup')
    await waitForSpaContent(page, '#beta-signup-page')
    await page.waitForTimeout(1000)

    const criticalErrors = errors.filter((e) => !e.includes('Non-critical recoverable'))
    expect(criticalErrors).toEqual([])
    await page.close()
  })

  test('no hydration errors on /my-server/my-channel (dynamic route)', async () => {
    const page = await context.newPage()
    const errors: string[] = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (
        msg.type() === 'error' &&
        (text.includes('Hydration') ||
          text.includes('hydration') ||
          text.includes('did not match') ||
          text.includes('server-rendered HTML'))
      ) {
        errors.push(text)
      }
    })

    await page.goto(serverUrl + '/my-server/my-channel')
    await waitForSpaContent(page, '#channel-page')
    await page.waitForTimeout(1000)

    expect(errors).toEqual([])
    await page.close()
  })
})
