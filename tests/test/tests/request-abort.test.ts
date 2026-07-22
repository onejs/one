import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const oneOrigin = process.env.ONE_SERVER_URL || ''
let provider: Server
let providerOrigin = ''
const canceledProviderRequests = new Set<string>()

beforeAll(async () => {
  provider = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost')
    const token = url.searchParams.get('token') || ''
    response.writeHead(200, { 'content-type': 'text/event-stream' })
    if (url.searchParams.get('complete') === '1') {
      response.end('provider-complete\n')
      return
    }
    response.write('provider-start\n')
    response.on('close', () => {
      if (!response.writableFinished) canceledProviderRequests.add(token)
    })
  })
  await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve))
  const address = provider.address()
  if (!address || typeof address === 'string') throw new Error('provider did not bind')
  providerOrigin = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    provider.close((error) => (error ? reject(error) : resolve()))
  })
})

async function observation(token: string): Promise<{ requestAborted: boolean }> {
  const response = await fetch(
    `${oneOrigin}/api/request-abort?status=1&token=${encodeURIComponent(token)}`
  )
  return response.json()
}

async function waitFor(predicate: () => boolean | Promise<boolean>) {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('condition was not observed before timeout')
}

describe.skipIf(process.env.TEST_ONLY !== 'dev')('dev request cancellation', () => {
  it('aborts the route signal and its downstream provider fetch on disconnect', async () => {
    const token = `abort-${Date.now()}`
    const providerUrl = `${providerOrigin}/stream?token=${encodeURIComponent(token)}`
    const controller = new AbortController()
    const response = await fetch(
      `${oneOrigin}/api/request-abort?token=${encodeURIComponent(token)}&providerUrl=${encodeURIComponent(providerUrl)}`,
      { signal: controller.signal }
    )
    const reader = response.body?.getReader()
    expect((await reader?.read())?.done).toBe(false)

    controller.abort()
    await reader?.read().catch(() => undefined)

    await waitFor(() => canceledProviderRequests.has(token))
    await waitFor(async () => (await observation(token)).requestAborted)
  })

  it('does not abort a normally completed request', async () => {
    const token = `complete-${Date.now()}`
    const providerUrl = `${providerOrigin}/stream?complete=1&token=${encodeURIComponent(token)}`
    const response = await fetch(
      `${oneOrigin}/api/request-abort?token=${encodeURIComponent(token)}&providerUrl=${encodeURIComponent(providerUrl)}`
    )

    expect(await response.text()).toBe('provider-complete\n')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(await observation(token)).toEqual({ requestAborted: false })
    expect(canceledProviderRequests.has(token)).toBe(false)
  })
})
