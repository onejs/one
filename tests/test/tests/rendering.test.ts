import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!

describe(`Rendering Tests`, { retry: 2, timeout: 60_000 }, () => {
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
