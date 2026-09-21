import { afterEach, describe, expect, it, vi } from 'vitest'
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: getMock },
}))

const testDir = dirname(fileURLToPath(import.meta.url))
const packageDir = join(testDir, '..')

afterEach(() => {
  vi.unstubAllEnvs()
})

// the native snapshot is read once at import, so every case re-imports
// under its own mocked module shape.
async function loadNative() {
  vi.resetModules()
  return import('../src/app-info/index.native')
}

async function loadWeb() {
  vi.resetModules()
  return import('../src/app-info/index')
}

describe('app-info native snapshot', () => {
  it('reads the TurboModule getConstants shape', async () => {
    getMock.mockReturnValue({
      getConstants: () => ({
        version: '9.9.9',
        build: '4242',
        applicationId: 'dev.vxrn.native.tests',
      }),
    })
    const { AppInfo } = await loadNative()
    expect(AppInfo).toEqual({
      version: '9.9.9',
      build: '4242',
      applicationId: 'dev.vxrn.native.tests',
    })
    expect(Object.isFrozen(AppInfo)).toBe(true)
  })

  it('yields all nulls when the module is missing', async () => {
    getMock.mockReturnValue(null)
    const { AppInfo } = await loadNative()
    expect(AppInfo).toEqual({ version: null, build: null, applicationId: null })
    expect(Object.isFrozen(AppInfo)).toBe(true)
  })

  it('yields all nulls when getConstants returns a non-object', async () => {
    getMock.mockReturnValue({ getConstants: () => null })
    const { AppInfo } = await loadNative()
    expect(AppInfo).toEqual({ version: null, build: null, applicationId: null })
  })

  it('nulls non-string fields individually, never guessing', async () => {
    getMock.mockReturnValue({
      getConstants: () => ({
        version: '9.9.9',
        build: 4242,
        applicationId: { id: 'dev.vxrn.native.tests' },
      }),
    })
    const { AppInfo } = await loadNative()
    expect(AppInfo).toEqual({ version: '9.9.9', build: null, applicationId: null })
  })
})

describe('app-info web entry', () => {
  it('reads the build-time manifest defines', async () => {
    vi.stubEnv('ONE_APP_VERSION', '9.9.9')
    vi.stubEnv('ONE_APP_BUILD', '4242')
    vi.stubEnv('ONE_APP_APPLICATION_ID', 'dev.vxrn.native.tests')
    const { AppInfo } = await loadWeb()
    expect(AppInfo).toEqual({
      version: '9.9.9',
      build: '4242',
      applicationId: 'dev.vxrn.native.tests',
    })
    expect(Object.isFrozen(AppInfo)).toBe(true)
  })

  it('yields all nulls outside a one web build', async () => {
    vi.stubEnv('ONE_APP_VERSION', '')
    vi.stubEnv('ONE_APP_BUILD', '')
    vi.stubEnv('ONE_APP_APPLICATION_ID', '')
    const { AppInfo } = await loadWeb()
    expect(AppInfo).toEqual({ version: null, build: null, applicationId: null })
  })
})

describe('cold dev boot', () => {
  // same oracle as the safe-area web entry: the app-info web entry must
  // bundle for the browser with only the exact react-native specifier
  // aliased. success means no interception is needed at serve time.
  it('bundles the @vxrn/native/app-info web entry without native-only imports', async () => {
    const result = await build({
      entryPoints: [join(packageDir, 'src', 'app-info', 'index.ts')],
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
    expect(result.outputFiles.length).toBeGreaterThan(0)
  })
})
