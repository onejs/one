import { execFile, spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function waitForFile(path: string, timeoutMs: number) {
  const started = Date.now()
  while (true) {
    try {
      await readFile(path)
      return
    } catch {
      if (Date.now() - started > timeoutMs) {
        throw new Error(`timed out waiting for ${path}`)
      }
      await sleep(25)
    }
  }
}

async function waitForExit(child: ChildProcess, timeoutMs: number) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for worker exit')), timeoutMs)
    if (child.exitCode !== null) {
      clearTimeout(timer)
      resolve()
      return
    }
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

// pid of a real process that has exited, so legacy file contents prove
// dead-owner behavior instead of trusting a made-up number
function deadPid(): number {
  const probe = spawnSync('bun', ['-e', ''], { stdio: 'ignore' })
  const pid = probe.pid as number
  expect(() => process.kill(pid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }))
  return pid
}

async function writeStaleCache(root: string, cacheDir: string, viteDir: string) {
  await Promise.all([
    mkdir(cacheDir, { recursive: true }),
    mkdir(viteDir, { recursive: true }),
  ])
  await Promise.all([
    writeFile(join(cacheDir, 'state.json'), JSON.stringify({ versionHash: 'old' })),
    writeFile(join(cacheDir, 'stale'), 'stale'),
    writeFile(join(viteDir, 'stale'), 'stale'),
  ])
}

function cleanWorkerScript(root: string, cacheDir: string, moduleUrl: string) {
  return `
    import { prepareCacheForVersion } from ${JSON.stringify(moduleUrl)}
    const cleaned = await prepareCacheForVersion({
      root: ${JSON.stringify(root)},
      cacheDir: ${JSON.stringify(cacheDir)},
      versionHash: 'new',
    })
    console.info(cleaned ? 'cleaned-by-worker' : 'cache-already-current')
  `
}

function holderScript(cacheDir: string, readyPath: string, holdMs: number, moduleUrl: string) {
  return `
    import { writeFile } from 'node:fs/promises'
    import { acquireCacheCleanLock } from ${JSON.stringify(moduleUrl)}
    const release = await acquireCacheCleanLock(${JSON.stringify(cacheDir)})
    await writeFile(${JSON.stringify(readyPath)}, '')
    await Bun.sleep(${holdMs})
    await release()
  `
}

async function expectCleanedCache(cacheDir: string, viteDir: string) {
  expect(JSON.parse(await readFile(join(cacheDir, 'state.json'), 'utf8'))).toEqual({
    versionHash: 'new',
  })
  await expect(readFile(join(cacheDir, 'stale'))).rejects.toMatchObject({
    code: 'ENOENT',
  })
  await expect(readFile(join(viteDir, 'stale'))).rejects.toMatchObject({
    code: 'ENOENT',
  })
}

describe('prepareCacheForVersion', () => {
  let root: string | undefined

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('lets one process clean a stale same-root cache', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-concurrent-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const participantsDir = join(root, 'participants')
    const participantCount = 4

    await Promise.all([
      mkdir(cacheDir, { recursive: true }),
      mkdir(viteDir, { recursive: true }),
      mkdir(participantsDir, { recursive: true }),
    ])
    await Promise.all([
      writeFile(join(cacheDir, 'state.json'), JSON.stringify({ versionHash: 'old' })),
      writeFile(join(cacheDir, 'stale'), 'stale'),
      writeFile(join(viteDir, 'stale'), 'stale'),
    ])

    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    const workerScript = (participant: number) => `
      import { readdir, writeFile } from 'node:fs/promises'
      import { join } from 'node:path'
      import { prepareCacheForVersion } from ${JSON.stringify(moduleUrl)}

      const root = ${JSON.stringify(root)}
      const participantsDir = ${JSON.stringify(participantsDir)}
      await writeFile(join(participantsDir, ${JSON.stringify(String(participant))}), '')
      while ((await readdir(participantsDir)).length < ${participantCount}) {
        await Bun.sleep(5)
      }
      const cleaned = await prepareCacheForVersion({
        root,
        cacheDir: join(root, 'node_modules', '.vxrn'),
        versionHash: 'new',
      })
      console.info(cleaned ? 'cleaned-by-worker' : 'cache-already-current')
    `

    const results = await Promise.all(
      Array.from({ length: participantCount }, (_, participant) =>
        execFileAsync('bun', ['-e', workerScript(participant)], {
          env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        })
      )
    )
    const output = results.map(({ stdout }) => stdout).join('\n')

    expect(output.match(/\[vxrn\] cleaning/g)).toHaveLength(1)
    expect(output.match(/cleaned-by-worker/g)).toHaveLength(1)
    expect(JSON.parse(await readFile(join(cacheDir, 'state.json'), 'utf8'))).toEqual({
      versionHash: 'new',
    })
    await expect(readFile(join(cacheDir, 'stale'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(readFile(join(viteDir, 'stale'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  }, 20_000)

  it('acquires immediately after the holder dies', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-holder-death-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const holderReady = join(root, 'holder-ready')
    const waiterStarted = join(root, 'waiter-started')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)

    const waiterScript = `
      import { writeFile } from 'node:fs/promises'
      import { prepareCacheForVersion } from ${JSON.stringify(moduleUrl)}
      await writeFile(${JSON.stringify(waiterStarted)}, '')
      const cleaned = await prepareCacheForVersion({
        root: ${JSON.stringify(root)},
        cacheDir: ${JSON.stringify(cacheDir)},
        versionHash: 'new',
      })
      console.info(cleaned ? 'cleaned-by-worker' : 'cache-already-current')
    `
    const holder = spawn('bun', ['-e', holderScript(cacheDir, holderReady, 30_000, moduleUrl)], {
      stdio: 'ignore',
    })
    let waiter: ChildProcess | undefined
    let stdout = ''
    let stderr = ''

    try {
      await waitForFile(holderReady, 10_000)
      waiter = spawn('bun', ['-e', waiterScript], {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      waiter.stdout?.on('data', (data) => (stdout += data))
      waiter.stderr?.on('data', (data) => (stderr += data))
      await waitForFile(waiterStarted, 10_000)
      await sleep(1000)
      expect(holder.exitCode).toBeNull()
      // the waiter is past startup with the lock held, so it is blocked
      // inside acquisition and can only proceed once the holder dies
      expect(waiter.exitCode).toBeNull()
      holder.kill('SIGKILL')
      await waitForExit(holder, 10_000)
      await waitForExit(waiter, 30_000)
      expect(waiter.exitCode).toBe(0)
      expect(stderr).toBe('')
      expect(stdout).toMatch('[vxrn] cleaning')
      expect(stdout).toMatch('cleaned-by-worker')
      await expectCleanedCache(cacheDir, viteDir)
    } finally {
      holder.kill('SIGKILL')
      waiter?.kill('SIGKILL')
    }
  }, 60_000)

  it('waits for a live holder then acquires after release', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-live-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const holderReady = join(root, 'holder-ready')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)

    const holder = execFileAsync(
      'bun',
      ['-e', holderScript(cacheDir, holderReady, 1500, moduleUrl)],
      { timeout: 30_000 }
    )
    await waitForFile(holderReady, 10_000)

    const startedAt = Date.now()
    const { stdout } = await execFileAsync(
      'bun',
      ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)],
      {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        timeout: 30_000,
      }
    )

    await holder
    // the waiter cannot finish before the 1500ms hold is released
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1000)
    expect(stdout).toMatch('[vxrn] cleaning')
    expect(stdout).toMatch('cleaned-by-worker')
    await expectCleanedCache(cacheDir, viteDir)
  }, 60_000)

  it('ignores legacy lock files with dead or unknown owners', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-legacy-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href

    const pid = deadPid()
    for (const content of [`${pid}\n`, `${pid}:${randomUUID()}\n`, 'not-a-pid\n', '0\n']) {
      await writeStaleCache(root, cacheDir, viteDir)
      await writeFile(lockPath, content, { flag: 'wx' })

      const { stdout } = await execFileAsync(
        'bun',
        ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)],
        {
          env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
          timeout: 30_000,
        }
      )

      expect(stdout).toMatch('[vxrn] cleaning')
      expect(stdout).toMatch('cleaned-by-worker')
      expect(await readFile(lockPath, 'utf8')).toBe(content)
      await expectCleanedCache(cacheDir, viteDir)
      await rm(lockPath, { force: true })
    }
  }, 60_000)

  it('serializes simultaneous contenders to one clean', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-concurrent-contend-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const participantsDir = join(root, 'participants')
    const participantCount = 2
    await writeStaleCache(root, cacheDir, viteDir)
    await mkdir(participantsDir, { recursive: true })
    // a stale pid file from an older vxrn must not disturb the mutex
    await writeFile(join(root, 'node_modules', '.vxrn-clean.lock'), `${deadPid()}\n`, {
      flag: 'wx',
    })

    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    const workerScript = (participant: number) => `
      import { readdir, writeFile } from 'node:fs/promises'
      import { join } from 'node:path'
      import { prepareCacheForVersion } from ${JSON.stringify(moduleUrl)}

      const root = ${JSON.stringify(root)}
      const participantsDir = ${JSON.stringify(participantsDir)}
      await writeFile(join(participantsDir, ${JSON.stringify(String(participant))}), '')
      while ((await readdir(participantsDir)).length < ${participantCount}) {
        await Bun.sleep(5)
      }
      const cleaned = await prepareCacheForVersion({
        root,
        cacheDir: join(root, 'node_modules', '.vxrn'),
        versionHash: 'new',
      })
      console.info(cleaned ? 'cleaned-by-worker' : 'cache-already-current')
    `

    const results = await Promise.all(
      Array.from({ length: participantCount }, (_, participant) =>
        execFileAsync('bun', ['-e', workerScript(participant)], {
          env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
          timeout: 30_000,
        })
      )
    )
    const output = results.map(({ stdout }) => stdout).join('\n')

    expect(output.match(/\[vxrn\] cleaning/g)).toHaveLength(1)
    expect(output.match(/cleaned-by-worker/g)).toHaveLength(1)
    await expectCleanedCache(cacheDir, viteDir)
  }, 60_000)
})
