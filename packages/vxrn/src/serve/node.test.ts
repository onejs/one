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

  test('overwrites the trusted peer address header from the socket', async () => {
    const reservation = createServer()
    await new Promise<void>((resolve, reject) => {
      reservation.once('error', reject)
      reservation.listen(0, '127.0.0.1', resolve)
    })
    const address = reservation.address()
    if (!address || typeof address === 'string') throw new Error('missing test port')
    await new Promise<void>((resolve, reject) =>
      reservation.close((error) => (error ? reject(error) : resolve()))
    )

    const app = new Hono().get('/peer', (context) =>
      context.text(context.req.header('x-vxrn-peer-address') || '')
    )
    const running = honoServeNode(app, { host: '127.0.0.1', port: address.port })
    await new Promise<void>((resolve, reject) => {
      const startedAt = Date.now()
      const probe = async () => {
        try {
          const response = await fetch(`http://127.0.0.1:${address.port}/peer`, {
            headers: { 'x-vxrn-peer-address': '203.0.113.9' },
          })
          expect(await response.text()).toBe('127.0.0.1')
          resolve()
        } catch (error) {
          if (Date.now() - startedAt > 2_000) reject(error)
          else setTimeout(probe, 20)
        }
      }
      void probe()
    })
    const shutdown = process.listeners('SIGTERM').at(-1)
    expect(shutdown).toBeTypeOf('function')
    shutdown?.('SIGTERM')
    await running
  })
})
