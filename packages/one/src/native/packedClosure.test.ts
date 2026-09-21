// packed-artifact closure oracle. packs the real workspace tarballs, unpacks
// them into isolated temp dirs, and proves a tarball-only consumer imports
// the foundation contracts through package exports with no workspace path.
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { auditUnpackedManifest, findForbiddenDependencies } from './closure'
import { loadUserOneOptions } from '../vite/loadConfig'

const here = dirname(fileURLToPath(import.meta.url))
const oneDir = resolve(here, '../..')
const nativeDir = resolve(here, '../../../native')
const safeAreaDir = resolve(here, '../../../safe-area')
const vxrnDir = resolve(here, '../../../vxrn')
const vitePluginMetroDir = resolve(here, '../../../vite-plugin-metro')
const utilsDir = resolve(here, '../../../utils')
const workspaceRoot = resolve(here, '../../..')
const basicStarterDir = resolve(workspaceRoot, '../examples/one-basic')

const KNOWN_ONE_BLOCKERS: string[] = []
const KNOWN_VXRN_BLOCKERS: string[] = []
const KNOWN_VITE_PLUGIN_METRO_BLOCKERS: string[] = []

function packToDir(packageDir: string, outDir: string): string {
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
  const fileName = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
  execFileSync('bun', ['pm', 'pack', '--destination', outDir], {
    cwd: packageDir,
    encoding: 'utf8',
  })
  const tarball = join(outDir, fileName)
  expect(existsSync(tarball)).toBe(true)
  return tarball
}

function unpack(tarball: string, destDir: string): string {
  mkdirSync(destDir, { recursive: true })
  execFileSync('tar', ['-xzf', tarball, '-C', destDir])
  return join(destDir, 'package')
}

function getInstalledPackageNames(nodeModulesDir: string): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  const visitPackage = (packageDir: string) => {
    const realDir = realpathSync(packageDir)
    if (seen.has(realDir)) return
    seen.add(realDir)
    const manifest = JSON.parse(readFileSync(join(realDir, 'package.json'), 'utf8'))
    if (typeof manifest.name === 'string') names.push(manifest.name)
    visitNodeModules(join(realDir, 'node_modules'))
  }

  const visitNodeModules = (dir: string) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const entryPath = join(dir, entry.name)
      if (entry.name.startsWith('@')) {
        for (const child of readdirSync(entryPath, { withFileTypes: true })) {
          if (child.isDirectory() || child.isSymbolicLink()) {
            visitPackage(join(entryPath, child.name))
          }
        }
      } else if (entry.isDirectory() || entry.isSymbolicLink()) {
        visitPackage(entryPath)
      }
    }
  }

  visitNodeModules(nodeModulesDir)
  return names.sort()
}

describe('packed-artifact closure oracle', () => {
  it('keeps the packed framework manifests free of Expo dependencies', () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'one-packed-closure-')))
    const onePkg = JSON.parse(
      readFileSync(
        join(unpack(packToDir(oneDir, tmp), join(tmp, 'one')), 'package.json'),
        'utf8'
      )
    )
    expect(auditUnpackedManifest(onePkg)).toEqual(KNOWN_ONE_BLOCKERS)
    expect(onePkg.dependencies).not.toHaveProperty(
      '@react-native-masked-view/masked-view'
    )
    expect(onePkg.peerDependencies).not.toHaveProperty('react-native-safe-area-context')
    for (const { packageDir, name } of [
      { packageDir: nativeDir, name: 'native' },
      { packageDir: safeAreaDir, name: 'safe-area' },
    ]) {
      const manifest = JSON.parse(
        readFileSync(
          join(unpack(packToDir(packageDir, tmp), join(tmp, name)), 'package.json'),
          'utf8'
        )
      )
      expect(auditUnpackedManifest(manifest)).toEqual([])
      if (name === 'native') {
        expect(manifest.peerDependencies).not.toHaveProperty(
          'react-native-safe-area-context'
        )
      }
    }
    const vxrnPkg = JSON.parse(
      readFileSync(
        join(unpack(packToDir(vxrnDir, tmp), join(tmp, 'vxrn')), 'package.json'),
        'utf8'
      )
    )
    expect(auditUnpackedManifest(vxrnPkg)).toEqual(KNOWN_VXRN_BLOCKERS)
    const vitePluginMetroPkg = JSON.parse(
      readFileSync(
        join(
          unpack(packToDir(vitePluginMetroDir, tmp), join(tmp, 'vite-plugin-metro')),
          'package.json'
        ),
        'utf8'
      )
    )
    expect(auditUnpackedManifest(vitePluginMetroPkg)).toEqual(
      KNOWN_VITE_PLUGIN_METRO_BLOCKERS
    )
  })

  it('ships the one/native entrypoint with dist and types in the tarball', () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'one-packed-native-')))
    const extracted = unpack(packToDir(oneDir, tmp), join(tmp, 'one'))
    for (const target of [
      'dist/esm/native/index.mjs',
      'dist/cjs/native/index.cjs',
      'types/native/index.d.ts',
    ]) {
      expect(existsSync(join(extracted, target))).toBe(true)
    }
    const dts = readFileSync(join(extracted, 'types/native/index.d.ts'), 'utf8')
    for (const name of [
      'NativeAppManifest',
      'ONE_PUBLIC_PREFIX',
      'ONE_PLATFORM_ENV',
      'pickOnePublicEnv',
      'validateNativeApp',
    ]) {
      expect(dts).toContain(name)
    }
    // the closure oracle stays test-internal: one/native publishes only the
    // app and env contracts, never a customer-facing Expo ban.
    for (const name of [
      'createResolutionRecorder',
      'findForbiddenDependencies',
      'isForbiddenExpoSpecifier',
      'FORBIDDEN_EXPO_PATTERN_SOURCES',
      'OneNativePlatform',
      'selectOneNativePlatform',
    ]) {
      expect(dts).not.toContain(name)
    }
    const exportsMap = JSON.parse(
      readFileSync(join(extracted, 'package.json'), 'utf8')
    ).exports
    expect(exportsMap['./native'].import).toBe('./dist/esm/native/index.mjs')
  })

  it('imports one/native in a tarball-only consumer with no workspace path', () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'one-packed-consumer-')))
    const consumerModules = join(tmp, 'consumer', 'node_modules')
    mkdirSync(consumerModules, { recursive: true })
    const extracted = join(consumerModules, 'one')
    renameSync(unpack(packToDir(oneDir, tmp), join(tmp, 'one')), extracted)
    mkdirSync(join(consumerModules, '@vxrn'), { recursive: true })
    renameSync(
      unpack(packToDir(utilsDir, tmp), join(tmp, 'utils')),
      join(consumerModules, '@vxrn', 'utils')
    )
    const script = `
const url = await import.meta.resolve('one/native');
if (url.includes(${JSON.stringify(workspaceRoot)})) throw new Error('resolved into the workspace: ' + url);
const utilsUrl = await import.meta.resolve('@vxrn/utils/publicEnv');
if (utilsUrl.includes(${JSON.stringify(workspaceRoot)})) throw new Error('utils resolved into the workspace: ' + utilsUrl);
const m = await import('one/native');
m.validateNativeApp({ name: 'T', ios: { bundleId: 'a.b' }, android: { applicationId: 'a.b' } });
if (m.pickOnePublicEnv({ ONE_PUBLIC_A: '1' }).ONE_PUBLIC_A !== '1') throw new Error('env contract broken');
if (m.ONE_PUBLIC_PREFIX !== 'ONE_PUBLIC_' || m.ONE_PLATFORM_ENV !== 'ONE_PLATFORM') throw new Error('env names broken');
if ('createResolutionRecorder' in m || 'selectOneNativePlatform' in m || 'findForbiddenDependencies' in m) throw new Error('test-only oracle leaked into one/native');
console.log('one/native ok ' + url);
`
    const out = execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', script],
      { cwd: join(tmp, 'consumer'), encoding: 'utf8' }
    )
    expect(out).toContain('one/native ok')
    expect(out).not.toContain(workspaceRoot)
  })

  it('installs and bundles the packed framework closure without Expo', () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'one-packed-metro-')))
    const tarballs = join(tmp, 'tarballs')
    mkdirSync(tarballs)
    const oneTarball = packToDir(oneDir, tarballs)
    const nativeTarball = packToDir(nativeDir, tarballs)
    const safeAreaTarball = packToDir(safeAreaDir, tarballs)
    const vxrnTarball = packToDir(vxrnDir, tarballs)
    const metroPluginTarball = packToDir(vitePluginMetroDir, tarballs)
    const utilsTarball = packToDir(utilsDir, tarballs)
    const appDir = join(tmp, 'app')
    mkdirSync(join(appDir, 'app'), { recursive: true })
    writeFileSync(join(appDir, '.watchmanconfig'), '{}\n')

    writeFileSync(
      join(appDir, 'package.json'),
      JSON.stringify(
        {
          private: true,
          type: 'module',
          dependencies: {
            one: `file:${oneTarball}`,
            '@vxrn/native': `file:${nativeTarball}`,
            '@vxrn/safe-area': `file:${safeAreaTarball}`,
            vxrn: `file:${vxrnTarball}`,
            '@vxrn/vite-plugin-metro': `file:${metroPluginTarball}`,
            '@vxrn/utils': `file:${utilsTarball}`,
            react: '19.2.3',
            'react-native': '0.87.1',
            'react-native-web': '^0.21.2',
            vite: '^8.2.2',
            metro: '^0.87.0',
            'metro-config': '^0.87.0',
          },
          overrides: {
            vxrn: `file:${vxrnTarball}`,
            '@vxrn/native': `file:${nativeTarball}`,
            '@vxrn/safe-area': `file:${safeAreaTarball}`,
            '@vxrn/vite-plugin-metro': `file:${metroPluginTarball}`,
            '@vxrn/utils': `file:${utilsTarball}`,
          },
        },
        null,
        2
      )
    )
    writeFileSync(
      join(appDir, 'babel.config.cjs'),
      `module.exports = {
  presets: [
    '@react-native/babel-preset',
    ['one/babel-preset', { projectRoot: __dirname }],
  ],
}\n`
    )
    writeFileSync(
      join(appDir, 'metro.config.cjs'),
      `const { withOne } = require('one/metro-config')
module.exports = withOne(__dirname, { loadViteConfig: false })
`
    )
    writeFileSync(
      join(appDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: '.', paths: {} } })
    )
    writeFileSync(
      join(appDir, 'app/index.tsx'),
      `import React from 'react'
import { Text } from 'react-native'
import { One } from 'one'
export default function App() {
  void One.iOS.Button
  void One.Android.Button
  void One.UI.Blur
  void One.UI.SafeArea.View
  return <Text>packed metro ok</Text>
}
`
    )

    execFileSync('bun', ['install', '--ignore-scripts'], {
      cwd: appDir,
      encoding: 'utf8',
      timeout: 180_000,
    })

    const installedNames = getInstalledPackageNames(join(appDir, 'node_modules'))
    expect(findForbiddenDependencies(installedNames)).toEqual([])

    const resolutionScript = `
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
for (const specifier of [
  'one/package.json',
  '@vxrn/native/package.json',
  '@vxrn/safe-area/package.json',
  'vxrn/package.json',
  '@vxrn/vite-plugin-metro/package.json',
  '@react-native/metro-config/package.json',
  '@react-native/babel-preset/package.json',
]) {
  const url = await import.meta.resolve(specifier)
  if (url.includes(${JSON.stringify(workspaceRoot)})) {
    throw new Error('resolved into the workspace: ' + url)
  }
}
const config = require('one/react-native-config')
const nativeRoot = config.dependencies['@vxrn/native'].root
if (nativeRoot.includes(${JSON.stringify(workspaceRoot)})) {
  throw new Error('react-native config resolved into the workspace: ' + nativeRoot)
}
if (require(nativeRoot + '/package.json').name !== '@vxrn/native') {
  throw new Error('react-native config did not resolve the packed native package')
}
`
    execFileSync(process.execPath, ['--input-type=module', '--eval', resolutionScript], {
      cwd: appDir,
      encoding: 'utf8',
    })

    for (const dev of ['true', 'false']) {
      const bundlePath = join(appDir, `bundle.${dev}.js`)
      execFileSync(
        join(appDir, 'node_modules/.bin/metro'),
        [
          'build',
          'node_modules/one/metro-entry.js',
          '--config',
          'metro.config.cjs',
          '--platform',
          'ios',
          '--dev',
          dev,
          '--minify',
          dev === 'false' ? 'true' : 'false',
          '--out',
          bundlePath,
        ],
        { cwd: appDir, encoding: 'utf8', timeout: 180_000 }
      )
      expect(readFileSync(bundlePath).byteLength).toBeGreaterThan(1_000_000)
    }
  })

  it('keeps the generated Basic starter on the zero-Expo One contract', async () => {
    const packageJson = JSON.parse(
      readFileSync(join(basicStarterDir, 'package.json'), 'utf8')
    )
    expect(auditUnpackedManifest(packageJson)).toEqual([])
    expect(packageJson.dependencies).not.toHaveProperty('react-native-safe-area-context')
    expect(packageJson.devDependencies).toHaveProperty('@react-native-community/template')
    expect(existsSync(join(basicStarterDir, 'app.json'))).toBe(false)

    const previousCwd = process.cwd()
    const previousTestMetro = process.env.TEST_METRO
    try {
      process.chdir(basicStarterDir)
      delete process.env.TEST_METRO
      const rolldown = await loadUserOneOptions('build', true)
      expect(rolldown.oneOptions.native).toMatchObject({
        app: {
          name: 'OneBasic',
          ios: { bundleId: 'com.natew.oneexample' },
          android: { applicationId: 'com.natew.oneexample' },
        },
      })
      expect(rolldown.oneOptions.native).not.toHaveProperty('bundler')

      process.env.TEST_METRO = '1'
      const metro = await loadUserOneOptions('build', true)
      expect(metro.oneOptions.native).toMatchObject({ bundler: 'metro' })
    } finally {
      process.chdir(previousCwd)
      if (previousTestMetro === undefined) delete process.env.TEST_METRO
      else process.env.TEST_METRO = previousTestMetro
    }
  })
}, 180000)
