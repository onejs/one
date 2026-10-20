import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { expect, it, vi } from 'vitest'
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

it('starts the native multipart response before bundling finishes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'native-bundle-http-'))
  let finishBuild!: () => void
  const building = new Promise<void>((resolve) => {
    finishBuild = resolve
  })
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  let failBuild = false
  const previousPlugins = globalThis.__vxrnAddNativePlugins
  globalThis.__vxrnAddNativePlugins = () => [
    {
      name: 'blocked-native-bundle',
      transform(_code, id) {
        if (id.endsWith('/__virtual-native-entry.tsx'))
          return 'globalThis.nativeBundleReady = true'
      },
      async renderChunk() {
        await building
        if (failBuild) throw new Error('native fixture failed')
      },
    },
  ]
  const server = await createServer({
    root,
    configFile: false,
    plugins: [createReactNativeDevServerPlugin()],
    server: { host: '127.0.0.1', port: 0 },
  })
  try {
    await server.listen()
    const { port } = server.httpServer!.address() as { port: number }
    const response = await fetch(`http://127.0.0.1:${port}/index.bundle?platform=ios`, {
      headers: { accept: 'multipart/mixed' },
      signal: AbortSignal.timeout(1_000),
    })
    expect(response.headers.get('content-type')).toMatch(
      /multipart\/mixed; boundary="[^"]+"/
    )
    const reader = response.body!.getReader()
    const preamble = await reader.read()
    await vi.advanceTimersByTimeAsync(10_000)
    const progress = await reader.read()
    expect(new TextDecoder().decode(progress.value)).toContain('"status":"Bundling"')
    finishBuild()
    reader.releaseLock()
    let body =
      new TextDecoder().decode(preamble.value) + new TextDecoder().decode(progress.value)
    for await (const chunk of response.body!) {
      body += new TextDecoder().decode(chunk)
    }
    expect(body).toContain('X-Http-Status: 200')
    expect(body).toContain('nativeBundleReady')
    const boundary = response.headers.get('content-type')!.match(/boundary="([^"]+)"/)![1]
    expect(body.endsWith(`\r\n--${boundary}--\r\n`)).toBe(true)
    const plain = await fetch(`http://127.0.0.1:${port}/index.bundle?platform=ios`)
    expect(plain.headers.get('content-type')).toBe('text/javascript')
    expect(await plain.text()).toContain('nativeBundleReady')

    failBuild = true
    const failed = await fetch(`http://127.0.0.1:${port}/index.bundle?platform=android`, {
      headers: { accept: 'multipart/mixed' },
    })
    const error = await failed.text()
    expect(error).toContain('X-Http-Status: 500')
    expect(error).toContain('native fixture failed')
  } finally {
    finishBuild()
    await server.close()
    globalThis.__vxrnAddNativePlugins = previousPlugins
    vi.useRealTimers()
    await rm(root, { recursive: true, force: true })
  }
})
