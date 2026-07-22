import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

const get = async (path: string) => {
  const response = await fetch(`${serverUrl}${path}`)
  expect(response.status).toBe(200)
  return await response.text()
}

describe('headless web navigators', () => {
  it('renders the matched stack route and nothing else', async () => {
    const html = await get('/')

    expect(html).toContain('data-testid="home"')
    expect(html).toContain('headless home')
    // no navigator chrome: the tab bar belongs to another layout, and the stack
    // renders no header of its own on web
    expect(html).not.toContain('data-testid="tab-bar"')
    expect(html).not.toContain('headless about')
  })

  it('renders no react-native-web markup', async () => {
    const html = await get('/')

    // react-native-web names its generated classes css-view-* / css-text-* and
    // ships its stylesheet in a style tag with this id
    expect(html).not.toContain('css-view-')
    expect(html).not.toContain('css-text-')
    expect(html).not.toContain('react-native-stylesheet')
  })

  it('renders a custom tabs layout in place of the headless default', async () => {
    const html = await get('/feed')

    expect(html).toContain('data-testid="tab-bar"')
    expect(html).toContain('data-testid="feed"')
    expect(html).toContain('headless feed')
    // unfocused tabs do not mount
    expect(html).not.toContain('headless profile')
  })

  it('marks the focused tab in the custom layout', async () => {
    const feed = await get('/feed')
    const profile = await get('/profile')

    expect(feed).toMatch(/data-testid="tab-feed"[^>]*aria-current="page"/)
    expect(feed).not.toMatch(/data-testid="tab-profile"[^>]*aria-current="page"/)
    expect(profile).toMatch(/data-testid="tab-profile"[^>]*aria-current="page"/)
  })

  it('renders links as real anchors', async () => {
    const html = await get('/')

    expect(html).toMatch(/<a[^>]*data-testid="to-about"[^>]*href="\/about"/)
  })
})
