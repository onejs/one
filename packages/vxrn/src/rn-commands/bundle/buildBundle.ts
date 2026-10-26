import FSExtra from 'fs-extra'
import { clearTransformCache } from '@vxrn/compiler'
import type { BundleCommandArgs } from '@vxrn/vite-plugin-metro/rn-commands'
import { resolveConfig } from 'vite'
import { dirname, join, resolve } from 'node:path'
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
    platform,
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
    // `--entry-file` is a placeholder in generated native projects. VxRN apps
    // configure entries.native through vxrn/react-native-commands, while One
    // generates its native entry from the route tree.
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

  const viteConfig = await resolveConfig({}, 'build', 'production')

  // resolving the config runs the metro plugin only in metro mode, and metro is
  // an optional peer, so only that mode loads it
  if (globalThis['__viteMetroPluginOptions__']) {
    console.info('Using @vxrn/vite-plugin-metro to build the bundle.')
    const { bundle } = await import('@vxrn/vite-plugin-metro/rn-commands')
    await bundle.getBuildBundleFn(viteConfig)(_argv, ctx, args, bundleImpl)
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
  const nativeEntryFile = ctx.vxrnEntries?.native
  if (nativeEntryFile !== undefined && typeof nativeEntryFile !== 'string') {
    throw new Error('Expected entries.native to be a string')
  }
  const result = await buildNativeBundle({
    root,
    platform,
    dev,
    entryFile: nativeEntryFile,
    // pass through ONE_SERVER_URL so the native prelude can inject it into
    // process.env. without this, getURL.native falls back to the dummy
    // 'http://one-server.example.com' and runtime loader fetches fail in prod.
    serverUrl: process.env.ONE_SERVER_URL,
    assetsDest,
    sourcemap: !!args.sourcemapOutput,
    minify,
  })
  const builtBundle = result.code

  // gradle sends drawable resources to assetsDest but packages arbitrary files
  // from the bundle directory. DOM pages must share that assets root with JS.
  if (platform === 'android' && assetsDest) {
    const source = join(assetsDest, 'one-dom')
    const destination = join(dirname(bundleOutput), 'one-dom')
    if (resolve(source) !== resolve(destination)) {
      FSExtra.removeSync(destination)
      if (FSExtra.existsSync(source)) FSExtra.moveSync(source, destination)
    }
  }

  // write sourcemap if available and requested
  if (result.map && args.sourcemapOutput) {
    FSExtra.outputFileSync(args.sourcemapOutput, result.map, { encoding: 'utf8' })
  }

  console.info(`Writing bundle to ${bundleOutput}...`)
  FSExtra.outputFileSync(bundleOutput, builtBundle, { encoding: bundleEncoding })
  console.info('Done.')

  // Prevent the process not getting exited for some unknown reason.
  // If the process is not exited, it might hang the native build process.
  // unref so a clean build exits as soon as its work is done; the timer only
  // fires when something else still holds the event loop.
  setTimeout(() => {
    console.info('Exiting process to prevent hanging.')
    process.exit()
  }, 30000).unref()
}
