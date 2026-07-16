import type { Plugin as RolldownPlugin } from 'rolldown'
import type { Plugin as VitePlugin, PluginOption } from 'vite'

export type NativePluginContext = {
  root: string
  platform: 'ios' | 'android'
  dev: boolean
}

export type NativePluginFactory = (
  context: NativePluginContext
) => RolldownPlugin | readonly RolldownPlugin[]

type NativePluginApi = {
  vxrnNative?: NativePluginFactory
}

/**
 * Adds a native Rolldown implementation to a Vite plugin.
 *
 * VxRN only forwards plugins with this explicit provider into native builds.
 */
export function withNativePlugin(
  plugin: VitePlugin,
  factory: NativePluginFactory
): VitePlugin {
  const api =
    plugin.api && typeof plugin.api === 'object'
      ? (plugin.api as Record<string, unknown>)
      : {}

  return {
    ...plugin,
    api: {
      ...api,
      vxrnNative: factory,
    },
  }
}

export function getNativePlugins(
  plugins: readonly VitePlugin[],
  context: NativePluginContext
): RolldownPlugin[] {
  return plugins.flatMap((plugin) => {
    const api = plugin.api as NativePluginApi | undefined
    const nativePlugin = api?.vxrnNative?.(context)
    const nativePlugins = nativePlugin
      ? Array.isArray(nativePlugin)
        ? [...nativePlugin]
        : [nativePlugin]
      : []

    return nativePlugins.map(normalizeNativePlugin)
  })
}

export async function getNativePluginsFromOptions(
  pluginOptions: readonly PluginOption[],
  context: NativePluginContext
): Promise<RolldownPlugin[]> {
  const plugins: VitePlugin[] = []

  const visit = async (option: PluginOption): Promise<void> => {
    const resolved = await option
    if (!resolved) return
    if (Array.isArray(resolved)) {
      for (const nested of resolved) {
        await visit(nested)
      }
      return
    }
    plugins.push(resolved as VitePlugin)
  }

  for (const option of pluginOptions) {
    await visit(option)
  }
  return getNativePlugins(plugins, context)
}

function normalizeNativePlugin(plugin: RolldownPlugin): RolldownPlugin {
  const transform = plugin.transform
  const { enforce: _enforce, ...normalized } = plugin as RolldownPlugin & {
    enforce?: unknown
  }
  const normalizedTransform =
    transform && typeof transform === 'object' && 'handler' in transform
      ? (({ order: _order, ...hook }) => hook)(transform)
      : transform

  return {
    ...normalized,
    transform: normalizedTransform,
  }
}
