import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  assertDependencyClosure,
  assertNoExpoPublicEnv,
  assertNotWorkspaceSource,
  assertOneNativePlatform,
  buildOneEnvDefines,
  checkOneBindingDeterministic,
  createOneResolutionRecorder,
  emitOneBinding,
  isForbiddenExpoSpecifier,
  resolvedDependencyInventory,
  selectOneNativePlatform,
  validateNativeApp,
  verifyAgainstOfficial,
  type OneDeclarationSpec,
  type OneGeneratorSchema,
  type OneNativePlatform,
} from './index'

const packageDirectory = fileURLToPath(new URL('../../', import.meta.url))

describe('optional root one export', () => {
  test('web entrypoint does not statically import the native implementation', () => {
    const source = readFileSync(`${packageDirectory}/src/index.ts`, 'utf8')
    const staticImports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
      (match) => match[1]
    )
    expect(
      staticImports.filter(
        (specifier) =>
          specifier === '@vxrn/native' || specifier.startsWith('@vxrn/native/')
      )
    ).toEqual([])
  })

  test('package root export keeps a separate react-native condition', () => {
    const packageJson = JSON.parse(
      readFileSync(`${packageDirectory}/package.json`, 'utf8')
    )
    const root = packageJson.exports['.'] as Record<string, string>
    expect(root['react-native']).toBeDefined()
    expect(root['react-native']).not.toBe(root['import'])
  })
})

function completeAdapter(platform: OneNativePlatform['platform']): OneNativePlatform {
  return {
    platform,
    domains: { linking: { open: () => {} } },
    ui: { button: {} },
    generated: { ios: {}, android: {} },
  }
}

describe('OneNativePlatform contract', () => {
  test('web, ios, android, and rnx adapters pass', () => {
    for (const platform of ['web', 'ios', 'android', 'rnx'] as const) {
      expect(() => assertOneNativePlatform(completeAdapter(platform))).not.toThrow()
    }
  })

  test('missing required entries fail', () => {
    const { ui, ...withoutUi } = completeAdapter('ios')
    void ui
    expect(() => assertOneNativePlatform(withoutUi)).toThrow('adapter.ui is required')
    expect(() =>
      assertOneNativePlatform({ ...completeAdapter('ios'), generated: { ios: {} } })
    ).toThrow('adapter.generated.android is required')
  })

  test('build-time selection returns the named adapter without probing', () => {
    const adapters = {
      web: completeAdapter('web'),
      ios: completeAdapter('ios'),
      android: completeAdapter('android'),
      rnx: completeAdapter('rnx'),
    }
    expect(selectOneNativePlatform('android', adapters).platform).toBe('android')
    expect(() =>
      selectOneNativePlatform('ios', { ...adapters, ios: completeAdapter('android') })
    ).toThrow()
  })
})

const appleDeclaration: OneDeclarationSpec = {
  namespace: 'One.ios',
  typeName: 'Haptics',
  member: 'impact',
  parameters: [{ label: 'style', name: 'style', type: 'ImpactStyle', optional: false }],
  returns: 'void',
  errors: ['HapticsUnavailable'],
  availability: 'ios 17',
  provenance: { source: 'apple-sdk@26', symbol: 'SwiftUI.Haptics.impact' },
}

const androidDeclaration: OneDeclarationSpec = {
  namespace: 'One.android',
  typeName: 'Haptics',
  member: 'vibrate',
  parameters: [{ label: '_', name: 'duration', type: 'number', optional: true }],
  returns: 'void',
  errors: ['VibratorUnavailable'],
  availability: 'api 26',
  provenance: { source: 'android-sdk@36', symbol: 'android.os.Vibrator.vibrate' },
}

const schema: OneGeneratorSchema = {
  declarations: [appleDeclaration, androidDeclaration],
  representationChanges: [
    {
      kind: 'ts',
      description: 'labeled parameters become positional options objects',
      from: 'impact(style:)',
      to: 'impact(options: { style })',
    },
  ],
}

describe('generator mechanism', () => {
  test('representative apple and android declarations regenerate byte-identically', () => {
    const emitted = emitOneBinding(schema)
    expect(emitted.typescript).toContain('One.ios')
    expect(emitted.typescript).toContain('One.android')
    expect(emitted.typescript).toContain('Haptics')
    expect(() => checkOneBindingDeterministic(schema, emitted)).not.toThrow()
    // stable across key order and declaration order
    const reordered: OneGeneratorSchema = {
      declarations: [androidDeclaration, appleDeclaration],
      representationChanges: [...schema.representationChanges],
    }
    expect(emitOneBinding(reordered).native).toBe(emitted.native)
  })

  test('hand rename or signature drift fails the check', () => {
    const emitted = emitOneBinding(schema)
    const renamed = {
      ...emitted,
      typescript: emitted.typescript.replace('impact', 'impactRenamed'),
    }
    expect(() => checkOneBindingDeterministic(schema, renamed)).toThrow('drifted')
    const drifted = { ...appleDeclaration, member: 'impactRenamed' }
    expect(() => verifyAgainstOfficial(appleDeclaration, drifted)).toThrow('drifted')
    const reordered = {
      ...appleDeclaration,
      parameters: [
        { label: 'extra', name: 'extra', type: 'string', optional: true },
        ...appleDeclaration.parameters,
      ],
    }
    expect(() => verifyAgainstOfficial(appleDeclaration, reordered)).toThrow(
      'parameter labels or ordering changed'
    )
  })
})

const validApp = {
  name: 'SootApp',
  displayName: 'Soot',
  scheme: 'soot',
  version: '1.0.0',
  ios: { bundleId: 'dev.soot.app', supportsTablet: true, deploymentTarget: '17.0' },
  android: { applicationId: 'dev.soot.app', minSdk: 26 },
}

describe('native.app manifest', () => {
  test('valid manifest passes and preserves the native target name', () => {
    expect(validateNativeApp(validApp).name).toBe('SootApp')
  })

  test('missing platform ids and invalid target names fail before writing', () => {
    expect(() =>
      validateNativeApp({ ...validApp, ios: {} })
    ).toThrow('ios.bundleId is required')
    expect(() =>
      validateNativeApp({ ...validApp, android: {} })
    ).toThrow('android.applicationId is required')
    expect(() => validateNativeApp({ ...validApp, name: 'my-app' })).toThrow(
      'native.app.name must start with a letter'
    )
  })
})

describe('packed-artifact closure oracle', () => {
  test('inventory is deterministic and clean graphs pass', () => {
    expect(resolvedDependencyInventory({ b: '1', a: '1' }, ['c'])).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(() =>
      assertDependencyClosure({ one: '1', react: '19', 'react-native': '0.81' })
    ).not.toThrow()
  })

  test('forbidden expo packages fail, lookalikes pass', () => {
    for (const specifier of [
      'expo',
      'expo-constants',
      'expo/router',
      '@expo/cli',
      'expo-modules-core',
      '@expo/config-plugins',
      'babel-preset-expo',
    ]) {
      expect(isForbiddenExpoSpecifier(specifier)).toBe(true)
      expect(() => assertDependencyClosure({ [specifier]: '1' })).toThrow(
        'forbidden expo packages'
      )
    }
    expect(isForbiddenExpoSpecifier('exponential')).toBe(false)
    expect(isForbiddenExpoSpecifier('@exposition/core')).toBe(false)
  })

  test('tarball fixtures must not resolve workspace source', () => {
    expect(() =>
      assertNotWorkspaceSource('/tmp/fixture/node_modules/one', ['/repo'])
    ).not.toThrow()
    expect(() => assertNotWorkspaceSource('/repo/packages/one', ['/repo'])).toThrow(
      'workspace source'
    )
  })
})

describe('module-resolution recorder', () => {
  test('positive control records a runtime dynamic import', () => {
    const recorder = createOneResolutionRecorder()
    recorder.record({ type: 'import', specifier: 'one', source: 'app/index.ts' })
    expect(recorder.events()).toHaveLength(1)
    expect(() => recorder.assertNoForbidden()).not.toThrow()
  })

  test('negative control rejects forbidden expo packages and source paths', () => {
    const recorder = createOneResolutionRecorder({ forbidSourcePaths: ['/repo/packages'] })
    expect(() =>
      recorder.record({ type: 'import', specifier: 'expo-constants', source: 'app/x.ts' })
    ).toThrow('forbidden expo package')
    expect(() =>
      recorder.record({ type: 'import', specifier: 'one', source: '/repo/packages/one/x.ts' })
    ).toThrow('forbidden source path')
  })
})

describe('ONE_PUBLIC_* / ONE_PLATFORM contract', () => {
  test('equal semantics across web, ios, and android', () => {
    for (const platform of ['web', 'ios', 'android'] as const) {
      const define = buildOneEnvDefines({
        platform,
        publicEnv: { ONE_PUBLIC_API: 'https://api.example' },
        dev: false,
      })
      expect(define['process.env.ONE_PLATFORM']).toBe(JSON.stringify(platform))
      expect(define['import.meta.env.ONE_PLATFORM']).toBe(JSON.stringify(platform))
      expect(define['process.env.ONE_PUBLIC_API']).toBe('"https://api.example"')
      expect(define['import.meta.env.ONE_PUBLIC_API']).toBe('"https://api.example"')
      const whole = JSON.parse(define['import.meta.env'])
      expect(whole.ONE_PLATFORM).toBe(platform)
      expect(whole.ONE_PUBLIC_API).toBe('https://api.example')
      expect('EXPO_OS' in whole).toBe(false)
      expect(Object.keys(define).some((key) => key.includes('EXPO'))).toBe(false)
    }
  })

  test('expo-prefixed input fails the build with a migration error', () => {
    expect(() =>
      buildOneEnvDefines({
        platform: 'ios',
        publicEnv: { EXPO_PUBLIC_API: 'x' },
        dev: true,
      })
    ).toThrow('EXPO_PUBLIC_* is not a one environment prefix')
    expect(() => assertNoExpoPublicEnv({ EXPO_OS: 'ios' })).toThrow(
      'EXPO_OS is not a one platform key'
    )
  })
})
