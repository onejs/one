import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!

describe(`Rendering Tests`, { retry: 2, timeout: 60_000 }, () => {
  it('SafeAreaProvider uses display:contents wrapper', async () => {
    const response = await fetch(`${serverUrl}/sticky-test`)
    const html = await response.text()
    // SafeAreaProvider should render a div with display:contents instead of constraining wrapper
    expect(html).toContain('display:contents')
    // should NOT have the old constraining styles from SafeAreaProvider
    expect(html).not.toMatch(/style="[^"]*max-height:\s*100%[^"]*"/)
  })

  it('the root layout can insert meta and title tags', async () => {
    const response = await fetch(serverUrl!)
    const html = await response.text()

    // Use regex to match elements regardless of data-one-source attribute (added by source inspector in dev)
    expect(html).toMatch(/<meta[^>]*id="test-meta"[^>]*\/>/)
    expect(html).toMatch(/<title[^>]*>test title<\/title>/)
  })

  it('the root layout can use useServerHeadInsertion to add head tags', async () => {
    const response = await fetch(serverUrl!)
    const html = await response.text()

    // Use regex to match style element regardless of data-one-source attribute (added by source inspector in dev)
    expect(html).toMatch(/<style[^>]*id="test-server-insert-style"[^>]*>hi<\/style>/)
  })
})
