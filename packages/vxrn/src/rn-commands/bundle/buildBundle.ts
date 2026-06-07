import path from 'node:path'
import FSExtra from 'fs-extra'
import { bundle as metroBundle } from '@vxrn/vite-plugin-metro/rn-commands'
import { loadEnv } from '../../exports/loadEnv'
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
    assetsDest,
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
    // metroBuildBundleFn calls ensureProcessExitsAfterDelay internally,
    // which kills lingering child handles (esbuild --service) and lets
    // the event loop drain naturally. no extra setTimeout needed —
    // an unref'd timer here would itself keep the loop alive.
    return
  }

  process.env.IS_VXRN_CLI = 'true'
  loadEnv(dev ? 'development' : 'production', root)

  if (!dev) {
    process.env.NODE_ENV = 'production'
  }

  console.info(`[vxrn] building native bundle for ${platform}...`)
  const nativeEntryFile = (globalThis as { __vxrnNativeEntryFile?: unknown })
    .__vxrnNativeEntryFile
  const result = await buildNativeBundle({
    root,
    platform,
    dev,
    entryFile: typeof nativeEntryFile === 'string' ? nativeEntryFile : undefined,
    // pass through ONE_SERVER_URL so the native prelude can inject it into
    // process.env. without this, getURL.native falls back to the dummy
    // 'http://one-server.example.com' and runtime loader fetches fail in prod.
    serverUrl: process.env.ONE_SERVER_URL,
    assetsDest,
  })
  const builtBundle = result.code

  // write sourcemap if available and requested
  if (result.map && args.sourcemapOutput) {
    FSExtra.writeFileSync(args.sourcemapOutput, result.map, { encoding: 'utf8' })
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
