import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '../../..')
async function bundleSource() {
  const result = await Bun.build({
    entrypoints: [
      resolve(root, 'tests/native-features/fixtures/one-native-web-entry.tsx'),
    ],
    target: 'browser',
    format: 'esm',
    define: { 'process.env.NODE_ENV': JSON.stringify('development') },
  })
  if (!result.success) throw new AggregateError(result.logs)
  return result.outputs[0].text()
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 4387,
  async fetch(request) {
    if (new URL(request.url).pathname === '/entry.js')
      return new Response(await bundleSource(), {
        headers: { 'content-type': 'text/javascript' },
      })
    return new Response(
      '<!doctype html><html><head><title>One browser services</title></head><body style="margin:0"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } }
    )
  },
})
console.log(`One browser probe: ${server.url}`)
