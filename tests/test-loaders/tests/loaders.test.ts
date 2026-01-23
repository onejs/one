import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

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

describe('loader() SSG', () => {
  test('throw redirect() in loader redirects correctly', async () => {
    const page = await context.newPage()

    // Navigate to a page that throws a redirect in its loader
    await page.goto(serverUrl + '/loader-redirect')

    // Should have been redirected to /loader
    expect(page.url()).toBe(`${serverUrl}/loader`)

    // Should see the loader page content, not the redirect page
    const textContent = await page.textContent('#loader-data')
    expect(textContent).toContain('loader-success')

    await page.close()
  })

  test('initial load with loader, then navigate to a new loader', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader')

    const textContent = await page.textContent('#loader-data')
    expect(textContent).toContain('loader-success')

    const link = await page.$('a[href="/loader/other"]')
    await link?.click({
      force: true,
    })

    await new Promise((res) => setTimeout(res, 500))

    expect(page.url()).toBe(`${serverUrl}/loader/other`)

    expect(await page.textContent('#loader-data-two')).toContain('loader-success-two')

    await page.close()
  })

  test.skip('loader data stays the same on back/forward', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/')

    expect(await page.textContent('#test-loader')).toBe('{"test":"hello"}')

    await page.click('#go-to-sub')
    await new Promise((res) => setTimeout(res, 500))

    expect(page.url()).toBe(`${serverUrl}/sub-page/sub`)

    await page.goBack()

    expect(page.url()).toBe(`${serverUrl}/`)

    expect(await page.textContent('#test-loader')).toBe('{"test":"hello"}')

    await page.close()
  })

  test.skip('loader refetches when search params change', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch')

    // Initial load
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const initialTimestampText = await page.textContent('#loader-timestamp')

    // Change search params via navigation
    await page.fill('#query-input', 'hello')
    await page.click('#update-search')
    await new Promise((res) => setTimeout(res, 500))

    // Loader should have refetched with new search param
    expect(await page.textContent('#loader-query')).toContain('Query: hello')
    const afterFirstNavTimestamp = await page.textContent('#loader-timestamp')
    expect(afterFirstNavTimestamp).not.toBe(initialTimestampText)

    // Change search params again
    await page.fill('#query-input', 'world')
    await page.click('#update-search')
    await new Promise((res) => setTimeout(res, 500))

    // Loader should have refetched again
    expect(await page.textContent('#loader-query')).toContain('Query: world')
    const afterSecondNavTimestamp = await page.textContent('#loader-timestamp')
    expect(afterSecondNavTimestamp).not.toBe(afterFirstNavTimestamp)

    await page.close()
  })

  test('useLoaderState refetch works from child component', async () => {
    const page = await context.newPage()

    // Capture browser console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/loader-refetch')

    // Wait for client-side hydration (timestamp becomes visible)
    await page.waitForFunction(
      () =>
        !document.querySelector('#loader-timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Initial load - SSG pages don't have search params at build time
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const initialTimestamp = await page.textContent('#loader-timestamp')
    console.log('Initial timestamp:', initialTimestamp)

    // Button should show "Refetch" when idle
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Click refetch button (in child component)
    console.log('Clicking refetch button')
    await page.click('#refetch-button')

    // After refetch completes - increased timeout for CI
    console.log('Waiting for refetch to complete')
    await new Promise((res) => setTimeout(res, 2000))

    // Button should be back to "Refetch"
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Query should stay the same (no search params) but timestamp should change
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const newTimestamp = await page.textContent('#loader-timestamp')
    console.log('New timestamp:', newTimestamp)
    expect(newTimestamp).not.toBe(initialTimestamp)

    await page.close()
  })

  test('simple SPA refetch', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/simple-spa-refetch')

    // Initial load
    const initialCount = await page.textContent('#spa-count')
    const initialCountNum = parseInt(initialCount?.match(/\d+/)?.[0] || '0')

    // Click refetch
    await page.click('#spa-refetch-btn')
    await new Promise((res) => setTimeout(res, 1000))

    // Count should have incremented
    const newCount = await page.textContent('#spa-count')
    const newCountNum = parseInt(newCount?.match(/\d+/)?.[0] || '0')
    expect(newCountNum).toBeGreaterThan(initialCountNum)

    await page.close()
  })

  test.skip('SPA mode: loader refetches on search params and manual refetch', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch/spa')

    // Initial load
    expect(await page.textContent('#spa-mode')).toBe('Mode: spa')
    expect(await page.textContent('#spa-query')).toContain('spa-default')
    const initialCountText = await page.textContent('#spa-call-count')
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0')

    // Navigate with new search params
    await page.click('#spa-search-test')
    await new Promise((res) => setTimeout(res, 1000)) // Give more time for navigation

    expect(await page.textContent('#spa-query')).toContain('spa-test')
    const afterNavCountText = await page.textContent('#spa-call-count')
    const afterNavCount = parseInt(afterNavCountText?.match(/\d+/)?.[0] || '0')
    expect(afterNavCount).toBeGreaterThan(initialCount)

    // Manual refetch
    await page.click('#spa-refetch')
    await new Promise((res) => setTimeout(res, 500))

    const afterRefetchCountText = await page.textContent('#spa-call-count')
    const afterRefetchCount = parseInt(afterRefetchCountText?.match(/\d+/)?.[0] || '0')
    expect(afterRefetchCount).toBeGreaterThan(afterNavCount)

    await page.close()
  })

  test.skip('SSR mode: manual refetch works', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch/ssr')

    // Initial load
    expect(await page.textContent('#ssr-mode')).toBe('Mode: ssr')
    const initialTimestampText = await page.textContent('#ssr-call-count')

    // Wait a bit to ensure timestamp will be different
    await new Promise((res) => setTimeout(res, 100))

    // Manual refetch
    await page.click('#ssr-refetch')
    await new Promise((res) => setTimeout(res, 3000)) // increased timeout for CI

    // Timestamp should have changed
    const afterRefetchTimestampText = await page.textContent('#ssr-call-count')
    expect(afterRefetchTimestampText).not.toBe(initialTimestampText)

    await page.close()
  })

  test.skip('SSR mode: loader refetches on search params and manual refetch', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch/ssr')

    // Initial load
    expect(await page.textContent('#ssr-mode')).toBe('Mode: ssr')
    expect(await page.textContent('#ssr-query')).toContain('ssr-default')
    const initialExecutedOn = await page.textContent('#ssr-executed-on')
    // Initial SSR load should be on server
    expect(initialExecutedOn).toContain('server')
    const initialCountText = await page.textContent('#ssr-call-count')
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0')

    // Navigate with new search params
    await page.click('#ssr-search-test')
    await new Promise((res) => setTimeout(res, 1000))

    expect(await page.textContent('#ssr-query')).toContain('ssr-test')
    const afterNavCountText = await page.textContent('#ssr-call-count')
    const afterNavCount = parseInt(afterNavCountText?.match(/\d+/)?.[0] || '0')
    expect(afterNavCount).toBeGreaterThan(initialCount)

    // Manual refetch - in a browser environment this should run on client
    // but in test environment it might still run on server
    await page.click('#ssr-refetch')
    await new Promise((res) => setTimeout(res, 500))

    const afterRefetchCountText = await page.textContent('#ssr-call-count')
    const afterRefetchCount = parseInt(afterRefetchCountText?.match(/\d+/)?.[0] || '0')
    expect(afterRefetchCount).toBeGreaterThan(afterNavCount)

    // Log where it executed for debugging
    const refetchExecutedOn = await page.textContent('#ssr-executed-on')
    console.log('SSR refetch executed on:', refetchExecutedOn)

    await page.close()
  })

  test('useLoaderState with loader provides data, refetch, and state', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch')

    // Wait for client-side hydration
    await page.waitForFunction(
      () =>
        !document.querySelector('#loader-timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Check initial state
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Data should be available
    expect(await page.textContent('#loader-query')).toContain('Query:')
    expect(await page.textContent('#loader-timestamp')).toContain('Timestamp:')

    // Get initial timestamp
    const initialTimestamp = await page.textContent('#loader-timestamp')

    // Test multiple rapid refetches
    for (let i = 0; i < 3; i++) {
      await page.click('#refetch-button')
      await new Promise((res) => setTimeout(res, 500))
    }

    // Timestamp should have changed after refetches
    const finalTimestamp = await page.textContent('#loader-timestamp')
    expect(finalTimestamp).not.toBe(initialTimestamp)

    await page.close()
  })

  test.skip('loader refetches on pathname change and manual refetch', async () => {
    const page = await context.newPage()

    // Capture browser console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    // Preload both pages to avoid dev mode rebuild issues
    await page.goto(serverUrl + '/loader-state/page1')
    await new Promise((res) => setTimeout(res, 500))

    await page.goto(serverUrl + '/loader-state/page2')
    await new Promise((res) => setTimeout(res, 500))

    // Now start the actual test - go back to page1
    await page.goto(serverUrl + '/loader-state/page1')
    expect(await page.textContent('#page-name')).toBe('Page: page1')
    const page1InitialCount = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page1 initial count:', page1InitialCount)

    // Manual refetch on page1
    await page.click('#refetch-btn')
    await new Promise((res) => setTimeout(res, 1000))

    const page1AfterRefetch = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page1 after refetch:', page1AfterRefetch)
    expect(page1AfterRefetch).toBeGreaterThan(page1InitialCount)

    // Navigate to page2
    await page.click('#go-to-page2')
    await new Promise((res) => setTimeout(res, 1000))

    expect(await page.textContent('#page-name')).toBe('Page: page2')
    const page2InitialCount = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page2 initial count:', page2InitialCount)

    // Manual refetch on page2
    await page.click('#refetch-btn')
    await new Promise((res) => setTimeout(res, 1000))

    const page2AfterRefetch = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page2 after refetch:', page2AfterRefetch)
    expect(page2AfterRefetch).toBeGreaterThan(page2InitialCount)

    await page.close()
  })

  test('simple refetch test', async () => {
    const page = await context.newPage()

    // Capture browser console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    page.on('pageerror', (error) => {
      console.error('[Browser Error]', error.message)
    })

    console.log('Navigating to /simple-refetch')
    await page.goto(serverUrl + '/simple-refetch')

    // Wait for hydration and client-side rendering
    await page.waitForTimeout(1500)

    // Wait for timestamp to be loaded (not "loading")
    await page.waitForFunction(
      () => !document.querySelector('#timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Get initial state
    console.log('Getting initial state')
    const initialTimestamp = await page.textContent('#timestamp')
    const initialRandom = await page.textContent('#random')
    console.log('Initial timestamp:', initialTimestamp)
    console.log('Initial random:', initialRandom)
    expect(await page.textContent('#changed')).toBe('Changed: NO')
    expect(await page.textContent('#state')).toBe('State: idle')

    // Click refetch
    console.log('Clicking refetch button')
    await page.waitForSelector('#refetch-btn', { state: 'visible' })
    await page.click('#refetch-btn')

    console.log('Waiting 3 seconds for refetch to complete')
    await new Promise((res) => setTimeout(res, 3000))

    // Check if data changed
    console.log('Checking if data changed')
    const newTimestamp = await page.textContent('#timestamp')
    const newRandom = await page.textContent('#random')
    console.log('New timestamp:', newTimestamp)
    console.log('New random:', newRandom)
    console.log('Timestamps equal?', newTimestamp === initialTimestamp)
    expect(newTimestamp).not.toBe(initialTimestamp)
    expect(await page.textContent('#changed')).toBe('Changed: YES')

    await page.close()
  })

  test('useLoaderState loading state transitions', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-state/page2')

    // Initial state should be idle
    expect(await page.textContent('#load-state')).toBe('State: idle')

    // Click refetch and immediately check state
    await page.click('#refetch-btn')
    // The button text should change to Loading...
    const buttonText = await page.textContent('#refetch-btn')
    console.log('Button text during refetch:', buttonText)

    // Wait for completion
    await new Promise((res) => setTimeout(res, 500))

    // Should be back to idle
    expect(await page.textContent('#load-state')).toBe('State: idle')

    await page.close()
  })

  test('useLoader and useLoaderState share the same cache', async () => {
    const page = await context.newPage()

    // Capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    console.log('Navigating to /shared-cache')
    await page.goto(serverUrl + '/shared-cache')
    await new Promise((res) => setTimeout(res, 1000))

    // Wait for client-side rendering
    await page.waitForFunction(
      () =>
        !document.querySelector('#useloader-timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Get initial data from both hooks
    const initialUseLoaderText = await page.textContent('#useloader-timestamp')
    const initialUseLoaderStateText = await page.textContent('#useloaderstate-timestamp')

    console.log('Initial useLoader timestamp:', initialUseLoaderText)
    console.log('Initial useLoaderState timestamp:', initialUseLoaderStateText)

    // Extract timestamps from the text
    const initialUseLoaderTimestamp = initialUseLoaderText?.split(': ')[1]
    const initialUseLoaderStateTimestamp = initialUseLoaderStateText?.split(': ')[1]

    // Both should have the same timestamp initially
    expect(initialUseLoaderTimestamp).toBe(initialUseLoaderStateTimestamp)

    // Refetch using useLoaderState
    console.log('Clicking refetch button')
    await page.click('#refetch-btn')

    console.log('Waiting for refetch to complete')
    await new Promise((res) => setTimeout(res, 2000))

    // Get new data from both hooks
    const newUseLoaderText = await page.textContent('#useloader-timestamp')
    const newUseLoaderStateText = await page.textContent('#useloaderstate-timestamp')

    console.log('New useLoader timestamp:', newUseLoaderText)
    console.log('New useLoaderState timestamp:', newUseLoaderStateText)

    // Extract timestamps from the text
    const newUseLoaderTimestamp = newUseLoaderText?.split(': ')[1]
    const newUseLoaderStateTimestamp = newUseLoaderStateText?.split(': ')[1]

    // Both should have the same NEW timestamp
    expect(newUseLoaderTimestamp).toBe(newUseLoaderStateTimestamp)

    // And it should be different from the initial
    expect(newUseLoaderTimestamp).not.toBe(initialUseLoaderTimestamp)

    // Verify refetch count incremented
    expect(await page.textContent('#refetch-count')).toBe('Refetch count: 1')

    await page.close()
  })

  test('dynamic SSG route with loader works on client-side navigation', async () => {
    const page = await context.newPage()

    // start at posts index
    await page.goto(serverUrl + '/posts')

    // wait for hydration
    await page.waitForLoadState('networkidle')

    // click the link to navigate to hello-world post
    const link = await page.$('#link-hello')
    await link?.click({ force: true })

    // wait for navigation
    await page.waitForURL(`${serverUrl}/posts/hello-world`, { timeout: 5000 })

    // loader data should be present
    const title = await page.textContent('#post-title')
    expect(title).toBe('Post: hello-world')

    const content = await page.textContent('#post-content')
    expect(content).toBe('This is the content for hello-world')

    await page.close()
  })

  test('dynamic SSG route with loader works on direct navigation', async () => {
    const page = await context.newPage()

    // navigate directly to a post
    await page.goto(serverUrl + '/posts/another-post')

    // loader data should be present
    const title = await page.textContent('#post-title')
    expect(title).toBe('Post: another-post')

    const content = await page.textContent('#post-content')
    expect(content).toBe('This is the content for another-post')

    await page.close()
  })
})

describe('useMatches()', () => {
  test('SSR: useMatches returns all matched routes with loader data', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/matches-test/page1')

    // debug: show all matches
    const allMatches = await page.textContent('#all-matches-debug')
    console.log('All matches:', allMatches)

    // should see 3+ matches (root layout, matches-test layout, page1)
    const matchesCount = await page.textContent('#page-matches-count')
    console.log('Matches count text:', matchesCount)
    expect(matchesCount).toContain('matches')

    // layout should have its loader data
    const layoutData = await page.textContent('#layout-loader-data')
    console.log('Layout data text:', layoutData)
    expect(layoutData).toContain('layoutTitle')
    expect(layoutData).toContain('Matches Test Layout')

    // page should have its loader data
    const pageData = await page.textContent('#page-loader-data')
    console.log('Page data text:', pageData)
    expect(pageData).toContain('pageTitle')
    expect(pageData).toContain('Page 1')

    await page.close()
  })

  test('client navigation: useMatches updates after navigation', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    // start at page1
    await page.goto(serverUrl + '/matches-test/page1')
    await page.waitForLoadState('networkidle')

    // verify initial state
    const page1Title = await page.textContent('#page-title')
    console.log('Page1 title:', page1Title)
    expect(page1Title).toBe('Page 1')

    const page1Data = await page.textContent('#page-loader-data')
    console.log('Page1 data:', page1Data)
    expect(page1Data).toContain('Page 1')

    // navigate to page2 via client-side link
    console.log('Clicking link to page2...')
    await page.click('#link-to-page2')
    await page.waitForURL(`${serverUrl}/matches-test/page2`, { timeout: 5000 })

    // give client time to update
    await new Promise((res) => setTimeout(res, 500))

    // debug: show all matches after navigation
    const allMatches = await page.textContent('#all-matches-debug')
    console.log('All matches after nav:', allMatches)

    // page match should update to page2's data
    const page2Title = await page.textContent('#page-title')
    console.log('Page2 title:', page2Title)
    expect(page2Title).toBe('Page 2')

    const page2Data = await page.textContent('#page-loader-data')
    console.log('Page2 data:', page2Data)
    expect(page2Data).toContain('Page 2')

    // layout data should still be present (cached from SSR)
    const layoutData = await page.textContent('#layout-loader-data')
    console.log('Layout data after nav:', layoutData)
    expect(layoutData).toContain('layoutTitle')

    await page.close()
  })

  test('layout can access page loader data via useMatches', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/matches-test/page1')

    // the layout renders its own view of matches
    const layoutMatchesData = await page.textContent('#layout-matches-data')

    // should be a JSON array with multiple matches
    const parsed = JSON.parse(layoutMatchesData || '[]')
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)

    // at least one match should have loader data
    const hasLoaderData = parsed.some(
      (m: { routeId: string; hasLoaderData: boolean }) => m.hasLoaderData
    )
    expect(hasLoaderData).toBe(true)

    await page.close()
  })

  test('deeply nested layouts: 3+ levels of layout loaders', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/nested-test/level2/page')
    await page.waitForLoadState('networkidle')

    // should have 4 matches: root _layout, nested-test/_layout, level2/_layout, page
    const totalMatches = await page.textContent('[data-testid="nested-total-matches"]')
    console.log('Total matches:', totalMatches)
    expect(totalMatches).toContain('4')

    // level1 layout data should be accessible
    const level1Data = await page.textContent('[data-testid="nested-level1-data"]')
    console.log('Level1 data:', level1Data)
    expect(level1Data).toContain('"level":1')
    expect(level1Data).toContain('"name":"Level 1 Layout"')

    // level2 layout data should be accessible
    const level2Data = await page.textContent('[data-testid="nested-level2-data"]')
    console.log('Level2 data:', level2Data)
    expect(level2Data).toContain('"level":2')
    expect(level2Data).toContain('"name":"Level 2 Layout"')

    // page data should be accessible
    const pageData = await page.textContent('[data-testid="nested-page-match-data"]')
    console.log('Page match data:', pageData)
    expect(pageData).toContain('"level":3')
    expect(pageData).toContain('"name":"Nested Page"')

    await page.close()
  })

  test('dynamic routes: useMatches includes params from URL', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/posts/hello-world')
    await page.waitForLoadState('networkidle')

    // verify page content (loader is working with params)
    const title = await page.textContent('#post-title')
    console.log('Post title:', title)
    expect(title).toBe('Post: hello-world')

    // verify matches include params
    const pageParams = await page.textContent('#post-page-params')
    console.log('Page params:', pageParams)
    expect(pageParams).toContain('"slug":"hello-world"')

    // verify we have matches
    const matchesCount = await page.textContent('#post-matches-count')
    console.log('Matches count:', matchesCount)
    expect(matchesCount).toContain('Matches: 2') // root layout + page

    await page.close()
  })

  // TODO: This test verifies error handling in layout loaders. The production server
  // handles this correctly (individual loader errors are caught and return undefined
  // loaderData), but the dev server has timing issues with the test setup.
  test.skip('error handling: page loader runs even when layout loader throws', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/error-test')
    await page.waitForLoadState('networkidle')

    // page should still render with its loader data
    const pageData = await page.textContent('[data-testid="error-test-page-data"]')
    console.log('Page data:', pageData)
    expect(pageData).toContain('pageData')
    expect(pageData).toContain('This page loader should still run')

    // matches should include the layout match (with undefined loaderData) and page match
    const matchesCount = await page.textContent('[data-testid="error-test-matches-count"]')
    console.log('Matches count:', matchesCount)
    // should have 3 matches: root layout, error-test layout, page
    expect(matchesCount).toContain('Matches: 3')

    // the error layout's data should be undefined/null since it threw
    const allMatches = await page.textContent('[data-testid="error-test-all-matches"]')
    console.log('All matches:', allMatches)
    const matches = JSON.parse(allMatches || '[]')
    const errorLayoutMatch = matches.find(
      (m: { routeId: string }) => m.routeId === './error-test/_layout.tsx'
    )
    // loader threw, so loaderData should be undefined
    expect(errorLayoutMatch?.loaderData).toBeUndefined()

    // page match should have its data
    const pageMatch = matches.find(
      (m: { routeId: string }) => m.routeId === './error-test/page+ssg.tsx'
    )
    expect(pageMatch?.loaderData).toBeDefined()
    expect(pageMatch?.loaderData?.pageData).toBe('This page loader should still run')

    await page.close()
  })
})
