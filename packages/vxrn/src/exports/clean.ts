import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
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

// test knob in the same vein as VXRN_DONT_CLEAN_SELF: shorten the 60s
// acquisition timeout so failure-path cleanup is provable without a
// minute-long test. production callers never set it.
function getCleanLockTimeoutMs(): number {
  const override = Number.parseInt(process.env.VXRN_CLEAN_LOCK_TIMEOUT_MS ?? '', 10)
  if (Number.isSafeInteger(override) && override > 0) {
    return override
  }
  return CLEAN_LOCK_TIMEOUT_MS
}

// well clear of dev ports (3000/5173/8081/19000s) and the ephemeral ranges,
// so a foreign occupant is only ever a hash collision with another vxrn root
const CLEAN_LOCK_PORT_BASE = 24_000
const CLEAN_LOCK_PORT_COUNT = 1_000

// canonical ownership identity: device and inode of the lock directory, so
// every pathname spelling of the same physical cache (symlinks, dot
// segments, case variants, bind mounts) shares one mutex port. hashing the
// raw pathname would let aliases acquire simultaneously.
async function getCacheCleanLockPort(lockDir: string): Promise<number> {
  const info = await stat(lockDir)
  let hash = 0x811c9dc5
  const identity = `${info.dev}:${info.ino}`
  for (let index = 0; index < identity.length; index++) {
    hash ^= identity.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return CLEAN_LOCK_PORT_BASE + (hash >>> 0) % CLEAN_LOCK_PORT_COUNT
}

// only ESRCH means the owner is gone, any other failure keeps the lock safe
// by treating it as live (same semantics as processExists in dev.ts)
function isLockOwnerAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return getErrorCode(err) !== 'ESRCH'
  }
}

// legacy file content is pid-only; anything else is an unknown owner that
// must be waited on, never removed
function parseLockOwnerPid(content: string): number | undefined {
  const trimmed = content.trim()
  if (!/^\d+$/.test(trimmed)) {
    return undefined
  }
  const pid = Number.parseInt(trimmed, 10)
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return undefined
  }
  return pid
}

// join the legacy pid-file protocol so old-version cleaners and this cleaner
// exclude each other. returns true when this process created the file and
// must delete it on release. a dead owner's corpse is never deleted (that
// read-then-unlink cannot be atomic); it only routes around file creation
// while the port mutex below still serializes new cleaners.
async function joinLegacyLock(
  lockPath: string,
  startedAt: number,
  timeoutMs: number
): Promise<boolean> {
  while (true) {
    try {
      await writeFile(lockPath, `${process.pid}\n`, { flag: 'wx' })
      return true
    } catch (err) {
      if (getErrorCode(err) !== 'EEXIST') {
        throw err
      }
    }

    let content: string
    try {
      content = await readFile(lockPath, 'utf8')
    } catch (err) {
      if (getErrorCode(err) === 'ENOENT') {
        continue
      }
      throw err
    }

    const pid = parseLockOwnerPid(content)
    if (pid !== undefined && !isLockOwnerAlive(pid)) {
      return false
    }
    if (Date.now() - startedAt >= timeoutMs) {
      const owner = pid === undefined ? 'unknown process' : `process ${pid}`
      throw new Error(`Timed out waiting for VXRN cache cleanup lock held by ${owner}`)
    }
    await new Promise<void>((resolve) => setTimeout(resolve, CLEAN_LOCK_WAIT_MS))
  }
}

function tryListen(server: Server, port: number): Promise<NodeJS.ErrnoException | undefined> {
  return new Promise((resolve) => {
    server.once('error', (err: Error) => resolve(err as NodeJS.ErrnoException))
    server.once('listening', () => resolve(undefined))
    server.listen({ port, host: '127.0.0.1', exclusive: true })
  })
}

// ownership is an exclusive loopback listen, which the kernel grants
// atomically and frees on any holder death. live and unknown legacy owners
// are respected by the file phase above; the port serializes new cleaners
// even past a dead owner's corpse, which no participant ever deletes.
async function acquirePortLock(
  port: number,
  startedAt: number,
  timeoutMs: number
): Promise<() => Promise<void>> {
  while (true) {
    // fresh server per attempt, same shape as the daemon port probe.
    // ordinary connections are rejected at once so a stray client can never
    // strand release: under node an accepted connection otherwise keeps the
    // close callback pending.
    const server = createServer((socket) => {
      socket.on('error', () => {})
      socket.destroy()
    })
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
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Timed out waiting for VXRN cache cleanup lock (127.0.0.1:${port})`)
    }
    await new Promise<void>((resolve) => setTimeout(resolve, CLEAN_LOCK_WAIT_MS))
  }
}

// only our own participation file is removed, and only while it still
// carries our pid; a replacement is never touched. the read-then-remove
// cannot hit a replacement: installing one needs the path absent, and the
// path is only absent after our own remove (or a crash, whose corpse no
// participant ever deletes), since every participant creates with wx.
async function removeOwnLegacyLock(lockPath: string): Promise<void> {
  try {
    if ((await readFile(lockPath, 'utf8')) === `${process.pid}\n`) {
      await rm(lockPath, { force: true })
    }
  } catch (err) {
    if (getErrorCode(err) !== 'ENOENT') {
      throw err
    }
  }
}

async function withCacheCleanLock<T>(cacheDir: string, action: () => Promise<T>) {
  const lockDir = dirname(cacheDir)
  const lockPath = join(lockDir, '.vxrn-clean.lock')
  const startedAt = Date.now()
  const timeoutMs = getCleanLockTimeoutMs()
  await mkdir(lockDir, { recursive: true })
  const created = await joinLegacyLock(lockPath, startedAt, timeoutMs)

  let releasePort: () => Promise<void>
  try {
    releasePort = await acquirePortLock(await getCacheCleanLockPort(lockDir), startedAt, timeoutMs)
  } catch (err) {
    if (created) {
      try {
        await removeOwnLegacyLock(lockPath)
      } catch {
        // acquisition already failed; the original error stays actionable
      }
    }
    throw err
  }

  try {
    return await action()
  } finally {
    await releasePort()
    if (created) {
      await removeOwnLegacyLock(lockPath)
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
