import { createDebugger } from '@vxrn/debug'
import FSExtra from 'fs-extra'
import path from 'node:path'
import type { Plugin } from 'vite'
import { EXCLUDE_LIST, type ScanDepsResult, scanDepsToOptimize } from '../utils/scanDepsToOptimize'
import { getFileHash, lookupFile } from '../utils/utils'

const name = 'vxrn:auto-dep-optimize'

const { debug, debugDetails } = createDebugger(name)

type FindDepsOptions = {
  root: string
  exclude?: string[]
  onScannedDeps?: (result: ScanDepsResult) => void
}

export function autoDepOptimizePlugin(props: FindDepsOptions): Plugin {
  return {
    name,
    enforce: 'pre',
    async config(_cfg, env) {
      debug?.('Config hook called')
      return await getScannedOptimizeDepsConfig({ ...props, command: env.command })
    },
  } satisfies Plugin
}

export const getSSRExternalsCachePath = (root: string) => {
  return path.join(root, 'node_modules', '.vxrn', 'deps-to-pre-bundle-for-ssr-cache.json')
}

type FindDepsOptionsByCommand = FindDepsOptions & { command: 'build' | 'serve' }

export async function getScannedOptimizeDepsConfig(props: FindDepsOptionsByCommand) {
  const result = await findDepsToOptimize(props)

  props.onScannedDeps?.(result)

  return {
    ssr: {
      optimizeDeps: {
        include: result.prebundleDeps,
        exclude: props.exclude ? [...props.exclude, ...EXCLUDE_LIST] : EXCLUDE_LIST,
      },
      noExternal: result.prebundleDeps,
    },
  }
}

export async function findDepsToOptimize({ root, command, exclude }: FindDepsOptionsByCommand) {
  const cacheFilePath = getSSRExternalsCachePath(root)
  const startedAt = debug ? Date.now() : 0

  // Disable cache when building for production to prevent stale cache
  const noCache = command === 'build'

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
    debug?.(`Excluding user specified deps ${JSON.stringify(exclude)} from pre-bundling for SSR.`)
    value.prebundleDeps = value.prebundleDeps.filter((dep) => !exclude.includes(dep))
  }

  debugDetails?.(`Deps discovered to be pre-bundled for SSR: ${value.prebundleDeps.join(', ')}`)

  return value
}
