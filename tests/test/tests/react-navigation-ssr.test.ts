import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

describe('react-navigation SSR import', () => {
  it('should render a page that imports @react-navigation/native without crashing', async () => {
    const response = await fetch(`${serverUrl}/ssr/nav-test`)
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('nav-test-rendered')
  })
})
