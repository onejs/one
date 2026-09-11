import FSExtra from 'fs-extra'
import { clearTransformCache } from '@vxrn/compiler'
import {
  bundle as metroBundle,
  type BundleCommandArgs,
} from '@vxrn/vite-plugin-metro/rn-commands'
import { loadEnv } from '../../exports/loadEnv'
import { buildNativeBundle } from '../../utils/createNativeDevEngine'

export type { BundleCommandArgs }

export async function buildBundle(
  _argv: Array<string>,
  ctx: any,
  args: BundleCommandArgs,
  bundleImpl: any = null
): Promise<void> {
  const {
    platform, // Android is not supported yet.
    dev,
    bundleOutput,
    // React Native's `--bundle-encoding` names a Node Buffer encoding.
    bundleEncoding = 'utf8',
    assetsDest,
    // `--minify` overrides React Native's default of "minify unless this is a
    // dev bundle". undefined means the flag was not passed.
    minify,
    // `--reset-cache` drops the compiler's transform cache, the only cache a
    // rolldown production build reads.
    resetCache,
    // `--entry-file` names the React Native root module. One generates its own
    // native entry from the route tree instead, and __vxrnNativeEntryFile is
    // the supported way to point the build somewhere else.
    // `--read-global-cache` / `--max-workers` / `--config` / `--transformer` /
    // `--resolver-option` configure Metro's global cache, worker pool and
    // resolver. A rolldown production build has none of them: it transforms
    // from source in-process. React Native's own bundle command ignores
    // `--read-global-cache` too.
    // `--unstable-transform-profile` picks a JS engine to target. This pipeline
    // always downlevels for Hermes, which is what every profile it accepts
    // ('default', 'hermes', 'hermes-canary') can run.
    // `--sourcemap-use-absolute-path`, `--sourcemap-sources-root`,
    // `--asset-catalog-dest` and `--indexed-ram-bundle` are not implemented.
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

  if (resetCache) {
    clearTransformCache()
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
    sourcemap: !!args.sourcemapOutput,
    minify,
  })
  const builtBundle = result.code

  // write sourcemap if available and requested
  if (result.map && args.sourcemapOutput) {
    FSExtra.writeFileSync(args.sourcemapOutput, result.map, { encoding: 'utf8' })
  }

  console.info(`Writing bundle to ${bundleOutput}...`)
  FSExtra.writeFileSync(bundleOutput, builtBundle, { encoding: bundleEncoding })
  console.info('Done.')

  // Prevent the process not getting exited for some unknown reason.
  // If the process is not exited, it might hang the native build process.
  setTimeout(() => {
    console.info('Exiting process to prevent hanging.')
    process.exit()
  }, 30000)
}
