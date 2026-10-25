import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!

const page = '/search-params/loader'

async function loaderCalls() {
  const res = await fetch(`${serverUrl}/search-params/loader-calls`)
  return ((await res.json()) as { calls: number }).calls
}

function loaderData(html: string) {
  const match = html.match(/data-testid="loader-data"[^>]*>([^<]*)</)
  return JSON.parse(match![1].replaceAll('&quot;', '"'))
}

describe('search params validate before a loader runs', { timeout: 60_000 }, () => {
  it('hands the loader values the component schemas produce', async () => {
    const res = await fetch(`${serverUrl}${page}?page=3&tags=a&tags=b&metric=revenue`)
    expect(res.status).toBe(200)
    expect(loaderData(await res.text()).searchParams).toEqual({
      metric: 'revenue',
      page: 3,
      tags: ['a', 'b'],
      sort: 'asc',
    })
  })

  it('does not run the loader for a query a schema rejects', async () => {
    const before = await loaderCalls()
    const res = await fetch(`${serverUrl}${page}?sort=sideways`)
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('sort')
    expect(await loaderCalls()).toBe(before)
  })
})
