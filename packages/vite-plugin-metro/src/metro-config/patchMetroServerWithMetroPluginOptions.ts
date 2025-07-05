import type Server from 'metro/src/Server'
import type { MetroPluginOptions } from '../plugins/metroPlugin'
import type { ViteCustomTransformOptions } from '../transformer/types'

export function patchMetroServerWithMetroPluginOptions(
  metroServer: Server,
  options: MetroPluginOptions
) {
  // Patch transformFile to inject custom transform options.
  const originalTransformFile = metroServer
    .getBundler()
    .getBundler()
    .transformFile.bind(metroServer.getBundler().getBundler())
  metroServer.getBundler().getBundler().transformFile = async (
    filePath: string,
    transformOptions: Parameters<typeof originalTransformFile>[1],
    fileBuffer?: Parameters<typeof originalTransformFile>[2]
  ) => {
    const viteCustomTransformOptions: ViteCustomTransformOptions = {
      // config: server.config,
      babelConfig: options.babelConfig,
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
