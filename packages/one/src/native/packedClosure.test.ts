// packed-artifact closure oracle. packs the real workspace tarballs, unpacks
// them into isolated temp dirs, and proves a tarball-only consumer imports
// the foundation contracts through package exports with no workspace path.
// the expected blocker sets below document the current expo-backed baseline;
// shrink them to [] as lanes remove each dependency.
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { auditUnpackedManifest } from './closure'

const here = dirname(fileURLToPath(import.meta.url))
const oneDir = resolve(here, '../..')
const vxrnDir = resolve(here, '../../../vxrn')
const workspaceRoot = resolve(here, '../../..')

const KNOWN_ONE_BLOCKERS = ['babel-preset-expo', 'expo-linking', 'expo-modules-core']
const KNOWN_VXRN_BLOCKERS = ['@expo/config-plugins']

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

describe('packed-artifact closure oracle', () => {
  it('names the current expo blockers from real packed manifests', () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'one-packed-closure-')))
    const onePkg = JSON.parse(
      readFileSync(join(unpack(packToDir(oneDir, tmp), join(tmp, 'one')), 'package.json'), 'utf8')
    )
    expect(auditUnpackedManifest(onePkg)).toEqual(KNOWN_ONE_BLOCKERS)
    const vxrnPkg = JSON.parse(
      readFileSync(
        join(unpack(packToDir(vxrnDir, tmp), join(tmp, 'vxrn')), 'package.json'),
        'utf8'
      )
    )
    expect(auditUnpackedManifest(vxrnPkg)).toEqual(KNOWN_VXRN_BLOCKERS)
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
      'OneNativePlatform',
      'NativeAppManifest',
      'ONE_PUBLIC_PREFIX',
      'createResolutionRecorder',
    ]) {
      expect(dts).toContain(name)
    }
    const exportsMap = JSON.parse(
      readFileSync(join(extracted, 'package.json'), 'utf8')
    ).exports
    expect(exportsMap['./native'].import).toBe('./dist/esm/native/index.mjs')
  })

  it('imports one/native in a tarball-only consumer with no workspace path', () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'one-packed-consumer-')))
    const extracted = unpack(packToDir(oneDir, tmp), join(tmp, 'one'))
    const consumerModules = join(tmp, 'consumer', 'node_modules')
    mkdirSync(consumerModules, { recursive: true })
    symlinkSync(extracted, join(consumerModules, 'one'))
    const script = `
const url = await import.meta.resolve('one/native');
if (url.includes(${JSON.stringify(workspaceRoot)})) throw new Error('resolved into the workspace: ' + url);
const m = await import('one/native');
m.validateNativeApp({ name: 'T', ios: { bundleId: 'a.b' }, android: { applicationId: 'a.b' } });
if (m.selectOneNativePlatform('ios').name !== 'ios') throw new Error('adapter selection broken');
if (m.pickOnePublicEnv({ ONE_PUBLIC_A: '1' }).ONE_PUBLIC_A !== '1') throw new Error('env contract broken');
const r = m.createResolutionRecorder();
r.record('one', 'app/index.ts');
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
}, 180000)
