import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const testDir = join(import.meta.dirname, '..')
const cacheFile = join(testDir, 'node_modules', '.vite', 'one-warm-deps.json')
const privateExportDep = '@one-tests/private-export'
const privateExportDir = join(testDir, 'node_modules', '@one-tests', 'private-export')
// Resolve one's JS entry (run.mjs) instead of node_modules/.bin/one: on Windows
// the .bin shim is a .cmd/.ps1/.exe wrapper that `node <path>` can't load
// (MODULE_NOT_FOUND), so the dev server never starts. Resolving via package.json
// gives the real JS file on every platform (mirrors packages/test/src/setupTest.ts).
const oneRunEntry = join(
  dirname(createRequire(import.meta.url).resolve('one/package.json')),
  'run.mjs'
)

function cleanup() {
  // clear .vite cache so we start fresh
  const viteCache = join(testDir, 'node_modules', '.vite')
  if (existsSync(viteCache)) {
    rmSync(viteCache, { recursive: true })
  }
  if (existsSync(privateExportDir)) {
    rmSync(privateExportDir, { recursive: true })
  }
}

function startDevServer(port: number): {
  proc: ChildProcess
  output: string[]
  waitFor: (pattern: string | RegExp, timeoutMs?: number) => Promise<string>
  kill: () => void
} {
  const output: string[] = []

  const proc = spawn('node', [oneRunEntry, 'dev', '--port', port.toString()], {
    cwd: testDir,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    // detached so the whole process group can be killed on POSIX (one dev spawns
    // child workers); on Windows the tree is killed via taskkill /T in kill().
    detached: process.platform !== 'win32',
  })

  proc.stdout?.on('data', (data) => {
    const line = data.toString()
    output.push(line)
    process.stdout.write(`[dev] ${line}`)
  })

  proc.stderr?.on('data', (data) => {
    const line = data.toString()
    output.push(line)
    process.stderr.write(`[dev:err] ${line}`)
  })

  function waitFor(pattern: string | RegExp, timeoutMs = 60_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const cleanupListeners = () => {
        proc.stdout?.off('data', onData)
        proc.stderr?.off('data', onData)
        proc.off('exit', onExit)
      }
      const timer = setTimeout(() => {
        cleanupListeners()
        reject(
          new Error(
            `Timed out waiting for "${pattern}" after ${timeoutMs}ms.\nOutput so far:\n${output.join('')}`
          )
        )
      }, timeoutMs)

      // check existing output
      const existing = output.join('')
      if (
        typeof pattern === 'string' ? existing.includes(pattern) : pattern.test(existing)
      ) {
        clearTimeout(timer)
        resolve(existing)
        return
      }

      // listen for new output
      const onData = (data: Buffer) => {
        const all = output.join('')
        if (typeof pattern === 'string' ? all.includes(pattern) : pattern.test(all)) {
          clearTimeout(timer)
          cleanupListeners()
          resolve(all)
        }
      }
      const onExit = (code: number | null) => {
        clearTimeout(timer)
        cleanupListeners()
        reject(
          new Error(
            `Dev server exited with code ${code} before "${pattern}".\nOutput so far:\n${output.join('')}`
          )
        )
      }
      proc.stdout?.on('data', onData)
      proc.stderr?.on('data', onData)
      proc.on('exit', onExit)
    })
  }

  function kill() {
    if (!proc.pid) return
    if (process.platform === 'win32') {
      // node cannot signal a process group on Windows; taskkill /T kills the tree.
      try {
        spawn('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' })
      } catch {}
    } else {
      try {
        process.kill(-proc.pid, 'SIGKILL')
      } catch {
        try {
          proc.kill('SIGKILL')
        } catch {}
      }
    }
  }

  return { proc, output, waitFor, kill }
}

async function main() {
  const port = 18765

  console.info('\n=== Test: warmRoutes plugin ===\n')

  // clean slate
  cleanup()

  console.info('--- Run 1: warming routes, expecting cache to be written ---\n')

  const run1 = startDevServer(port)

  try {
    // wait for the server to start
    await run1.waitFor('Server running', 60_000)

    // send requests to trigger dep optimization discovery
    console.info('\nSending requests to trigger dep discovery...')
    await fetch(`http://localhost:${port}/`).catch(() => {})
    await fetch(`http://localhost:${port}/other`).catch(() => {})

    // wait for dep optimization to run and the cache to be written (~5s interval)
    await run1.waitFor('cached', 30_000).catch(() => {
      // if we don't see "cached", check if cache file was written anyway
      console.info('\nDid not see "cached" message. Checking server...')
    })

    // also wait a bit for the metadata file to be written
    await new Promise((r) => setTimeout(r, 3000))

    const cacheExists = existsSync(cacheFile)
    console.info(`\nCache file exists: ${cacheExists}`)

    if (cacheExists) {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'))
      console.info(`Cached deps count: ${cached.deps?.length ?? 0}`)
      console.info(`First few deps: ${cached.deps?.slice(0, 5).join(', ')}`)
      console.info('\n✅ Run 1 PASSED: cache file was written\n')
    } else {
      console.info('\n❌ Run 1 FAILED: cache file was not written')
      console.info('Full output:')
      console.info(run1.output.join(''))
    }
  } finally {
    run1.kill()
    await new Promise((r) => setTimeout(r, 1000))
  }

  if (!existsSync(cacheFile)) {
    console.info('\nSkipping run 2 since run 1 failed')
    process.exit(1)
  }

  const cache = JSON.parse(readFileSync(cacheFile, 'utf-8'))
  mkdirSync(privateExportDir, { recursive: true })
  writeFileSync(
    join(privateExportDir, 'package.json'),
    JSON.stringify(
      {
        name: privateExportDep,
        type: 'module',
        exports: { './allowed': './allowed.js' },
      },
      null,
      2
    )
  )
  writeFileSync(
    cacheFile,
    JSON.stringify({ deps: [...cache.deps, privateExportDep].sort() }, null, 2)
  )

  console.info('--- Run 2: expecting stale cached deps to be pruned on startup ---\n')

  const run2 = startDevServer(port)

  try {
    // wait for server to be ready
    await run2.waitFor('Server running', 60_000)

    const fullOutput = run2.output.join('')
    // autoWarmPlugin logs "loading X cached warm deps" on startup when cache exists
    const loadedCache = fullOutput.includes('cached warm deps')

    if (loadedCache) {
      console.info('\n✅ Run 2 PASSED: cached deps were loaded on startup\n')
    } else {
      console.info('\n❌ Run 2 FAILED: cached deps were NOT loaded on startup')
      console.info('Full output:')
      console.info(fullOutput)
    }

    const prunedCache = JSON.parse(readFileSync(cacheFile, 'utf-8'))
    if (prunedCache.deps.includes(privateExportDep)) {
      throw new Error(`Stale warm dependency was not pruned: ${privateExportDep}`)
    }
  } finally {
    run2.kill()
    await new Promise((r) => setTimeout(r, 1000))
  }

  // cleanup
  cleanup()

  console.info('=== Done ===\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
