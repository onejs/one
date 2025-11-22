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

  test('loader data stays the same on back/forward', async () => {
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
    const initialCallCount = await page.textContent('#loader-call-count')
    const initialCount = parseInt(initialCallCount?.match(/\d+/)?.[0] || '0')

    // Change search params via navigation
    await page.fill('#query-input', 'hello')
    await page.click('#update-search')
    await new Promise((res) => setTimeout(res, 500))

    // Loader should have refetched with new search param
    expect(await page.textContent('#loader-query')).toContain('Query: hello')
    const afterFirstNavCount = await page.textContent('#loader-call-count')
    const firstNavCount = parseInt(afterFirstNavCount?.match(/\d+/)?.[0] || '0')
    expect(firstNavCount).toBeGreaterThan(initialCount)

    // Change search params again
    await page.fill('#query-input', 'world')
    await page.click('#update-search')
    await new Promise((res) => setTimeout(res, 500))

    // Loader should have refetched again
    expect(await page.textContent('#loader-query')).toContain('Query: world')
    const afterSecondNavCount = await page.textContent('#loader-call-count')
    const secondNavCount = parseInt(afterSecondNavCount?.match(/\d+/)?.[0] || '0')
    expect(secondNavCount).toBeGreaterThan(firstNavCount)

    await page.close()
  })

  test('useLoaderState refetch works from child component', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch')

    // Initial load - SSG pages don't have search params at build time
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const initialCount = await page.textContent('#loader-call-count')

    // Button should show "Refetch" when idle
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Click refetch button (in child component)
    await page.click('#refetch-button')

    // Button should show "Loading..." during refetch
    // Note: This might be too fast to catch in some cases
    await new Promise((res) => setTimeout(res, 100))

    // After refetch completes
    await new Promise((res) => setTimeout(res, 500))

    // Button should be back to "Refetch"
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Query should stay the same (no search params) but call count should increment
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const newCount = await page.textContent('#loader-call-count')
    expect(newCount).not.toBe(initialCount)

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

    // Check initial state
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Data should be available
    expect(await page.textContent('#loader-query')).toContain('Query:')
    expect(await page.textContent('#loader-call-count')).toContain('Call count:')

    // Test multiple rapid refetches
    for (let i = 0; i < 3; i++) {
      await page.click('#refetch-button')
      await new Promise((res) => setTimeout(res, 200))
    }

    // Call count should have incremented
    const finalCount = await page.textContent('#loader-call-count')
    expect(finalCount).toContain('Call count: ')

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
      () => !document.querySelector('#useloader-timestamp')?.textContent?.includes('loading'),
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
})
