import { env } from 'cloudflare:test'
import { describe, expect, test } from 'vitest'
import worker from './dist/worker'

describe('Cloudflare Worker', () => {
  test('GET /posts', async () => {
    const res = await worker.request('/', {}, env)
    expect(res.status).toBe(200)
    const body = await res.text
    console.log('body', body)
  })
})
