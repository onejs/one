import { createServer } from 'node:net'
import { describe, expect, test } from 'vitest'
import { getServerOptionsFilled } from './getServerOptionsFilled'

async function occupyPort(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer()
  await new Promise<void>((resolve) => {
    server.listen({ port: 0, host: '0.0.0.0' }, () => resolve())
  })
  const port = (server.address() as { port: number }).port
  return {
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  }
}

describe('getServerOptionsFilled', () => {
  test('uses the configured TLS protocol in the public server URL', async () => {
    const server = await getServerOptionsFilled(
      {
        host: '127.0.0.1',
        https: {
          cert: 'certificate',
          key: 'private-key',
        },
      },
      'dev'
    )

    expect(server.protocol).toBe('https:')
    expect(server.url).toBe(`https://127.0.0.1:${server.port}`)
    expect(server.https).toEqual({
      cert: 'certificate',
      key: 'private-key',
    })
  })

  test('resolves an explicitly requested free port', async () => {
    const occupied = await occupyPort()
    const port = occupied.port
    await occupied.close()

    const server = await getServerOptionsFilled({ port }, 'dev')

    expect(server.port).toBe(port)
  })

  test('rejects an explicitly requested port that is already in use', async () => {
    const occupied = await occupyPort()
    try {
      await expect(getServerOptionsFilled({ port: occupied.port }, 'dev')).rejects.toThrow(
        `Port ${occupied.port} is already in use`
      )
    } finally {
      await occupied.close()
    }
  })
})
