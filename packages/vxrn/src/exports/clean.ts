import { randomUUID } from 'node:crypto'
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

// same liveness semantics as processExists in dev.ts: only ESRCH means the
// owner is gone, any other failure keeps the lock safe by treating it as live
function isLockOwnerAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return getErrorCode(err) !== 'ESRCH'
  }
}

// lock identity is `${pid}:${token}`, pid-only content from older vxrn still
// parses so locks abandoned before this change can be reclaimed
function parseLockOwnerPid(content: string): number | undefined {
  const match = /^(\d+)(?::\S+)?$/.exec(content.trim())
  if (!match) {
    return undefined
  }
  const pid = Number.parseInt(match[1], 10)
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return undefined
  }
  return pid
}

// remove the lock only when its owner is provably dead, never for live or
// unknown owners. returns true when the caller should retry acquiring.
async function tryRemoveAbandonedLock(lockPath: string): Promise<boolean> {
  let content: string
  try {
    content = await readFile(lockPath, 'utf8')
  } catch (err) {
    if (getErrorCode(err) === 'ENOENT') {
      return true
    }
    throw err
  }

  const pid = parseLockOwnerPid(content)
  if (pid === undefined || isLockOwnerAlive(pid)) {
    return false
  }

  // the owner is dead, but the lock may have been replaced since the first
  // read, so confirm the exact identity before removing. a concurrent
  // reclaimer's lock always carries a different token, and a live owner's
  // lock is never removed because its pid checks alive above.
  let reread: string
  try {
    reread = await readFile(lockPath, 'utf8')
  } catch (err) {
    if (getErrorCode(err) === 'ENOENT') {
      return true
    }
    throw err
  }
  if (reread !== content) {
    return false
  }

  try {
    await rm(lockPath)
  } catch (err) {
    // another reclaimer removed it first, retry acquiring
    if (getErrorCode(err) === 'ENOENT') {
      return true
    }
    throw err
  }
  return true
}

async function withCacheCleanLock<T>(cacheDir: string, action: () => Promise<T>) {
  const lockPath = join(dirname(cacheDir), '.vxrn-clean.lock')
  const startedAt = Date.now()
  await mkdir(dirname(lockPath), { recursive: true })
  const identity = `${process.pid}:${randomUUID()}\n`

  while (true) {
    try {
      await writeFile(lockPath, identity, { flag: 'wx' })
      break
    } catch (err) {
      if (getErrorCode(err) !== 'EEXIST') {
        throw err
      }

      if (Date.now() - startedAt >= CLEAN_LOCK_TIMEOUT_MS) {
        let owner = 'unknown process'
        try {
          const pid = parseLockOwnerPid(await readFile(lockPath, 'utf8'))
          if (pid !== undefined) {
            owner = `process ${pid}`
          }
        } catch (readErr) {
          if (getErrorCode(readErr) === 'ENOENT') {
            continue
          }
          throw readErr
        }
        throw new Error(`Timed out waiting for VXRN cache cleanup lock held by ${owner}`)
      }

      if (await tryRemoveAbandonedLock(lockPath)) {
        continue
      }
      await new Promise<void>((resolve) => setTimeout(resolve, CLEAN_LOCK_WAIT_MS))
    }
  }

  try {
    return await action()
  } finally {
    // only remove our own lock, never a replacement owner's lock
    try {
      if ((await readFile(lockPath, 'utf8')) === identity) {
        await rm(lockPath, { force: true })
      }
    } catch (err) {
      if (getErrorCode(err) !== 'ENOENT') {
        throw err
      }
    }
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
