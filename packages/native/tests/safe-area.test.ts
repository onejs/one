import { describe, expect, it, vi } from 'vitest'
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildSafeAreaInsetStyle,
  providerEventToMetrics,
  resolveSafeAreaEdgeModes,
} from '../src/safe-area/insets'

const testDir = dirname(fileURLToPath(import.meta.url))
const packageDir = join(testDir, '..')

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: vi.fn() },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

const insets = { top: 59, right: 0, bottom: 34, left: 0 }
const payload = {
  insetTop: 59,
  insetRight: 0,
  insetBottom: 34,
  insetLeft: 0,
  frameX: 0,
  frameY: 0,
  frameWidth: 393,
  frameHeight: 852,
}

describe('resolveSafeAreaEdgeModes', () => {
  it('applies every edge additively when edges are omitted', () => {
    expect(resolveSafeAreaEdgeModes()).toEqual({
      top: 'additive',
      right: 'additive',
      bottom: 'additive',
      left: 'additive',
    })
    expect(resolveSafeAreaEdgeModes(null)).toEqual(resolveSafeAreaEdgeModes())
  })

  it('treats an array as the additive edges and turns the rest off', () => {
    expect(resolveSafeAreaEdgeModes(['top', 'bottom'])).toEqual({
      top: 'additive',
      right: 'off',
      bottom: 'additive',
      left: 'off',
    })
  })

  it('honors per-edge modes and turns unknown modes off', () => {
    expect(
      resolveSafeAreaEdgeModes({ top: 'maximum', bottom: 'off', left: 'bogus' as never })
    ).toEqual({ top: 'maximum', right: 'off', bottom: 'off', left: 'off' })
  })
})

describe('buildSafeAreaInsetStyle', () => {
  it('adds insets to padding by default', () => {
    expect(buildSafeAreaInsetStyle({ insets })).toEqual({
      paddingTop: 59,
      paddingRight: 0,
      paddingBottom: 34,
      paddingLeft: 0,
    })
  })

  it('sums the style base with the inset, resolving shorthands outward', () => {
    expect(
      buildSafeAreaInsetStyle({
        insets,
        style: [{ padding: 10, paddingVertical: 20 }, { paddingTop: 4 }],
      })
    ).toEqual({ paddingTop: 63, paddingRight: 10, paddingBottom: 54, paddingLeft: 10 })
  })

  it('keeps the larger of base and inset under maximum and skips off edges', () => {
    expect(
      buildSafeAreaInsetStyle({
        insets,
        mode: 'margin',
        edges: { top: 'maximum', bottom: 'maximum', left: 'off' },
        style: { marginTop: 100, marginBottom: 10 },
      })
    ).toEqual({ marginTop: 100, marginRight: 0, marginBottom: 34, marginLeft: 0 })
  })

  it('applies only the listed edges from an array', () => {
    expect(buildSafeAreaInsetStyle({ insets, edges: ['bottom'] })).toEqual({
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 34,
      paddingLeft: 0,
    })
  })
})

describe('providerEventToMetrics', () => {
  it('reshapes the flat event into context metrics', () => {
    expect(providerEventToMetrics(payload)).toEqual({
      insets: { top: 59, right: 0, bottom: 34, left: 0 },
      frame: { x: 0, y: 0, width: 393, height: 852 },
    })
  })

  it.each(['insetTop', 'frameWidth'] as const)('throws on a non-finite %s', (field) => {
    expect(() => providerEventToMetrics({ ...payload, [field]: Number.NaN })).toThrow(
      `non-finite ${field}`
    )
  })
})

describe('native safe-area module', () => {
  it('registers the provider host under its Fabric name', async () => {
    const { NativeSafeAreaProvider } = await import('../src/safe-area/index.native')
    expect(NativeSafeAreaProvider).toEqual({ __component: 'OneNativeSafeAreaProvider' })
  })

  it('reads synchronous constants from a TurboModule-shaped module', async () => {
    const { TurboModuleRegistry } = await import('react-native')
    const metrics = {
      insets: { top: 59, right: 0, bottom: 34, left: 0 },
      frame: { x: 0, y: 0, width: 393, height: 852 },
    }
    vi.mocked(TurboModuleRegistry.get).mockReturnValue({
      getConstants: () => ({ initialWindowMetrics: metrics }),
    })
    const { getInitialWindowMetrics } = await import('../src/safe-area/index.native')
    expect(getInitialWindowMetrics()).toEqual(metrics)
  })

  it('reads legacy constants merged onto the module object', async () => {
    const { TurboModuleRegistry } = await import('react-native')
    const metrics = {
      insets: { top: 59, right: 0, bottom: 34, left: 0 },
      frame: { x: 0, y: 0, width: 393, height: 852 },
    }
    vi.mocked(TurboModuleRegistry.get).mockReturnValue({ initialWindowMetrics: metrics })
    const { getInitialWindowMetrics } = await import('../src/safe-area/index.native')
    expect(getInitialWindowMetrics()).toEqual(metrics)
  })

  it('returns null when the module is missing or malformed', async () => {
    const { TurboModuleRegistry } = await import('react-native')
    const { getInitialWindowMetrics } = await import('../src/safe-area/index.native')
    vi.mocked(TurboModuleRegistry.get).mockReturnValue(null)
    expect(getInitialWindowMetrics()).toBeNull()
    vi.mocked(TurboModuleRegistry.get).mockReturnValue({
      getConstants: () => ({ initialWindowMetrics: { insets: null } }),
    })
    expect(getInitialWindowMetrics()).toBeNull()
  })
})

describe('cold dev boot', () => {
  // the web entries must bundle for the browser with only the exact
  // react-native specifier aliased, the way every One vite config aliases
  // it. any deep react-native/Libraries import in the graph resolves to the
  // real Flow-typed file, which esbuild cannot parse, so the bundler itself
  // is the oracle: success means no interception is needed at serve time.
  const bundleWebEntry = (entry: string) =>
    build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      platform: 'browser',
      format: 'esm',
      external: ['react'],
      plugins: [
        {
          name: 'exact-react-native-alias',
          setup(build) {
            build.onResolve({ filter: /^react-native$/ }, async (args) => {
              const resolved = await build.resolve('react-native-web', {
                importer: args.importer,
                kind: args.kind,
                resolveDir: dirname(args.importer),
              })
              if (resolved.errors.length) return { errors: resolved.errors }
              return { path: resolved.path }
            })
          },
        },
      ],
    })

  it('bundles the @vxrn/safe-area web entry without native-only imports', async () => {
    const result = await bundleWebEntry(
      join(packageDir, '..', 'safe-area', 'src', 'index.ts')
    )
    expect(result.outputFiles.length).toBeGreaterThan(0)
  })

  it('bundles the @vxrn/native/safe-area web entry without the Fabric spec', async () => {
    const result = await bundleWebEntry(join(packageDir, 'src', 'safe-area', 'index.ts'))
    expect(result.outputFiles.length).toBeGreaterThan(0)
  })
})
