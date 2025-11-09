import type { TransformOptions } from '@babel/core'
import type Server from 'metro/private/Server'
import type { ResolvedConfig } from 'vite'
import type { MetroPluginOptions } from '../plugins/metroPlugin'
import type { ViteCustomTransformOptions } from '../transformer/types'
import { getMetroBabelConfigFromViteConfig } from './getMetroBabelConfigFromViteConfig'

/**
 * Deep merges babel configs, properly handling arrays like plugins and presets
 */
function deepMergeBabelConfig(
  base: TransformOptions,
  override: TransformOptions | undefined
): TransformOptions {
  if (!override) return base

  const merged: TransformOptions = {
    ...base,
    ...override,
  }

  // Deep merge plugins - concatenate arrays
  if (base.plugins || override.plugins) {
    merged.plugins = [...(base.plugins || []), ...(override.plugins || [])]
  }

  // Deep merge presets - concatenate arrays
  if (base.presets || override.presets) {
    merged.presets = [...(base.presets || []), ...(override.presets || [])]
  }

  // Deep merge env if both exist
  if (base.env && override.env) {
    merged.env = { ...base.env }
    for (const [key, value] of Object.entries(override.env)) {
      if (value) {
        merged.env[key] = deepMergeBabelConfig(base.env[key] || {}, value)
      }
    }
  }

  // Deep merge parserOpts if both exist
  if (base.parserOpts && override.parserOpts) {
    merged.parserOpts = {
      ...base.parserOpts,
      ...override.parserOpts,
      // Merge plugins arrays if both exist
      ...(base.parserOpts.plugins || override.parserOpts.plugins
        ? {
            plugins: [
              ...(base.parserOpts.plugins || []),
              ...(override.parserOpts.plugins || []),
            ],
          }
        : {}),
    }
  }

  // Deep merge generatorOpts if both exist
  if (base.generatorOpts && override.generatorOpts) {
    merged.generatorOpts = {
      ...base.generatorOpts,
      ...override.generatorOpts,
    }
  }

  return merged
}

export function patchMetroServerWithViteConfigAndMetroPluginOptions(
  metroServer: Server,
  config: ResolvedConfig,
  options: MetroPluginOptions
) {
  // Patch transformFile to inject custom transform options.
  const originalTransformFile = metroServer
    .getBundler()
    .getBundler()
    .transformFile.bind(metroServer.getBundler().getBundler())

  const defaultBabelConfig = getMetroBabelConfigFromViteConfig(config)

  metroServer.getBundler().getBundler().transformFile = async (
    filePath: string,
    transformOptions: Parameters<typeof originalTransformFile>[1],
    fileBuffer?: Parameters<typeof originalTransformFile>[2]
  ) => {
    // Deep merge babelConfig if provided
    let babelConfig: TransformOptions = deepMergeBabelConfig(defaultBabelConfig, options.babelConfig)

    // Apply babelConfigOverrides for full control
    if (options.babelConfigOverrides) {
      babelConfig = options.babelConfigOverrides(babelConfig)
    }

    const viteCustomTransformOptions: ViteCustomTransformOptions = {
      // config: server.config,
      babelConfig,
    }
    return originalTransformFile(
      filePath,
      {
        ...transformOptions,
        customTransformOptions: {
          ...transformOptions.customTransformOptions,
          // Pass into our own babel-transformer
          vite: viteCustomTransformOptions,
        },
      },
      fileBuffer
    )
  }
}
