import path from 'node:path'
import FSExtra from 'fs-extra'
import { bundle as metroBundle } from '@vxrn/vite-plugin-metro/rn-commands'
import { loadEnv } from '../../exports/loadEnv'
import { fillOptions } from '../../config/getOptionsFilled'
import { getReactNativeBundle } from '../../utils/getReactNativeBundle'
import { buildNativeBundle } from '../../utils/createNativeDevEngine'

export type BundleCommandArgs = {
  assetsDest?: string
  assetCatalogDest?: string
  entryFile: string
  resetCache: boolean
  resetGlobalCache: boolean
  transformer?: string
  minify?: boolean
  config?: string
  platform: 'ios' | 'android'
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
  bundleImpl: any = null
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

  const metroBuildBundleFn = await metroBundle.getBuildBundleFn()

  if (metroBuildBundleFn) {
    console.info('Using @vxrn/vite-plugin-metro to build the bundle.')
    await metroBuildBundleFn(_argv, ctx, args, bundleImpl)

    // Prevent the process not getting exited for some unknown reason.
    // If the process is not exited, it might hang the native build process.
    setTimeout(() => {
      console.info('Exiting process to prevent hanging.')
      process.exit()
    }, 30000)

    return
  }

  process.env.IS_VXRN_CLI = 'true'
  loadEnv(dev ? 'development' : 'production', root)

  if (!dev) {
    process.env.NODE_ENV = 'production'
  }

  const useLegacyBuilder = !!process.env.VXRN_USE_LEGACY_BUILDER

  let builtBundle: string

  if (useLegacyBuilder) {
    // legacy Vite builder path
    let nativeEntry: string | undefined = undefined
    const appDir = path.join(root, 'app')
    if (FSExtra.existsSync(appDir) && FSExtra.statSync(appDir).isDirectory()) {
      nativeEntry = 'virtual:one-entry-native'
    }
    const optionsIn = {
      root,
      host: '0.0.0.0',
      entries: nativeEntry ? { native: nativeEntry } : {},
    }
    const options = await fillOptions(optionsIn, { mode: dev ? 'dev' : 'prod' })
    builtBundle = await getReactNativeBundle(options, platform, {
      mode: dev ? 'dev' : 'prod',
      assetsDest,
      useCache: false,
    })
    builtBundle = builtBundle.replace(/process\.env\.VXRN_REACT_19/g, 'false')
    if (!dev) {
      builtBundle = builtBundle.replace(
        '.getEnforcing("DevSettings")',
        '.patched_getEnforcing_DevSettings_will_not_work_in_production'
      )
    }
  } else {
    // rolldown build path
    console.info(`[vxrn] building native bundle for ${platform}...`)
    const result = await buildNativeBundle({
      root,
      platform,
      dev,
    })
    builtBundle = result.code

    // write sourcemap if available and requested
    if (result.map && args.sourcemapOutput) {
      FSExtra.writeFileSync(args.sourcemapOutput, result.map, { encoding: 'utf8' })
    }
  }

  console.info(`Writing bundle to ${bundleOutput}...`)
  FSExtra.writeFileSync(bundleOutput, builtBundle, { encoding: 'utf8' })
  console.info('Done.')

  // Prevent the process not getting exited for some unknown reason.
  // If the process is not exited, it might hang the native build process.
  setTimeout(() => {
    console.info('Exiting process to prevent hanging.')
    process.exit()
  }, 30000)
}
