import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { arch, cpus, hostname, platform } from 'node:os'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const value = (name: string, fallback: string) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}
const root = resolve(value('--root', '.'))
const output = resolve(value('--output', '/tmp/one-worklets-benchmark.json'))
const samples = Number(value('--samples', '3'))
if (!Number.isInteger(samples) || samples < 1) throw new Error('samples must be positive')
const repo = resolve(import.meta.dirname, '..')

if (args.includes('--child')) {
  const mode = args[args.indexOf('--mode') + 1]
  const outputFile = args[args.indexOf('--output') + 1]
  process.chdir(root)
  process.env.NODE_ENV = 'production'
  process.env.VXRN_NATIVE_WORKLETS = mode === 'one' ? '1' : '0'
  const startup = performance.now()
  await import('../packages/compiler/dist/esm/index.mjs')
  const compiler = await import('../packages/compiler/dist/cjs/index.cjs')
  process.env.IS_VXRN_CLI = 'true'
  const { loadConfigFromFile } = await import('vite')
  await loadConfigFromFile(
    { mode: 'prod', command: 'build' },
    undefined,
    root,
    undefined,
    undefined,
    'native'
  )
  const oneOptions = globalThis.__oneOptions
  if (!oneOptions) throw new Error('One plugin did not load app options')
  compiler.configureVXRNCompilerPlugin({
    enableReanimated: true,
    enableNativeWorklets: mode === 'one',
    enableCompiler: oneOptions.react?.compiler ?? false,
  })
  const { buildNativeBundle } =
    await import('../packages/vxrn/src/utils/createNativeDevEngine')
  const setupMs = performance.now() - startup
  const results = []
  for (const temperature of ['cold', 'warm']) {
    const workletFiles = new Set<string>()
    const start = performance.now()
    const bundle = await buildNativeBundle({
      root,
      platform: 'ios',
      dev: false,
      minify: false,
      sourcemap: false,
      plugins: [
        {
          name: 'worklets-measurement',
          transform(code, id) {
            if (code.includes('__workletHash')) workletFiles.add(id)
            return null
          },
        },
      ],
    })
    results.push({
      temperature,
      bundleMs: performance.now() - start,
      bytes: Buffer.byteLength(bundle.code),
      sha256: createHash('sha256').update(bundle.code).digest('hex'),
      workletFiles: [...workletFiles].sort(),
    })
  }
  writeFileSync(
    outputFile,
    JSON.stringify({ mode, root, setupMs, results }, null, 2) + '\n'
  )
  process.exit(0)
}

mkdirSync(dirname(output), { recursive: true })
const results = []
for (let sample = 0; sample < samples; sample++) {
  for (const mode of sample % 2 ? ['babel', 'one'] : ['one', 'babel']) {
    const receipt = `${output}.${sample}.${mode}.json`
    const log = `${output}.${sample}.${mode}.log`
    const result = spawnSync(
      process.execPath,
      [
        import.meta.filename,
        '--child',
        '--mode',
        mode,
        '--root',
        root,
        '--output',
        receipt,
      ],
      {
        cwd: repo,
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
      }
    )
    writeFileSync(log, (result.stdout ?? '') + (result.stderr ?? ''))
    if (result.status !== 0)
      throw new Error(`${mode} sample ${sample} failed; see ${log}`)
    results.push({ sample, ...JSON.parse(readFileSync(receipt, 'utf8')) })
    console.info(
      `${mode} sample ${sample}: ${results
        .at(-1)
        .results.map((r: any) => `${r.temperature} ${r.bundleMs.toFixed(1)}ms`)
        .join(', ')}`
    )
  }
}
const git = (cwd: string, ...argv: string[]) =>
  spawnSync('git', argv, { cwd, encoding: 'utf8' }).stdout.trim()
writeFileSync(
  output,
  JSON.stringify(
    {
      host: {
        hostname: hostname(),
        platform: platform(),
        arch: arch(),
        cpu: cpus()[0].model,
        cores: cpus().length,
      },
      source: {
        commit: git(repo, 'rev-parse', 'HEAD'),
        dirty: git(repo, 'status', '--short'),
        appCommit: git(root, 'rev-parse', 'HEAD'),
      },
      method:
        'counterbalanced fresh processes, first and second full iOS production bundles in each process; minify and source maps off; setup measured separately; no OS page-cache purge',
      results,
    },
    null,
    2
  ) + '\n'
)
console.info(`Saved ${output}`)
