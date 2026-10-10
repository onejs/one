import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
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
const nativePlatform = value('--platform', 'ios')
if (nativePlatform !== 'ios' && nativePlatform !== 'android') {
  throw new Error('platform must be ios or android')
}
const development = args.includes('--dev')
const modes = value('--modes', 'one,babel').split(',')
if (!modes.length || modes.some((mode) => mode !== 'one' && mode !== 'babel')) {
  throw new Error('modes must contain one or babel')
}
const repo = resolve(import.meta.dirname, '..')
const babelBaseline = resolve(value('--babel-baseline', repo))

if (args.includes('--child')) {
  const mode = args[args.indexOf('--mode') + 1]
  const outputFile = args[args.indexOf('--output') + 1]
  process.chdir(root)
  process.env.NODE_ENV = development ? 'development' : 'production'
  process.env.VXRN_NATIVE_WORKLETS = mode === 'one' ? '1' : '0'
  const implementationRoot = mode === 'babel' ? babelBaseline : repo
  const startup = performance.now()
  await import(resolve(implementationRoot, 'packages/compiler/dist/esm/index.mjs'))
  const compiler = createRequire(import.meta.url)(
    resolve(implementationRoot, 'packages/compiler/dist/cjs/index.cjs')
  )
  process.env.IS_VXRN_CLI = 'true'
  const { loadConfigFromFile } = await import('vite')
  await loadConfigFromFile(
    { mode: development ? 'dev' : 'prod', command: development ? 'serve' : 'build' },
    undefined,
    root,
    undefined,
    undefined,
    'bundle'
  )
  const oneOptions = globalThis.__oneOptions
  if (!oneOptions) throw new Error('One plugin did not load app options')
  if (oneOptions.native === false)
    throw new Error('This app disables native builds; select the mobile app root')
  compiler.configureVXRNCompilerPlugin({
    enableReanimated: true,
    enableNativeWorklets: mode === 'one',
    enableCompiler: oneOptions.react?.compiler ?? false,
  })
  const { buildNativeBundle } = await import(
    resolve(implementationRoot, 'packages/vxrn/dist/utils/createNativeDevEngine.mjs')
  )
  if (mode === 'babel') {
    const probe = compiler.getBabelOptions({
      id: resolve(root, 'worklets-benchmark-probe.ts'),
      code: "export function probe() { 'worklet'; return 1 }",
      projectRoot: root,
      development,
      environment: nativePlatform,
      reactForRNVersion: '19',
    })
    if (
      !probe?.plugins?.some(
        (plugin: unknown) => typeof plugin === 'string' && plugin.includes('worklets')
      )
    ) {
      throw new Error(
        'The automatic Babel path has been removed. Pass --babel-baseline pointing to a built checkout of baseline 99e6e988e.'
      )
    }
  }
  const setupMs = performance.now() - startup
  const results = []
  for (const temperature of ['cold', 'warm']) {
    const workletFiles = new Set<string>()
    const start = performance.now()
    const bundle = await buildNativeBundle({
      root,
      platform: nativePlatform,
      dev: development,
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
    JSON.stringify(
      { mode, root, platform: nativePlatform, development, setupMs, results },
      null,
      2
    ) + '\n'
  )
  process.exit(0)
}

mkdirSync(dirname(output), { recursive: true })
const results = []
for (let sample = 0; sample < samples; sample++) {
  for (const mode of sample % 2 ? [...modes].reverse() : modes) {
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
        '--platform',
        nativePlatform,
        '--babel-baseline',
        babelBaseline,
        ...(development ? ['--dev'] : []),
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
        babelBaselineCommit: git(babelBaseline, 'rev-parse', 'HEAD'),
      },
      method: `counterbalanced fresh processes, first and second full ${nativePlatform} ${development ? 'development' : 'production'} bundles in each process; minify and source maps off; setup measured separately; no OS page-cache purge`,
      results,
    },
    null,
    2
  ) + '\n'
)
console.info(`Saved ${output}`)
