import path from 'node:path'
import FSExtra from 'fs-extra'
import type { Plugin } from 'vite'
import { EXCLUDE_LIST, scanDepsToPreBundleForSsr } from '../utils/scanDepsToPreBundleForSsr'
import { getFileHash, lookupFile } from '../utils/utils'

export function autoPreBundleDepsForSsrPlugin({ root }: { root: string }) {
  return {
    name: 'vxrn:auto-pre-bundle-deps-for-ssr',
    enforce: 'pre',
    async config(_cfg, env) {
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
