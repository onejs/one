import type Server from 'metro/src/Server'
import type { ResolvedConfig } from 'vite'
import type { MetroPluginOptions } from '../plugins/metroPlugin'
import type { ViteCustomTransformOptions } from '../transformer/types'
import { getMetroBabelConfigFromViteConfig } from './getMetroBabelConfigFromViteConfig'

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
    const viteCustomTransformOptions: ViteCustomTransformOptions = {
      // config: server.config,
      babelConfig: {
        ...defaultBabelConfig,
        ...options.babelConfig,
        plugins: [...(defaultBabelConfig.plugins || []), ...(options.babelConfig?.plugins || [])],
      },
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
