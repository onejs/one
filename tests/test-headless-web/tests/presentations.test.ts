import { type Browser, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
})

afterAll(async () => {
  await browser.close()
})

const html = async (path: string) => await (await fetch(`${serverUrl}${path}`)).text()

const open = async (path: string): Promise<Page> => {
  const page = await browser.newPage()
  await page.goto(`${serverUrl}${path}`)
  await page.waitForLoadState('networkidle')
  return page
}

const testId = (id: string) => `[data-testid="${id}"]`

const clickTestId = async (page: Page, id: string) => {
  await page.waitForSelector(testId(id))
  await page.click(testId(id))
}

const textOf = async (page: Page, id: string) => {
  await page.waitForSelector(testId(id))
  return (await page.textContent(testId(id)))?.trim()
}

describe('Presentations', () => {
  test('renders a sheet screen inside the registered sheet component', async () => {
    const markup = await html('/compose')

    // the sheet chrome wraps the screen in SSR output, not just after hydration
    expect(markup).toContain('data-testid="sheet-chrome"')
    expect(markup).toContain('data-testid="compose"')
    expect(markup).toContain('headless compose')
  })

  test('passes the screen and its narrowed options to the component', async () => {
    const markup = await html('/compose')

    expect(markup).toMatch(/data-testid="sheet-chrome"[^>]*data-screen="compose"/)
    expect(markup).toMatch(/data-testid="sheet-title"[^>]*>Compose</)
  })

  test('opens on the commit after mount so enter animations run', async () => {
    // SSR paints closed, the client flips it open
    expect(await html('/compose')).toMatch(
      /data-testid="sheet-chrome"[^>]*data-open="false"/
    )

    const page = await open('/compose')
    await page.waitForSelector('[data-testid="sheet-chrome"][data-open="true"]')
    await page.close()
  })

  test('onOpenChange(false) pops the screen', async () => {
    const page = await open('/')
    await clickTestId(page, 'to-compose')
    await page.waitForSelector(testId('sheet-chrome'))

    await clickTestId(page, 'sheet-close')

    await page.waitForSelector(testId('sheet-chrome'), { state: 'detached' })
    await page.waitForSelector(testId('home'))
    await page.close()
  })

  test('a base screen renders with no presentation chrome', async () => {
    expect(await html('/about')).not.toContain('data-testid="sheet-chrome"')
  })
})

const navigate = async (page: Page, linkId: string, expectId: string) => {
  await clickTestId(page, linkId)
  await page.waitForSelector(testId(expectId))
}

describe('layouts', () => {
  test('a layout keeps its state across navigation between its routes', async () => {
    const page = await open('/kept-a')

    await clickTestId(page, 'layout-inc')
    await clickTestId(page, 'layout-inc')
    expect(await textOf(page, 'layout-count')).toBe('2')

    // getQualifiedRouteComponent used to hand out a memo() wrapper on its first
    // call and the bare component on every call after, so the first navigation
    // swapped the component type and remounted the whole route subtree
    await navigate(page, 'to-kept-b', 'kept-b')
    expect(await textOf(page, 'layout-count')).toBe('2')

    await navigate(page, 'to-kept-a', 'kept-a')
    expect(await textOf(page, 'layout-count')).toBe('2')
    await page.close()
  })
})

describe('keepMounted', () => {
  test('keeps a visited screen mounted and preserves its state', async () => {
    const page = await open('/kept-a')

    await clickTestId(page, 'kept-a-inc')
    await clickTestId(page, 'kept-a-inc')
    expect(await textOf(page, 'kept-a-count')).toBe('2')

    await navigate(page, 'to-kept-b', 'kept-b')
    // still in the document, hidden by Activity rather than unmounted
    expect(await page.locator(testId('kept-a')).count()).toBe(1)

    await navigate(page, 'to-kept-a', 'kept-a')
    expect(await textOf(page, 'kept-a-count')).toBe('2')
    await page.close()
  })

  test('unmounts a screen that did not ask to be kept', async () => {
    const page = await open('/kept-a')

    await navigate(page, 'to-kept-b', 'kept-b')
    await clickTestId(page, 'kept-b-inc')
    expect(await textOf(page, 'kept-b-count')).toBe('1')

    await navigate(page, 'to-kept-a', 'kept-a')
    expect(await page.locator(testId('kept-b')).count()).toBe(0)

    await navigate(page, 'to-kept-b', 'kept-b')
    expect(await textOf(page, 'kept-b-count')).toBe('0')
    await page.close()
  })

  test('does not mount a kept screen before it has been focused', async () => {
    // kept-a declares keepMounted, but landing on kept-b must not pre-render it
    const markup = await html('/kept-b')

    expect(markup).toContain('data-testid="kept-b"')
    expect(markup).not.toContain('data-testid="kept-a"')
  })
})
