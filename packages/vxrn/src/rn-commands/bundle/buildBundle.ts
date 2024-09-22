import path from 'node:path'
import FSExtra from 'fs-extra'
import { getOptionsFilled } from '../../utils/getOptionsFilled'
import { getReactNativeBundle } from '../../utils/getReactNativeBundle'
import { loadEnv } from '../../utils/loadEnv'

export type BundleCommandArgs = {
  assetsDest?: string
  assetCatalogDest?: string
  entryFile: string
  resetCache: boolean
  resetGlobalCache: boolean
  transformer?: string
  minify?: boolean
  config?: string
  platform: string
  dev: boolean
  bundleOutput: string
  bundleEncoding?: 'utf8' | 'utf16le' | 'ascii'
  maxWorkers?: number
  sourcemapOutput?: string
  sourcemapSourcesRoot?: string
  sourcemapUseAbsolutePath: boolean
  verbose: boolean
  unstableTransformProfile: string
  indexedRamBundle?: boolean
  resolverOption?: Array<string>
}

export async function buildBundle(
  _argv: Array<string>,
  ctx: any,
  args: BundleCommandArgs,
  bundleImpl: any
): Promise<void> {
  const {
    platform, // Android is not supported yet.
    dev,
    // bundleEncoding, // Not supported, we are using utf8.
    // sourcemapUseAbsolutePath,
    // unstableTransformProfile,
    // resetCache, // Currently we are not using cache for production builds.
    // readGlobalCache,
    // entryFile, // Not supported. With VxRN, we are using a static entry file.
    bundleOutput,
    assetsDest, // TODO
    // minify, // Minification is not supported.
  } = args

  const { root } = ctx
  if (typeof root !== 'string') {
    throw new Error(`Expected ctx.root to be a string, but got ${typeof root}`)
  }

  await loadEnv(root)

  let nativeEntry: string | undefined = undefined

  // If there's an `app` directory, then we assume that the user is using VXS.
  const appDir = path.join(root, 'app')
  if (FSExtra.existsSync(appDir) && FSExtra.statSync(appDir).isDirectory()) {
    console.info('VXS project detected. Using VXS virtual entry.')
    // TODO: Hardcoded for now to work with vxs. See `virtualEntryIdNative` in `packages/vxs/src/vite/virtualEntryPlugin.ts` and also `native: virtualEntryIdNative` in `packages/vxs/src/cli/run.ts`.
    nativeEntry = 'virtual:vxs-entry-native'
  }

  const optionsIn = {
    root,
    host: '0.0.0.0', // TODO: Hardcoded for now.
    entries: {
      ...(nativeEntry ? { native: nativeEntry } : {}),
    },
  }

  const options = await getOptionsFilled(optionsIn, { mode: dev ? 'dev' : 'prod' })
  let builtBundle = await getReactNativeBundle(options, {
    mode: dev ? 'dev' : 'prod',
    assetsDest,
    useCache: false,
  })

  if (!dev) {
    // TODO: There should be a legitimate way to do this.
    builtBundle = builtBundle.replace(
      '.getEnforcing("DevSettings")',
      '.patched_getEnforcing_DevSettings_will_not_work_in_production'
    )
  }

  console.info(`Writing bundle to ${bundleOutput}`)
  FSExtra.writeFileSync(bundleOutput, builtBundle, { encoding: 'utf8' })
}
