import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { VXRNOptions } from '../types'
import { fillOptions } from '../config/getOptionsFilled'
import { getSSRExternalsCachePath } from '../plugins/autoDepOptimizePlugin'
import { getCacheDir } from '../utils/getCacheDir'
import { readState, writeState } from '../utils/state'

const CLEAN_LOCK_WAIT_MS = 25
const CLEAN_LOCK_TIMEOUT_MS = 60_000

function getErrorCode(err: unknown) {
  if (err instanceof Error && 'code' in err && typeof err.code === 'string') {
    return err.code
  }
}

async function withCacheCleanLock<T>(cacheDir: string, action: () => Promise<T>) {
  const lockPath = join(dirname(cacheDir), '.vxrn-clean.lock')
  const startedAt = Date.now()
  await mkdir(dirname(lockPath), { recursive: true })

  while (true) {
    try {
      await writeFile(lockPath, `${process.pid}\n`, { flag: 'wx' })
      break
    } catch (err) {
      if (getErrorCode(err) !== 'EEXIST') {
        throw err
      }

      if (Date.now() - startedAt >= CLEAN_LOCK_TIMEOUT_MS) {
        let owner = 'unknown process'
        try {
          owner = `process ${(await readFile(lockPath, 'utf8')).trim()}`
        } catch (readErr) {
          if (getErrorCode(readErr) === 'ENOENT') {
            continue
          }
          throw readErr
        }
        throw new Error(`Timed out waiting for VXRN cache cleanup lock held by ${owner}`)
      }
      await new Promise<void>((resolve) => setTimeout(resolve, CLEAN_LOCK_WAIT_MS))
    }
  }

  try {
    return await action()
  } finally {
    await rm(lockPath, { force: true })
  }
}

async function removeCachePaths(root: string, only?: 'vite') {
  const removeVxrnCache = process.env.VXRN_DONT_CLEAN_SELF
    ? rm(getSSRExternalsCachePath(root)).catch(throwIfNotMissingError)
    : rm(getCacheDir(root), {
        recursive: true,
        force: true,
      }).catch(throwIfNotMissingError)

  console.info(`[vxrn] cleaning`)

  await Promise.all([
    rm(join(root, 'node_modules', '.vite'), {
      recursive: true,
      force: true,
    }).catch(throwIfNotMissingError),
    removeVxrnCache,
    only === 'vite'
      ? null
      : rm(join(root, 'dist'), {
          recursive: true,
          force: true,
        }).catch(throwIfNotMissingError),
  ])
}

export async function prepareCacheForVersion({
  root,
  cacheDir,
  versionHash,
  forceClean = false,
}: {
  root: string
  cacheDir: string
  versionHash: string
  forceClean?: boolean
}) {
  return withCacheCleanLock(cacheDir, async () => {
    const state = await readState(cacheDir)
    const versionChanged = !!state.versionHash && state.versionHash !== versionHash
    const shouldClean = forceClean || versionChanged

    if (shouldClean) {
      await removeCachePaths(root, 'vite')
    }
    if (shouldClean || state.versionHash !== versionHash) {
      await writeState(cacheDir, { versionHash })
    }

    return shouldClean
  })
}

export const clean = async (rest: VXRNOptions, only?: 'vite') => {
  const options = await fillOptions(rest)
  await withCacheCleanLock(options.cacheDir, () => removeCachePaths(options.root, only))
}

function throwIfNotMissingError(err: unknown) {
  if (getErrorCode(err) !== 'ENOENT') {
    throw err
  }
}
