import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

describe(`Resolving Tests`, { retry: 2, timeout: 60_000 }, () => {
  it('it picks up the web extension in package in the monorepo', async () => {
    const response = await fetch(serverUrl + '/web-extensions')
    const html = await response.text()
    // Use regex to match h1 content regardless of data-one-source attribute (added by source inspector in dev)
    expect(html).toMatch(/<h1[^>]*>work works\? <!-- -->yes<\/h1>/)
  })
})
