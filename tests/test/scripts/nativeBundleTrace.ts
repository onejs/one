import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Plugin } from 'vite'

// retain the actual response lifecycle, including idle multipart status writes.
export function nativeBundleTrace(path: string | undefined): Plugin {
  return {
    name: 'test-native-bundle-trace',
    configureServer(server) {
      if (!path) return
      mkdirSync(dirname(path), { recursive: true })
      let sequence = 0
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('.bundle')) return next()
        const id = ++sequence
        const started = performance.now()
        const record = (event: string, detail: Record<string, unknown> = {}) => {
          appendFileSync(
            path,
            JSON.stringify({
              at: new Date().toISOString(),
              pid: process.pid,
              id,
              ms: Math.round(performance.now() - started),
              event,
              ...detail,
            }) + '\n'
          )
        }
        record('request', { url: req.url, accept: req.headers.accept })
        const writeHead = res.writeHead.bind(res)
        res.writeHead = ((...args: Parameters<typeof res.writeHead>) => {
          record('headers', { status: args[0] })
          return writeHead(...args)
        }) as typeof res.writeHead
        const write = res.write.bind(res)
        res.write = ((...args: Parameters<typeof res.write>) => {
          const chunk = args[0]
          const bytes = Buffer.byteLength(chunk)
          record('write', { bytes, part: bytes < 512 ? String(chunk) : undefined })
          return write(...args)
        }) as typeof res.write
        const end = res.end.bind(res)
        res.end = ((...args: Parameters<typeof res.end>) => {
          const chunk = args[0]
          const bytes =
            typeof chunk === 'string'
              ? Buffer.byteLength(chunk)
              : ArrayBuffer.isView(chunk)
                ? chunk.byteLength
                : 0
          record('end', { bytes })
          return end(...args)
        }) as typeof res.end
        res.once('finish', () => record('finish', { status: res.statusCode }))
        res.once('close', () => record('close', { finished: res.writableFinished }))
        res.once('error', (error) => record('error', { message: String(error) }))
        next()
      })
    },
  }
}
