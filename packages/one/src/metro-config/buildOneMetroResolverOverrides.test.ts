import path from 'node:path'
import { describe, expect, it } from 'vitest'
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

    if (!resolveRequest) {
      throw new Error('expected a Metro resolver override')
    }

    resolveRequest({ originModulePath: nestedOrigin }, 'react-native-worklets', 'ios')
    resolveRequest(
      { originModulePath: nestedOrigin },
      'react-native-worklets/package.json',
      'ios'
    )
    resolveRequest(
      { originModulePath: nestedOrigin },
      'react-native-safe-area-context',
      'ios'
    )

    expect(resolvedOrigins).toEqual([
      `react-native-worklets:${path.join(projectRoot, 'package.json')}`,
      `react-native-worklets/package.json:${path.join(projectRoot, 'package.json')}`,
      `react-native-safe-area-context:${nestedOrigin}`,
    ])
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
