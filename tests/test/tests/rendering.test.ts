import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

describe(`Rendering Tests`, () => {
  it('the root layout can insert meta and title tags', async () => {
    const response = await fetch(serverUrl)
    const html = await response.text()

    expect(html).toContain('<meta id="test-meta"/>')
    expect(html).toContain('<title>test title</title>')
  })

  it('the root layout can use useServerHeadInsertion to add head tags', async () => {
    const response = await fetch(serverUrl)
    const html = await response.text()

    expect(html).toContain('<style id="test-server-insert-style">hi</style>')
  })
})
