import { rolldown } from 'rolldown'
import type { Plugin as VitePlugin } from 'vite'
import { describe, expect, it } from 'vitest'
import {
  getNativePlugins,
  getNativePluginsFromOptions,
  withNativePlugin,
} from './nativePlugin'

describe('native Vite plugin providers', () => {
  it('only creates explicitly provided native plugins', () => {
    const webOnly = { name: 'web-only' }
    const shared = withNativePlugin({ name: 'shared' }, ({ platform, dev }) => ({
      name: `shared-${platform}-${dev ? 'dev' : 'prod'}`,
    }))

    expect(
      getNativePlugins([webOnly, shared], {
        root: '/project',
        platform: 'android',
        dev: false,
      }).map((plugin) => plugin.name)
    ).toEqual(['shared-android-prod'])
  })

  it('preserves an existing plugin api', () => {
    const plugin = withNativePlugin({ name: 'shared', api: { marker: true } }, () => ({
      name: 'shared-native',
    }))

    expect(plugin.api).toMatchObject({ marker: true })
    expect(typeof (plugin.api as any).vxrnNative).toBe('function')
  })

  it('flattens async Vite plugin options', async () => {
    const provider = withNativePlugin({ name: 'shared' }, () => ({
      name: 'shared-native',
    }))

    const plugins = await getNativePluginsFromOptions(
      [false, Promise.resolve([undefined, provider])],
      { root: '/project', platform: 'ios', dev: true }
    )

    expect(plugins.map((plugin) => plugin.name)).toEqual(['shared-native'])
  })

  it('preserves provider order while resolving async plugin options', async () => {
    let resolveFirst!: (plugin: VitePlugin) => void
    const first = new Promise<VitePlugin>((resolve) => {
      resolveFirst = resolve
    })
    const second = Promise.resolve(
      withNativePlugin({ name: 'second' }, () => ({ name: 'second-native' }))
    )
    const pluginsPromise = getNativePluginsFromOptions([first, second], {
      root: '/project',
      platform: 'ios',
      dev: true,
    })

    resolveFirst(withNativePlugin({ name: 'first' }, () => ({ name: 'first-native' })))

    await expect(
      pluginsPromise.then((plugins) => plugins.map((plugin) => plugin.name))
    ).resolves.toEqual(['first-native', 'second-native'])
  })

  it('runs providers in the fixed native transform slot', async () => {
    const calls = new Map<string, string[]>()
    const record = (id: string, name: string) => {
      const moduleCalls = calls.get(id) ?? []
      moduleCalls.push(name)
      calls.set(id, moduleCalls)
    }
    const provider = withNativePlugin({ name: 'shared' }, () => ({
      name: 'shared-native',
      enforce: 'pre',
      transform: {
        order: 'pre',
        filter: { id: /entry$/ },
        handler(code, id) {
          record(id, 'provider')
          return code
        },
      },
    }))
    const [native] = getNativePlugins([provider], {
      root: '/project',
      platform: 'android',
      dev: false,
    })
    const transform = (name: string) => ({
      name,
      transform(code: string, id: string) {
        record(id, name)
        return code
      },
    })
    const bundle = await rolldown({
      input: 'entry',
      plugins: [
        {
          name: 'fixture',
          resolveId(id, importer) {
            if (id === 'entry') return id
            if (id === './dependency' && importer === 'entry') return 'dependency'
          },
          load(id) {
            if (id === 'entry') return `import './dependency'; export const value = 1`
            if (id === 'dependency') return 'export const dependency = 1'
          },
        },
        transform('compiler'),
        native!,
        transform('flow'),
      ],
    })

    await bundle.generate({ format: 'esm' })
    await bundle.close()

    expect(calls.get('entry')).toEqual(['compiler', 'provider', 'flow'])
    expect(calls.get('dependency')).toEqual(['compiler', 'flow'])
  })
})
