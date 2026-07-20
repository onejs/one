import { createServer } from 'node:http'
import { Hono } from 'hono'
import { describe, expect, test } from 'vitest'
import { honoServeNode } from './node'

describe('honoServeNode', () => {
  test('rejects when the listener cannot bind', async () => {
    const occupied = createServer()
    await new Promise<void>((resolve, reject) => {
      occupied.once('error', reject)
      occupied.listen(0, '127.0.0.1', resolve)
    })
    const address = occupied.address()
    if (!address || typeof address === 'string') throw new Error('missing test port')

    const app = new Hono().get('/health', (context) => context.text('ok'))
    await expect(
      honoServeNode(app, { host: '127.0.0.1', port: address.port })
    ).rejects.toMatchObject({ code: 'EADDRINUSE' })

    await new Promise<void>((resolve, reject) =>
      occupied.close((error) => (error ? reject(error) : resolve()))
    )
  })
})
