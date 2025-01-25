import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

describe(`Resolving Tests`, () => {
  it('it picks up the web extension in package in the monorepo', async () => {
    const response = await fetch(serverUrl + '/web-extensions')
    const html = await response.text()
    expect(html).toContain('<h1>work works? <!-- -->yes</h1>')
  })
})
