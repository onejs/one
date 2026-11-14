import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const scratch =
  process.env.ONE_ZERO_TEST_DIR ?? join(homedir(), '.scratch', 'one-zero-native')
const dependencies = process.env.ONE_ZERO_DEPENDENCIES
const hermes = process.env.ONE_ZERO_HERMES_ROOT
const simulator = process.env.ONE_ZERO_SIMULATOR
if (!dependencies || !hermes)
  throw new Error(
    'Set ONE_ZERO_DEPENDENCIES to an installed app and ONE_ZERO_HERMES_ROOT to its Hermes distribution'
  )
const require = createRequire(join(dependencies, 'package.json'))
const nitro = dirname(require.resolve('react-native-nitro-modules/package.json'))
const reactNative = dirname(require.resolve('react-native/package.json'))
const sqlite = dirname(require.resolve('@op-engineering/op-sqlite/package.json'))
const build = join(scratch, simulator ? 'build-ios' : 'build')
mkdirSync(scratch, { recursive: true })
const run = mkdtempSync(join(scratch, 'nitro-'))
function command(args: string[]) {
  const result = spawnSync(args[0], args.slice(1), { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr + result.stdout)
  return result.stdout
}
command([
  'cmake',
  '-S',
  resolve(here, '../../cpp/zero'),
  '-B',
  build,
  '-DCMAKE_BUILD_TYPE=Debug',
  `-DOP_SQLITE_ROOT=${sqlite}`,
  `-DNITRO_ROOT=${nitro}`,
  `-DRN_ROOT=${reactNative}`,
  `-DHERMES_ROOT=${hermes}`,
  ...(simulator
    ? [
        '-DCMAKE_SYSTEM_NAME=iOS',
        '-DCMAKE_OSX_SYSROOT=iphonesimulator',
        '-DCMAKE_OSX_ARCHITECTURES=arm64',
        '-DCMAKE_OSX_DEPLOYMENT_TARGET=17.0',
        `-DHERMES_FRAMEWORK=${hermes}/destroot/Library/Frameworks/universal/hermesvm.xcframework/ios-arm64_x86_64-simulator/hermesvm.framework`,
      ]
    : []),
])
command(['cmake', '--build', build, '--target', 'one-zero-nitro', '-j', '4'])
const esbuild = require('esbuild') as typeof import('esbuild')
const bundled = await esbuild.build({
  entryPoints: [process.env.ONE_ZERO_PROBE ?? join(here, 'nitro-probe.ts')],
  write: false,
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: [join(dependencies, 'node_modules')],
  external: ['react-native-nitro-modules'],
})
const babel = require('@babel/core')
const transformed = babel.transformSync(bundled.outputFiles[0].text, {
  presets: [
    [require.resolve('@react-native/babel-preset'), { enableBabelRuntime: false }],
  ],
  babelrc: false,
  configFile: false,
})
writeFileSync(
  join(run, 'probe.js'),
  'function require(name) { if (name === "react-native-nitro-modules") return { NitroModules: globalThis.NitroModulesProxy }; throw Error(name); }\n' +
    transformed.code
)
if (simulator) {
  const home = command(['xcrun', 'simctl', 'getenv', simulator, 'HOME']).trim()
  const temporary = mkdtempSync(join(home, 'tmp', 'one-zero-'))
  try {
    const app = join(temporary, 'one-zero-nitro.app')
    cpSync(join(build, 'one-zero-nitro.app'), app, { recursive: true })
    cpSync(join(run, 'probe.js'), join(temporary, 'probe.js'))
    process.stdout.write(
      command([
        'xcrun',
        'simctl',
        'spawn',
        simulator,
        join(app, 'one-zero-nitro'),
        join(temporary, 'probe.js'),
        temporary,
      ])
    )
  } finally {
    rmSync(temporary, { recursive: true })
  }
} else {
  process.stdout.write(
    command([join(build, 'one-zero-nitro'), join(run, 'probe.js'), run])
  )
}
