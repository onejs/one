import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { buildNativeBundle } from '../../../packages/vxrn/src/utils/createNativeDevEngine'

const args = process.argv.slice(2)
const arg = (name: string, fallback: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const port = Number(arg('--port', '8109'))
const platforms = arg('--platform', 'android,ios').split(',') as ('android' | 'ios')[]
assert(platforms.every((platform) => platform === 'android' || platform === 'ios'))
const root = resolve(import.meta.dirname, '..')
const artifacts = resolve(arg('--artifacts', 'evidence/native-modules'))
const bundles = new Map<string, string>()
for (const platform of platforms) {
  const bundle = await buildNativeBundle({
    root,
    platform,
    dev: false,
    minify: false,
    entryFile: 'fixtures/native-modules-entry.ts',
    serverUrl: `http://localhost:${port}`,
    plugins: [
      {
        name: 'native-modules-proof-endpoint',
        transform(code, id) {
          if (id.endsWith('/one-native-modules.tsx'))
            return code.replace('__ONE_MODULE_PROOF_URL__', `http://localhost:${port}`)
        },
      },
    ],
  })
  bundles.set(platform, bundle.code)
}
const pixels = Buffer.alloc(120 * 80 * 4)
const colors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
]
for (let y = 0; y < 80; y++)
  for (let x = 0; x < 120; x++) {
    const color = colors[(y >= 40 ? 2 : 0) + (x >= 60 ? 1 : 0)]
    pixels.set([...color, x < 5 ? 0 : 255], (y * 120 + x) * 4)
  }
const input = sharp(pixels, { raw: { width: 120, height: 80, channels: 4 } })
const png = await input.clone().png().toBuffer()
const jpeg = await input
  .clone()
  .flatten({ background: 'white' })
  .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
  .toBuffer()
// an opaque, uncompressed bmp checks decoding without exif metadata.
const bmp = Buffer.alloc(54 + 120 * 80 * 3)
bmp.write('BM')
bmp.writeUInt32LE(bmp.length, 2)
bmp.writeUInt32LE(54, 10)
bmp.writeUInt32LE(40, 14)
bmp.writeInt32LE(120, 18)
bmp.writeInt32LE(80, 22)
bmp.writeUInt16LE(1, 26)
bmp.writeUInt16LE(24, 28)
for (let y = 0; y < 80; y++)
  for (let x = 0; x < 120; x++) {
    const index = (y * 120 + x) * 4
    bmp.set(
      [pixels[index + 2], pixels[index + 1], pixels[index]],
      54 + ((79 - y) * 120 + x) * 3
    )
  }
const media: Record<string, string> = {
  png: png.toString('base64'),
  jpeg: jpeg.toString('base64'),
  bmp: bmp.toString('base64'),
}
for (let orientation = 1; orientation <= 8; orientation++) {
  media[`exif${orientation}`] = (
    await input
      .clone()
      .flatten({ background: 'white' })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .withMetadata({ orientation })
      .toBuffer()
  ).toString('base64')
}
Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/status') return new Response('packager-status:running')
    if (url.pathname === '/media') return Response.json(media)
    if (url.pathname.endsWith('.bundle')) {
      const platform = url.searchParams.get('platform') ?? ''
      const bundle = bundles.get(platform)
      return bundle
        ? new Response(bundle, { headers: { 'content-type': 'application/javascript' } })
        : new Response('unknown platform', { status: 400 })
    }
    const artifact = /^\/artifact\/(android|ios)\/([a-z0-9.-]+)$/.exec(url.pathname)
    if (artifact && request.method === 'POST') {
      const directory = resolve(artifacts, artifact[1])
      mkdirSync(directory, { recursive: true })
      writeFileSync(
        resolve(directory, artifact[2]),
        Buffer.from(await request.arrayBuffer())
      )
      return new Response('saved')
    }
    const report = /^\/report\/(android|ios)$/.exec(url.pathname)
    if (report && request.method === 'POST') {
      const directory = resolve(artifacts, report[1])
      mkdirSync(directory, { recursive: true })
      const result = await request.json()
      writeFileSync(
        resolve(directory, 'runtime.json'),
        JSON.stringify(result, null, 2) + '\n'
      )
      console.info(`${report[1]} runtime: ${result.passed ? 'passed' : result.error}`)
      return new Response('saved')
    }
    return new Response('not found', { status: 404 })
  },
})
console.info(`Native modules proof ready on ${port}: ${platforms.join(', ')}`)
