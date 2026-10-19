import { execFile, spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { connect, createServer, type Server, type Socket } from 'node:net'
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

// stale cache whose removal takes seconds, so a cleaner can be observed
// mid-hold and killed there deterministically
async function writeBigStaleCache(root: string, cacheDir: string, viteDir: string) {
  const bigDir = join(viteDir, 'big')
  await writeStaleCache(root, cacheDir, viteDir)
  await mkdir(bigDir, { recursive: true })
  const count = 50_000
  const batch = 1000
  for (let index = 0; index < count; index += batch) {
    await Promise.all(
      Array.from({ length: Math.min(batch, count - index) }, (_, offset) =>
        writeFile(join(bigDir, `f${index + offset}`), 'x')
      )
    )
  }
  return { bigDir, count }
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

// mutex range under test; must match clean.ts. the tests fail closed if it
// drifts: scans find nothing and the squat misses the lock port.
const CLEAN_LOCK_PORT_BASE = 24_000
const CLEAN_LOCK_PORT_COUNT = 1_000

async function tryConnect(port: number): Promise<Socket | undefined> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => resolve(socket))
    socket.once('error', () => {
      socket.destroy()
      resolve(undefined)
    })
  })
}

// every accepting port in the mutex range, without knowing which one this
// root hashes to. the caller owns the returned sockets.
async function scanLockPorts(): Promise<{ port: number; socket: Socket }[]> {
  const found: { port: number; socket: Socket }[] = []
  await Promise.all(
    Array.from({ length: CLEAN_LOCK_PORT_COUNT }, async (_, offset) => {
      const port = CLEAN_LOCK_PORT_BASE + offset
      const socket = await tryConnect(port)
      if (socket) {
        found.push({ port, socket })
      }
    })
  )
  return found
}

// outermost node_modules above the test, so a bundled worker's bare
// imports (vite, fs-extra, ...) resolve the way the workspace lays out
function outermostNodeModules(from: string): string {
  let dir = from
  let found: string | undefined
  while (true) {
    const candidate = join(dir, 'node_modules')
    if (existsSync(candidate)) {
      found = candidate
    }
    const parent = dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }
  if (!found) {
    throw new Error('no node_modules found above the test')
  }
  return found
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

  it('excludes pathname aliases of the same physical cache', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-alias-clean-'))
    const realRoot = join(root, 'real')
    const aliasRoot = join(root, 'alias')
    const cacheDir = join(realRoot, 'node_modules', '.vxrn')
    const viteDir = join(realRoot, 'node_modules', '.vite')
    const aliasCacheDir = join(aliasRoot, 'node_modules', '.vxrn')
    const participantsDir = join(root, 'participants')
    const participantCount = 2
    await writeStaleCache(realRoot, cacheDir, viteDir)
    await mkdir(participantsDir, { recursive: true })
    await symlink(realRoot, aliasRoot)
    // a dead owner's corpse routes both contenders around file creation, so
    // only the canonical port identity can serialize them
    const corpse = `${deadPid()}\n`
    await writeFile(join(realRoot, 'node_modules', '.vxrn-clean.lock'), corpse, { flag: 'wx' })

    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    const workerScript = (participant: number, workerCacheDir: string) => `
      import { readdir, writeFile } from 'node:fs/promises'
      import { join } from 'node:path'
      import { prepareCacheForVersion } from ${JSON.stringify(moduleUrl)}

      const participantsDir = ${JSON.stringify(participantsDir)}
      await writeFile(join(participantsDir, ${JSON.stringify(String(participant))}), '')
      while ((await readdir(participantsDir)).length < ${participantCount}) {
        await Bun.sleep(5)
      }
      const cleaned = await prepareCacheForVersion({
        root: ${JSON.stringify(realRoot)},
        cacheDir: ${JSON.stringify(workerCacheDir)},
        versionHash: 'new',
      })
      console.info(cleaned ? 'cleaned-by-worker' : 'cache-already-current')
    `

    const results = await Promise.all([
      execFileAsync('bun', ['-e', workerScript(0, cacheDir)], {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        timeout: 30_000,
      }),
      execFileAsync('bun', ['-e', workerScript(1, aliasCacheDir)], {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        timeout: 30_000,
      }),
    ])
    const output = results.map(({ stdout }) => stdout).join('\n')

    expect(output.match(/\[vxrn\] cleaning/g)).toHaveLength(1)
    expect(output.match(/cleaned-by-worker/g)).toHaveLength(1)
    await expectCleanedCache(cacheDir, viteDir)
    expect(await readFile(join(realRoot, 'node_modules', '.vxrn-clean.lock'), 'utf8')).toBe(corpse)
  }, 60_000)

  it('lets the next cleaner proceed after the holder dies mid-hold', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-holder-death-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    const { bigDir, count } = await writeBigStaleCache(root, cacheDir, viteDir)

    const holder = spawn('bun', ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)], {
      env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
      stdio: 'ignore',
    })
    try {
      // the holder is inside once files start disappearing and its removal
      // of the tiny cache dir has taken state.json with it
      const startedAt = Date.now()
      while (true) {
        const remaining = await readdir(bigDir).catch(() => [] as string[])
        const stateGone = await readFile(join(cacheDir, 'state.json')).then(
          () => false,
          () => true
        )
        if (remaining.length < count && stateGone) {
          break
        }
        if (Date.now() - startedAt > 15_000) {
          throw new Error('holder never entered its critical section')
        }
        await sleep(25)
      }
      holder.kill('SIGKILL')
      await new Promise<void>((resolve) => holder.on('exit', () => resolve()))
      expect(await readFile(join(root, 'node_modules', '.vxrn-clean.lock'), 'utf8')).toBe(
        `${holder.pid}\n`
      )

      const { stdout } = await execFileAsync(
        'bun',
        ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)],
        {
          env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
          timeout: 30_000,
        }
      )

      // the successor enters past the corpse and the freed port: absent
      // state means no version to compare, so it records the new version
      // without cleaning rather than hanging on the dead owner
      expect(stdout).not.toMatch('[vxrn] cleaning')
      expect(stdout).toMatch('cache-already-current')
      expect(JSON.parse(await readFile(join(cacheDir, 'state.json'), 'utf8'))).toEqual({
        versionHash: 'new',
      })
      expect(await readFile(join(root, 'node_modules', '.vxrn-clean.lock'), 'utf8')).toBe(
        `${holder.pid}\n`
      )
    } finally {
      holder.kill('SIGKILL')
    }
  }, 60_000)

  it('waits for a live legacy holder then cleans after release', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-live-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const readyPath = join(root, 'holder-ready')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)

    // old-version holder: pid file plus unconditional release, no port
    const holderScript = `
      import { rm, writeFile } from 'node:fs/promises'
      const lockPath = ${JSON.stringify(lockPath)}
      await writeFile(lockPath, \`\${process.pid}\\n\`, { flag: 'wx' })
      await writeFile(${JSON.stringify(readyPath)}, '')
      await Bun.sleep(1500)
      await rm(lockPath)
    `
    const holder = execFileAsync('bun', ['-e', holderScript])
    await waitForFile(readyPath, 10_000)

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
    // the waiter cannot finish before the 1500ms legacy hold is released
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1000)
    expect(stdout).toMatch('[vxrn] cleaning')
    expect(stdout).toMatch('cleaned-by-worker')
    await expectCleanedCache(cacheDir, viteDir)
    await expect(readFile(lockPath)).rejects.toMatchObject({ code: 'ENOENT' })
  }, 60_000)

  it('never enters past a lock with an unknown owner', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-unknown-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)

    const pid = deadPid()
    for (const content of ['not-a-pid\n', '0\n', `${pid}:${randomUUID()}\n`]) {
      await writeFile(lockPath, content, { flag: 'wx' })
      const waiter = spawn('bun', ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)], {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        stdio: 'ignore',
      })
      try {
        await sleep(2000)
        expect(waiter.exitCode).toBeNull()
        expect(await readFile(lockPath, 'utf8')).toBe(content)
      } finally {
        waiter.kill('SIGKILL')
        if (waiter.exitCode === null) {
          await new Promise<void>((resolve) => waiter.on('exit', () => resolve()))
        }
        await rm(lockPath, { force: true })
      }
    }

    expect(JSON.parse(await readFile(join(cacheDir, 'state.json'), 'utf8'))).toEqual({
      versionHash: 'old',
    })
    expect(await readFile(join(cacheDir, 'stale'), 'utf8')).toBe('stale')
  }, 60_000)

  it('cleans past a dead legacy owner without deleting its file', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-dead-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)
    const corpse = `${deadPid()}\n`
    await writeFile(lockPath, corpse, { flag: 'wx' })

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
    await expectCleanedCache(cacheDir, viteDir)
    expect(await readFile(lockPath, 'utf8')).toBe(corpse)
  }, 60_000)

  it('releases on node while ordinary connections are held mid-hold', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-node-release-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const { bigDir, count } = await writeBigStaleCache(root, cacheDir, viteDir)

    // bundle current source so plain node runs the exact corrected runtime:
    // bun completes release with accepted connections pending, node does
    // not unless the server rejects them at once
    const probeDir = join(
      outermostNodeModules(dirname(import.meta.filename)),
      '.cache',
      `vxrn-clean-node-${randomUUID()}`
    )
    const bundlePath = join(probeDir, 'clean.bundle.mjs')
    await mkdir(probeDir, { recursive: true })
    const held: Socket[] = []
    const workerScript = `
      const { prepareCacheForVersion } = await import(${JSON.stringify(
        pathToFileURL(bundlePath).href
      )})
      const cleaned = await prepareCacheForVersion({
        root: ${JSON.stringify(root)},
        cacheDir: ${JSON.stringify(cacheDir)},
        versionHash: 'new',
      })
      console.info(cleaned ? 'cleaned-by-worker' : 'cache-already-current')
    `
    try {
      await execFileAsync(
        'bun',
        [
          'build',
          join(dirname(import.meta.filename), 'clean.ts'),
          '--outfile',
          bundlePath,
          '--format',
          'esm',
          '--packages',
          'external',
        ],
        { timeout: 60_000 }
      )
      const baseline = new Set(
        (await scanLockPorts()).map(({ port, socket }) => {
          socket.destroy()
          return port
        })
      )
      const worker = spawn('node', ['--input-type=module', '-e', workerScript], {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      worker.stdout?.on('data', (data) => (stdout += data))
      worker.stderr?.on('data', (data) => (stderr += data))
      try {
        let acceptedMidHold = 0
        let midHoldSeen = false
        const startedAt = Date.now()
        while (worker.exitCode === null && Date.now() - startedAt < 45_000) {
          const remaining = await readdir(bigDir).catch(() => [] as string[])
          const stateGone = await readFile(join(cacheDir, 'state.json')).then(
            () => false,
            () => true
          )
          if (remaining.length < count && stateGone) {
            midHoldSeen = true
            for (const { port, socket } of await scanLockPorts()) {
              if (baseline.has(port)) {
                socket.destroy()
              } else {
                acceptedMidHold++
                held.push(socket)
              }
            }
          }
          await sleep(150)
        }
        if (worker.exitCode === null) {
          worker.kill('SIGKILL')
          await new Promise<void>((resolve) => worker.on('exit', () => resolve()))
          throw new Error(
            `node worker never released with ${acceptedMidHold} connections held: ${stderr}`
          )
        }
        expect(midHoldSeen).toBe(true)
        expect(acceptedMidHold).toBeGreaterThan(0)
        expect(worker.exitCode).toBe(0)
        expect(stdout).toMatch('[vxrn] cleaning')
        expect(stdout).toMatch('cleaned-by-worker')
        await expectCleanedCache(cacheDir, viteDir)
      } finally {
        worker.kill('SIGKILL')
      }
    } finally {
      for (const socket of held) {
        socket.destroy()
      }
      await rm(probeDir, { recursive: true, force: true })
    }
  }, 120_000)

  it('removes its own file when port acquisition fails', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-port-failure-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)

    // squat the whole mutex range so port acquisition must fail without
    // knowing which port this root hashes to
    const squatters: Server[] = []
    try {
      await Promise.all(
        Array.from({ length: CLEAN_LOCK_PORT_COUNT }, (_, offset) => {
          const port = CLEAN_LOCK_PORT_BASE + offset
          return new Promise<void>((resolve, reject) => {
            const server = createServer()
            server.once('error', (err: Error) => {
              if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
                // a foreign occupant fails the worker the same way
                resolve()
              } else {
                reject(err)
              }
            })
            server.once('listening', () => {
              squatters.push(server)
              resolve()
            })
            server.listen({ port, host: '127.0.0.1' })
          })
        })
      )

      const failure = await execFileAsync(
        'bun',
        ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)],
        {
          env: {
            ...process.env,
            VXRN_DONT_CLEAN_SELF: '',
            VXRN_CLEAN_LOCK_TIMEOUT_MS: '2000',
          },
          timeout: 30_000,
        }
      ).then(
        () => undefined,
        (err: unknown) => err as NodeJS.ErrnoException & { stderr?: string }
      )

      expect(failure, 'cleaner must fail while the mutex range is squatted').toBeDefined()
      expect(String(failure?.stderr ?? failure)).toMatch(
        'Timed out waiting for VXRN cache cleanup lock'
      )
      await expect(readFile(lockPath)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(JSON.parse(await readFile(join(cacheDir, 'state.json'), 'utf8'))).toEqual({
        versionHash: 'old',
      })
      expect(await readFile(join(cacheDir, 'stale'), 'utf8')).toBe('stale')
    } finally {
      await Promise.all(
        squatters.map(
          (server) => new Promise<void>((resolve) => server.close(() => resolve()))
        )
      )
    }
  }, 60_000)
})
