import { execFile, spawn, spawnSync } from 'node:child_process'
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

// pid of a real process that has exited, so checks against it prove dead-owner
// behavior instead of trusting a made-up number
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

async function expectCleanedCache(root: string, cacheDir: string, viteDir: string) {
  expect(JSON.parse(await readFile(join(cacheDir, 'state.json'), 'utf8'))).toEqual({
    versionHash: 'new',
  })
  await expect(readFile(join(cacheDir, 'stale'))).rejects.toMatchObject({
    code: 'ENOENT',
  })
  await expect(readFile(join(viteDir, 'stale'))).rejects.toMatchObject({
    code: 'ENOENT',
  })
  await expect(readFile(join(root, 'node_modules', '.vxrn-clean.lock'))).rejects.toMatchObject(
    { code: 'ENOENT' }
  )
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
    await expect(
      readFile(join(root, 'node_modules', '.vxrn-clean.lock'))
    ).rejects.toMatchObject({ code: 'ENOENT' })
  }, 20_000)

  it('reclaims locks abandoned by dead owners in legacy and current formats', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-stale-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href

    const pid = deadPid()
    for (const content of [`${pid}\n`, `${pid}:${randomUUID()}\n`]) {
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
      await expectCleanedCache(root, cacheDir, viteDir)
    }
  }, 60_000)

  it('waits for a live owner without removing its lock', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-live-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const readyPath = join(root, 'holder-ready')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)

    const holderScript = `
      import { readFile, rm, writeFile } from 'node:fs/promises'
      const lockPath = ${JSON.stringify(lockPath)}
      await writeFile(lockPath, \`\${process.pid}\\n\`, { flag: 'wx' })
      await writeFile(${JSON.stringify(readyPath)}, '')
      await Bun.sleep(1500)
      const content = await readFile(lockPath, 'utf8')
      if (content.trim() !== \`\${process.pid}\`) {
        console.error('live lock was removed or replaced while held')
        process.exit(1)
      }
      await rm(lockPath)
    `
    const holder = execFileAsync('bun', ['-e', holderScript])
    await waitForFile(readyPath, 10_000)

    const { stdout } = await execFileAsync(
      'bun',
      ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)],
      {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        timeout: 30_000,
      }
    )

    await holder
    expect(stdout).toMatch('[vxrn] cleaning')
    expect(stdout).toMatch('cleaned-by-worker')
    await expectCleanedCache(root, cacheDir, viteDir)
  }, 60_000)

  it('serializes two simultaneous reclaimers of one stale lock', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-concurrent-reclaim-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const participantsDir = join(root, 'participants')
    const participantCount = 2
    await writeStaleCache(root, cacheDir, viteDir)
    await mkdir(participantsDir, { recursive: true })
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
    await expectCleanedCache(root, cacheDir, viteDir)
  }, 60_000)

  it('never removes a lock with an unknown owner', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-unknown-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const lockPath = join(root, 'node_modules', '.vxrn-clean.lock')
    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    await writeStaleCache(root, cacheDir, viteDir)

    for (const content of ['not-a-pid\n', '0\n']) {
      await writeFile(lockPath, content, { flag: 'wx' })
      const waiter = spawn('bun', ['-e', cleanWorkerScript(root, cacheDir, moduleUrl)], {
        env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        stdio: 'ignore',
      })
      try {
        await sleep(3000)
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
})
