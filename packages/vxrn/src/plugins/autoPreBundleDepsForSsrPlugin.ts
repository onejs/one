import path from 'node:path'
import FSExtra from 'fs-extra'
import type { Plugin } from 'vite'
import { EXCLUDE_LIST, scanDepsToPreBundleForSsr } from '../utils/scanDepsToPreBundleForSsr'
import { getFileHash, lookupFile } from '../utils/utils'
import { createDebugger } from '@vxrn/debug'

const name = 'auto-pre-bundle-deps-for-ssr'
const { debug, debugDetails } = createDebugger(name)

export function autoPreBundleDepsForSsrPlugin({
  root,
  disable,
}: { root: string; disable?: boolean }) {
  if (disable) {
    return {
      name,
    }
  }

  return {
    name: `vxrn:${name}`,
    enforce: 'pre',
    async config(_cfg, env) {
      debug?.('Config hook called')
      const startedAt = debug ? Date.now() : 0

      // Disable cache when building for production to prevent stale cache
      const noCache = env.command === 'build'

      const lockFile = await lookupFile(root, [
        'yarn.lock',
        'package-lock.json',
        'pnpm-lock.yaml',
        'bun.lockb',
      ])
      const lockFileHash = lockFile ? await getFileHash(lockFile) : undefined

      const noExternalDepsForSsrCacheFilePath = path.join(
        root,
        'node_modules',
        '.vxrn',
        'deps-to-pre-bundle-for-ssr-cache.json'
      )

      let depsToPreBundleForSsr: string[] | undefined = undefined
      if (lockFileHash && !noCache) {
        try {
          const { lockFileHash: cachedLockFileHash, depsToPreBundleForSsr: cachedDepsToPreBundle } =
            await FSExtra.readJSON(noExternalDepsForSsrCacheFilePath)

          if (lockFileHash === cachedLockFileHash && Array.isArray(cachedDepsToPreBundle)) {
            depsToPreBundleForSsr = cachedDepsToPreBundle
            debug?.(`Using cached scan results from ${noExternalDepsForSsrCacheFilePath}`)
          }
        } catch {}
      }

      if (!depsToPreBundleForSsr) {
        depsToPreBundleForSsr = await scanDepsToPreBundleForSsr(`${root}/package.json`)

        if (!noCache) {
          // no need to wait for this
          FSExtra.outputJSON(noExternalDepsForSsrCacheFilePath, {
            lockFileHash,
            depsToPreBundleForSsr,
          })
        }
      }

      debug?.(`Scanning completed in ${Date.now() - startedAt}ms`)
      debug?.(
        `${depsToPreBundleForSsr.length} deps are discovered and will be pre-bundled for SSR.` +
          (debugDetails
            ? ''
            : ` (Focus on this debug scope, "DEBUG=${debug.namespace}", to see more details.)`)
      )
      debugDetails?.(
        `Deps discovered to be pre-bundled for SSR: ${depsToPreBundleForSsr.join(', ')}`
      )

      return {
        ssr: {
          optimizeDeps: {
            include: depsToPreBundleForSsr,
            // Known packages that will fail to pre-bundle
            exclude: EXCLUDE_LIST,
          },
          noExternal: depsToPreBundleForSsr,
        },
      }
    },
  } satisfies Plugin
}
