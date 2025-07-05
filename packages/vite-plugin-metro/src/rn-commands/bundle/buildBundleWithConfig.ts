import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { ConfigT } from 'metro-config'
import Server from 'metro/src/Server'
import metroBundle from 'metro/src/shared/output/bundle'
import type metroRamBundle from 'metro/src/shared/output/RamBundle'
import type { RequestOptions } from 'metro/src/shared/types.flow'
import type { BundleCommandArgs } from './types'
import saveAssets from './saveAssets'

export async function buildBundleWithConfig(
  args: BundleCommandArgs,
  config: ConfigT,
  bundleImpl: typeof metroBundle | typeof metroRamBundle = metroBundle,
  { patchServer }: { patchServer?: (server: Server) => void } = {}
): Promise<void> {
  // const customResolverOptions = parseKeyValueParamArray(args.resolverOption ?? [])
  const customResolverOptions = []

  if (config.resolver.platforms.indexOf(args.platform) === -1) {
    console.error(`Invalid platform ${args.platform ? `"${args.platform}" ` : ''}selected.`)

    console.info(
      `Available platforms are: ${config.resolver.platforms
        .map((x) => `"${x}"`)
        .join(
          ', '
        )}. If you are trying to bundle for an out-of-tree platform, it may not be installed.`
    )

    throw new Error('Bundling failed')
  }

  // This is used by a bazillion of npm modules we don't control so we don't
  // have other choice than defining it as an env variable here.
  process.env.NODE_ENV = args.dev ? 'development' : 'production'

  let sourceMapUrl = args.sourcemapOutput
  if (sourceMapUrl != null && !args.sourcemapUseAbsolutePath) {
    sourceMapUrl = path.basename(sourceMapUrl)
  }

  // $FlowIgnore[prop-missing]
  const requestOpts: RequestOptions = {
    entryFile: args.entryFile,
    sourceMapUrl,
    dev: args.dev,
    minify: args.minify !== undefined ? args.minify : !args.dev,
    platform: args.platform,
    unstable_transformProfile: args.unstableTransformProfile,
    customResolverOptions,
  }
  const server = new Server(config)

  if (patchServer) {
    patchServer(server)
  }

  try {
    const bundle = await bundleImpl.build(server, requestOpts)

    // Ensure destination directory exists before saving the bundle
    await fs.mkdir(path.dirname(args.bundleOutput), {
      recursive: true,
      mode: 0o755,
    })

    await bundleImpl.save(bundle, args, console.info)

    // Save the assets of the bundle
    const outputAssets = await server.getAssets({
      ...Server.DEFAULT_BUNDLE_OPTIONS,
      ...requestOpts,
      bundleType: 'todo',
    })

    // When we're done saving bundle output and the assets, we're done.
    return await saveAssets(outputAssets, args.platform, args.assetsDest, args.assetCatalogDest)
  } finally {
    await server.end()
  }
}
