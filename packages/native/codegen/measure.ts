import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { flattenMenuItems } from '../src/menuItems'

// host-side baselines; these do not measure hermes, frame rate, or installed app size.
const build = await Bun.build({
  entrypoints: [new URL('../src/index.native.ts', import.meta.url).pathname],
  target: 'browser',
  minify: true,
  external: ['react', 'react-native', 'react-native/*'],
})
if (!build.success) throw new AggregateError(build.logs, 'native JS bundle failed')
const javascript = await build.outputs[0].text()
const samples = [10, 100, 1000].map((count) => {
  const items = Array.from({ length: count }, (_, index) => ({
    type: 'action' as const,
    id: String(index),
    title: `Action ${index}`,
  }))
  for (let i = 0; i < 50; i++) flattenMenuItems(items)
  const times = Array.from({ length: 200 }, () => {
    const start = performance.now()
    const payload = flattenMenuItems(items)
    if (payload.length !== count) throw new Error('incorrect payload size')
    return performance.now() - start
  }).sort((a, b) => a - b)
  return { items: count, p50Ms: times[100], p95Ms: times[190] }
})
console.log(
  JSON.stringify(
    {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      dirty: Boolean(
        execFileSync(
          'git',
          ['status', '--porcelain', '--', new URL('..', import.meta.url).pathname],
          { encoding: 'utf8' }
        ).trim()
      ),
      runtime: `Bun ${Bun.version}`,
      javascript: {
        minifiedBytes: Buffer.byteLength(javascript),
        gzipBytes: gzipSync(javascript).byteLength,
        externals: ['react', 'react-native'],
      },
      menuFlatten: samples,
    },
    null,
    2
  )
)
