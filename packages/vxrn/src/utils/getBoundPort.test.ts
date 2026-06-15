import { createServer } from 'node:http'
import type { ViteDevServer } from 'vite'
import { describe, expect, it } from 'vitest'
import { getBoundPort } from './getBoundPort'

// minimal fake matching only the fields getBoundPort reads
function fakeServer(opts: {
  address?: { port: number } | string | null
  configPort?: number
}): ViteDevServer {
  return {
    httpServer:
      opts.address === undefined ? undefined : { address: () => opts.address ?? null },
    config: { server: { port: opts.configPort } },
  } as unknown as ViteDevServer
}

describe('getBoundPort', () => {
  it('returns the actually-bound port from httpServer.address(), ignoring a stale/undefined config port (the 8081 trap)', () => {
    // dev server resolved to 8082 (8081 was taken) but config.server.port is undefined
    expect(
      getBoundPort(fakeServer({ address: { port: 8082 }, configPort: undefined }))
    ).toBe(8082)
  })

  it('prefers the bound port even when config.server.port disagrees', () => {
    expect(getBoundPort(fakeServer({ address: { port: 8082 }, configPort: 8081 }))).toBe(
      8082
    )
  })

  it('falls back to config.server.port when the server is not yet listening', () => {
    expect(getBoundPort(fakeServer({ address: null, configPort: 8085 }))).toBe(8085)
  })

  it('falls back to 8081 when nothing is available', () => {
    expect(getBoundPort(fakeServer({ address: null, configPort: undefined }))).toBe(8081)
  })

  it('ignores a unix-socket/pipe address (string) and falls back to config', () => {
    expect(
      getBoundPort(fakeServer({ address: '/tmp/some.sock', configPort: 8090 }))
    ).toBe(8090)
  })

  // real listening server: proves we read the true bound port, not the stale config value
  it('reads the real bound port from a live http server, not the config value', async () => {
    const real = createServer()
    await new Promise<void>((res) => real.listen(0, '127.0.0.1', () => res()))
    try {
      const boundPort = (real.address() as { port: number }).port
      // config claims 8081, but the server is actually listening on boundPort
      const server = {
        httpServer: real,
        config: { server: { port: 8081 } },
      } as unknown as ViteDevServer
      expect(getBoundPort(server)).toBe(boundPort)
      expect(getBoundPort(server)).not.toBe(8081)
    } finally {
      await new Promise<void>((res) => real.close(() => res()))
    }
  })
})
