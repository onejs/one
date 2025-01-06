import { createDebugger } from '@vxrn/debug'
import { configureBabelPlugin } from '@vxrn/vite-native-swc'
import FSExtra from 'fs-extra'
import path from 'node:path'
import type { Plugin } from 'vite'
import { EXCLUDE_LIST, type ScanDepsResult, scanDepsToOptimize } from '../utils/scanDepsToOptimize'
import { getFileHash, lookupFile } from '../utils/utils'

const name = 'vxrn:auto-pre-bundle-deps-for-ssr'

const { debug, debugDetails } = createDebugger(name)

export const getSSRExternalsCachePath = (root: string) => {
  return path.join(root, 'node_modules', '.vxrn', 'deps-to-pre-bundle-for-ssr-cache.json')
}

export function autoDepOptimizePlugin({
  root,
  exclude,
}: { root: string; exclude?: string[] }): Plugin {
  const cacheFilePath = getSSRExternalsCachePath(root)

  return {
    name,
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

      let value: ScanDepsResult | undefined = undefined
      if (lockFileHash && !noCache) {
        try {
          const { lockFileHash: cachedLockFileHash, depsToPreBundleForSsr: cachedDepsToPreBundle } =
            await FSExtra.readJSON(cacheFilePath)

          if (
            lockFileHash === cachedLockFileHash &&
            !!cachedDepsToPreBundle &&
            'hasReanimated' in cachedDepsToPreBundle &&
            'prebundleDeps' in cachedDepsToPreBundle
          ) {
            value = cachedDepsToPreBundle
            debug?.(`Using cached scan results from ${cacheFilePath}`)
          }
        } catch {}
      }

      if (!value) {
        value = await scanDepsToOptimize(`${root}/package.json`)

        if (!noCache) {
          // no need to wait for this
          FSExtra.outputJSON(cacheFilePath, {
            lockFileHash,
            depsToPreBundleForSsr: value,
          })
        }
      }

      debug?.(`Scanning completed in ${Date.now() - startedAt}ms`)
      debug?.(
        `${value.prebundleDeps.length} deps are discovered and will be pre-bundled for SSR.` +
          (debugDetails
            ? ''
            : ` (Focus on this debug scope, "DEBUG=${debug.namespace}", to see more details.)`)
      )

      if (exclude) {
        debug?.(
          `Excluding user specified deps ${JSON.stringify(exclude)} from pre-bundling for SSR.`
        )
        value.prebundleDeps = value.prebundleDeps.filter((dep) => !exclude.includes(dep))
      }

      debugDetails?.(`Deps discovered to be pre-bundled for SSR: ${value.prebundleDeps.join(', ')}`)

      if (value.hasReanimated) {
        configureBabelPlugin({
          disableReanimated: false,
        })
      }

      return {
        ssr: {
          optimizeDeps: {
            include: value.prebundleDeps,
            exclude: exclude ? [...exclude, ...EXCLUDE_LIST] : EXCLUDE_LIST,
          },
          noExternal: value.prebundleDeps,
        },
      }
    },
  } satisfies Plugin
}
