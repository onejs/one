import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import { createReactNativeDevServerPlugin } from './reactNativeDevServer'

it('serves native media with byte ranges and preview content types', async () => {
  const root = await mkdtemp(join(tmpdir(), 'native-media-http-'))
  const bytes = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7])
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'assets/clip.mp4'), bytes)
  await writeFile(join(root, 'assets/preview.txt'), 'native preview')
  const server = await createServer({
    root,
    configFile: false,
    plugins: [createReactNativeDevServerPlugin()],
    server: { host: '127.0.0.1', port: 0 },
  })
  try {
    await server.listen()
    const { port } = server.httpServer!.address() as { port: number }
    const origin = `http://127.0.0.1:${port}/assets/assets`
    const full = await fetch(`${origin}/clip.mp4?platform=ios`)
    expect(full.status).toBe(200)
    expect(full.headers.get('content-type')).toBe('video/mp4')
    expect(full.headers.get('accept-ranges')).toBe('bytes')
    expect(Buffer.from(await full.arrayBuffer())).toEqual(bytes)
    for (const [range, start, end] of [
      ['bytes=0-1', 0, 1],
      ['bytes=3-', 3, 7],
      ['bytes=-2', 6, 7],
      ['bytes=5-99', 5, 7],
      ['bytes=-99', 0, 7],
    ] as const) {
      const response = await fetch(`${origin}/clip.mp4`, { headers: { range } })
      expect(response.status).toBe(206)
      expect(response.headers.get('content-range')).toBe(`bytes ${start}-${end}/8`)
      expect(response.headers.get('content-length')).toBe(String(end - start + 1))
      expect(Buffer.from(await response.arrayBuffer())).toEqual(
        bytes.subarray(start, end + 1)
      )
    }
    for (const range of ['bytes=8-', 'bytes=4-2', 'bytes=-0']) {
      const response = await fetch(`${origin}/clip.mp4`, { headers: { range } })
      expect(response.status).toBe(416)
      expect(response.headers.get('content-range')).toBe('bytes */8')
      expect(await response.text()).toBe('')
    }
    const fullResponseHeaders: Record<string, string>[] = [
      { range: 'items=0-1' },
      { range: 'bytes=0-1,4-5' },
      { range: 'bytes=0-1', 'if-range': '"old"' },
    ]
    for (const headers of fullResponseHeaders) {
      const response = await fetch(`${origin}/clip.mp4`, { headers })
      expect(response.status).toBe(200)
      expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes)
    }
    const head = await fetch(`${origin}/clip.mp4`, {
      method: 'HEAD',
      headers: { range: 'bytes=0-1' },
    })
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe('8')
    expect(await head.text()).toBe('')
    const preview = await fetch(`${origin}/preview.txt`)
    expect(preview.headers.get('content-type')).toBe('text/plain')
    expect(await preview.text()).toBe('native preview')
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('logs /hot connects so a lost update can blame connection or delivery', async () => {
  const root = await mkdtemp(join(tmpdir(), 'native-hmr-connect-log-'))
  const server = await createServer({
    root,
    configFile: false,
    plugins: [createReactNativeDevServerPlugin()],
    server: { host: '127.0.0.1', port: 0 },
  })
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  try {
    await server.listen()
    const { port } = server.httpServer!.address() as { port: number }
    // no bundle was ever requested, so no engine exists and the server must
    // refuse with 1013 — after logging the connect, which is what matters.
    const closeCode = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(
        `ws://127.0.0.1:${port}/hot?platform=ios&clientId=test-client-abcdef`
      )
      socket.on('close', (code) => resolve(code))
      socket.on('error', reject)
      setTimeout(() => reject(new Error('close timeout')), 10_000)
    })
    expect(closeCode).toBe(1013)
    expect(
      info.mock.calls.some(([line]) =>
        String(line).includes(
          '[hmr] native client connected platform=ios client=...abcdef'
        )
      )
    ).toBe(true)
  } finally {
    info.mockRestore()
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})
