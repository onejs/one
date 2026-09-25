import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { buildOneMetroResolverOverrides } from './buildOneMetroResolverOverrides'

describe('buildOneMetroResolverOverrides', () => {
  it('resolves every react-native-worklets import from the app root', () => {
    const projectRoot = path.resolve(__dirname, '../../')
    const nestedOrigin = path.join(
      projectRoot,
      'node_modules/react-native-reanimated/src/index.ts'
    )
    const resolvedOrigins: string[] = []
    const config = buildOneMetroResolverOverrides({ projectRoot })({
      resolver: {
        assetExts: ['png'],
        resolveRequest: (
          context: { originModulePath: string },
          moduleName: string,
          _platform: string
        ) => {
          resolvedOrigins.push(`${moduleName}:${context.originModulePath}`)
          return { type: 'sourceFile', filePath: moduleName }
        },
      },
    })
    const resolveRequest = config.resolver?.resolveRequest

    expect(config.resolver?.assetExts).toEqual(['png', 'txt'])

    if (!resolveRequest) {
      throw new Error('expected a Metro resolver override')
    }

    resolveRequest({ originModulePath: nestedOrigin }, 'react-native-worklets', 'ios')
    resolveRequest(
      { originModulePath: nestedOrigin },
      'react-native-worklets/package.json',
      'ios'
    )
    // a library's safe-area import reaches one's own safe area, never the package
    expect(
      resolveRequest(
        { originModulePath: nestedOrigin },
        'react-native-safe-area-context',
        'ios'
      )
    ).toEqual({
      type: 'sourceFile',
      filePath: path.join(projectRoot, 'dist/esm/safe-area-context/index.native.js'),
    })

    expect(resolvedOrigins).toEqual([
      `react-native-worklets:${path.join(projectRoot, 'package.json')}`,
      `react-native-worklets/package.json:${path.join(projectRoot, 'package.json')}`,
    ])
  })

  it('leaves an absorbed package to the app when the app declares it', () => {
    // inside the workspace, so the app still resolves one's own metro helpers
    const projectRoot = mkdtempSync(path.join(__dirname, '.absorbed-'))
    onTestFinished(() => rmSync(projectRoot, { recursive: true }))
    writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({ dependencies: { 'react-native-safe-area-context': '5.8.1' } })
    )
    const config = buildOneMetroResolverOverrides({ projectRoot })({
      resolver: {
        resolveRequest: (_context: unknown, moduleName: string, _platform: string) => ({
          type: 'sourceFile',
          filePath: `app:${moduleName}`,
        }),
      },
    })
    expect(
      config.resolver?.resolveRequest(
        { originModulePath: path.join(projectRoot, 'index.js') },
        'react-native-safe-area-context',
        'ios'
      )
    ).toEqual({ type: 'sourceFile', filePath: 'app:react-native-safe-area-context' })
  })

  it('keeps the compiled react-native-svg native entry point', () => {
    const projectRoot = path.resolve(__dirname, '../../')
    const config = buildOneMetroResolverOverrides({ projectRoot })({
      resolver: {
        resolveRequest: (
          _context: { originModulePath: string },
          moduleName: string,
          _platform: string
        ) => ({
          type: 'sourceFile',
          filePath: path.join(projectRoot, 'node_modules', moduleName, 'src', 'index.ts'),
        }),
      },
    })
    const resolveRequest = config.resolver?.resolveRequest

    if (!resolveRequest) {
      throw new Error('expected a Metro resolver override')
    }

    expect(
      resolveRequest(
        { originModulePath: path.join(projectRoot, 'app.tsx') },
        'react-native-svg',
        'ios'
      )
    ).toEqual({
      type: 'sourceFile',
      filePath: path.join(
        projectRoot,
        'node_modules',
        'react-native-svg',
        'lib',
        'commonjs',
        'index.js'
      ),
    })
  })
})
