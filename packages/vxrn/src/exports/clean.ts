import { rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
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

// well clear of dev ports (3000/5173/8081/19000s) and the ephemeral ranges,
// so a foreign occupant is only ever a hash collision with another vxrn root
const CLEAN_LOCK_PORT_BASE = 24_000
const CLEAN_LOCK_PORT_COUNT = 1_000

// stable mutex port per lock identity. ownership is an exclusive loopback
// listen, which the kernel grants atomically and frees on any holder death,
// so there is no lock file to go stale and no reclaim step that could delete
// a replacement owner's lock. a pid file cannot do this: node has no atomic
// compare-and-delete, so any read then unlink gap lets a live replacement
// installed between the check and the delete be removed.
function getCacheCleanLockPort(cacheDir: string): number {
  const identity = join(dirname(cacheDir), '.vxrn-clean.lock')
  let hash = 0x811c9dc5
  for (let index = 0; index < identity.length; index++) {
    hash ^= identity.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return CLEAN_LOCK_PORT_BASE + (hash >>> 0) % CLEAN_LOCK_PORT_COUNT
}

function tryListen(server: Server, port: number): Promise<NodeJS.ErrnoException | undefined> {
  return new Promise((resolve) => {
    server.once('error', (err: Error) => resolve(err as NodeJS.ErrnoException))
    server.once('listening', () => resolve(undefined))
    server.listen({ port, host: '127.0.0.1', exclusive: true })
  })
}

export async function acquireCacheCleanLock(cacheDir: string): Promise<() => Promise<void>> {
  const port = getCacheCleanLockPort(cacheDir)
  const startedAt = Date.now()

  while (true) {
    // fresh server per attempt, same shape as the daemon port probe
    const server = createServer()
    const err = await tryListen(server, port)
    if (!err) {
      // held referenced until release so the loop cannot exit mid-hold
      return async () => {
        await new Promise<void>((resolve) => {
          server.close(() => resolve())
        })
      }
    }

    if (getErrorCode(err) !== 'EADDRINUSE') {
      throw err
    }
    if (Date.now() - startedAt >= CLEAN_LOCK_TIMEOUT_MS) {
      throw new Error(`Timed out waiting for VXRN cache cleanup lock (127.0.0.1:${port})`)
    }
    await new Promise<void>((resolve) => setTimeout(resolve, CLEAN_LOCK_WAIT_MS))
  }
}

async function withCacheCleanLock<T>(cacheDir: string, action: () => Promise<T>) {
  const release = await acquireCacheCleanLock(cacheDir)
  try {
    return await action()
  } finally {
    await release()
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
