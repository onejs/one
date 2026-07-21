import { createDebugger } from '@vxrn/debug'
import FSExtra from 'fs-extra'
import path from 'node:path'
import { createFilter, type Plugin } from 'vite'
import type { AutoDepOptimizationOptions } from '../types'
import {
  EXCLUDE_LIST,
  type ScanDepsResult,
  scanDepsToOptimize,
} from '../utils/scanDepsToOptimize'
import { getFileHash, lookupFile } from '../utils/utils'
import { getCacheDir } from '../utils/getCacheDir'

const name = 'vxrn:auto-dep-optimize'

const { debug, debugDetails } = createDebugger(name)

type FindDepsOptions = AutoDepOptimizationOptions & {
  root: string
  noExternal?: boolean
  external?: (string | RegExp)[]
  onScannedDeps?: (result: ScanDepsResult) => void
}

const scanVersion = 2

export function autoDepOptimizePlugin(props: FindDepsOptions): Plugin {
  return {
    name,
    enforce: 'pre',

    async config(cfg, env) {
      debug?.('Config hook called')

      // TODO not use global here we should move deps into vxrn
      const userOptions = globalThis.__oneOptions
      const depsConfig = userOptions?.deps

      const exclude = depsConfig
        ? Object.entries(depsConfig)
            .filter(([_, value]) => value === false)
            .map(([k]) => k)
        : []

      const userExcludes = Array.isArray(props.exclude) ? props.exclude : [props.exclude]

      // also respect user's vite config optimizeDeps.exclude
      const userViteExcludes = cfg.optimizeDeps?.exclude || []
      const userSsrExcludes = cfg.ssr?.optimizeDeps?.exclude || []

      const finalConfig = await getScannedOptimizeDepsConfig({
        ...props,
        mode: env.mode,
        noExternal: cfg.ssr?.noExternal === true,
        external: Array.isArray(cfg.ssr?.external) ? cfg.ssr.external : [],
        exclude: [
          ...exclude,
          ...userExcludes,
          ...userViteExcludes,
          ...userSsrExcludes,
        ].filter(Boolean),
      })

      debugDetails?.(
        `Final auto-dep-optimize config: ${JSON.stringify(finalConfig, null, 2)}\nfrom props: ${JSON.stringify(props)}`
      )

      return finalConfig
    },
  } satisfies Plugin
}

export const getSSRExternalsCachePath = (root: string) => {
  return path.join(getCacheDir(root), 'deps-to-pre-bundle-for-ssr-cache.json')
}

type FindDepsOptionsByMode = FindDepsOptions & { mode: string }

export async function getScannedOptimizeDepsConfig(props: FindDepsOptionsByMode) {
  const result = await findDepsToOptimize(props)

  props.onScannedDeps?.(result)

  // filter out explicitly excluded deps from the scanned results
  // createFilter works on file paths but user exclude may be dep names
  const excludeArray = Array.isArray(props.exclude) ? props.exclude : [props.exclude]
  const excludeStrings = excludeArray.filter((e): e is string => typeof e === 'string')
  const excludeSet = new Set(excludeStrings)

  const filteredDeps = result.prebundleDeps.filter((dep) => !excludeSet.has(dep))

  return {
    ssr: {
      optimizeDeps: {
        include: filteredDeps,
        exclude: EXCLUDE_LIST,
      },
      noExternal: filteredDeps,
    },
  }
}

let sessionCacheVal: ScanDepsResult | null = null

export async function findDepsToOptimize({
  root,
  mode,
  noExternal,
  external,
  exclude,
  include,
}: FindDepsOptionsByMode) {
  const cacheFilePath = getSSRExternalsCachePath(root)
  const startedAt = debug ? Date.now() : 0

  // Disable cache when building for production to prevent stale cache
  const noCache = mode === 'production'

  // Prod builds its running twice in a row, so avoid that since we can assume it only needs once
  const sessionCache = mode === 'production'

  if (sessionCache && sessionCacheVal) {
    return sessionCacheVal
  }

  const lockFile = await lookupFile(root, [
    'yarn.lock',
    'package-lock.json',
    'pnpm-lock.yaml',
    'bun.lockb',
  ])

  const lockFileHash = lockFile ? await getFileHash(lockFile) : undefined

  let value: ScanDepsResult | undefined

  if (lockFileHash && !noCache) {
    try {
      const {
        scanVersion: cachedScanVersion,
        noExternal: cachedNoExternal,
        lockFileHash: cachedLockFileHash,
        depsToPreBundleForSsr: cachedDepsToPreBundle,
      } = await FSExtra.readJSON(cacheFilePath)

      if (
        cachedScanVersion === scanVersion &&
        cachedNoExternal === noExternal &&
        lockFileHash === cachedLockFileHash &&
        !!cachedDepsToPreBundle &&
        'prebundleDeps' in cachedDepsToPreBundle
      ) {
        value = cachedDepsToPreBundle
        debug?.(`Using cached scan results from ${cacheFilePath}`)
      }
    } catch (err) {
      debug?.(`${err}`)
    }
  }

  const filter = createFilter(include, exclude)

  if (!value) {
    const excludedDependencies = (Array.isArray(exclude) ? exclude : [exclude]).filter(
      (dep): dep is string => typeof dep === 'string'
    )
    value = await scanDepsToOptimize(`${root}/package.json`, {
      filter,
      noExternal,
      external,
      excludedDependencies,
    })

    if (sessionCache) {
      sessionCacheVal = value
    }

    if (!noCache) {
      void FSExtra.outputJSON(cacheFilePath, {
        scanVersion,
        noExternal,
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

  debugDetails?.(
    `Deps discovered to be pre-bundled for SSR: ${value.prebundleDeps.join(', ')}`
  )

  return value
}
