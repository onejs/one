import getPort, { portNumbers } from 'get-port'
import { exec, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { ONLY_TEST_DEV, ONLY_TEST_PROD } from './constants'

const execAsync = promisify(exec)

export async function killProcessOnPort(port: number): Promise<void> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t`)
    const pids = stdout.trim().split('\n').filter(Boolean)

    if (pids.length > 0) {
      console.info(`Killing processes on port ${port}: ${pids.join(', ')}`)
      await Promise.all(pids.map((pid) => execAsync(`kill -9 ${pid}`).catch(() => {})))
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  } catch (error) {
    // no process found on port, which is fine
  }
}

export type TestInfo = {
  testProdPort: number
  testDevPort: number
  devServerPid?: number
  prodServerPid?: number
  buildPid: number | null
  testDir: string
}

// CI environments may have slower startup due to resource contention
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
const DEFAULT_MAX_RETRIES = isCI ? 960 : 480 // 4 min on CI, 2 min locally
const DEFAULT_RETRY_INTERVAL = 250

// max lines of server output to keep for diagnostics (ring buffer)
const MAX_OUTPUT_LINES = 200

/**
 * spawn a server process with piped stdio so we can capture output for
 * diagnostics and detect early crashes. the streams are unref'd so the
 * parent process can still exit cleanly.
 */
function spawnServer(
  command: string,
  args: string[],
  options: {
    cwd: string
    env: typeof process.env
    detached?: boolean
  }
): { child: ChildProcess; getOutput: () => string; exited: Promise<number | null> } {
  const outputLines: string[] = []

  const child = spawn(command, args, {
    ...options,
    detached: options.detached ?? true,
    // pipe so we can capture output for crash diagnostics
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const appendOutput = (data: Buffer) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      if (line) {
        outputLines.push(line)
        // ring buffer: drop oldest lines when we exceed the limit
        if (outputLines.length > MAX_OUTPUT_LINES) {
          outputLines.shift()
        }
      }
    }
  }

  child.stdout?.on('data', appendOutput)
  child.stderr?.on('data', appendOutput)

  // unref process so parent can exit even if child is alive
  child.unref()

  const exited = new Promise<number | null>((resolve) => {
    child.once('exit', (code) => resolve(code))
    child.once('error', () => resolve(null))
  })

  return {
    child,
    getOutput: () => outputLines.join('\n'),
    exited,
  }
}

const waitForServer = (
  url: string,
  {
    maxRetries = DEFAULT_MAX_RETRIES,
    retryInterval = DEFAULT_RETRY_INTERVAL,
    getServerOutput = () => '',
    serverExited,
  }: {
    maxRetries?: number
    retryInterval?: number
    getServerOutput?: () => string
    // if provided, reject immediately when the server process exits
    serverExited?: Promise<number | null>
  }
): Promise<void> => {
  const startedAt = performance.now()
  return new Promise((resolve, reject) => {
    let done = false

    // fail fast if the server process exits before becoming ready
    if (serverExited) {
      serverExited.then((code) => {
        if (!done) {
          done = true
          const elapsed = Math.round(performance.now() - startedAt)
          reject(
            new Error(
              `Server process exited with code ${code} after ${elapsed}ms before becoming ready.\nLogs:\n${getServerOutput()}`
            )
          )
        }
      })
    }

    let retries = 0
    const checkServer = async () => {
      if (done) return
      try {
        const response = await fetch(url)
        if (response.ok) {
          done = true
          console.info(
            `Server at ${url} is ready after ${Math.round(performance.now() - startedAt)}ms`
          )
          // warmup: make a few more requests to ensure server is stable
          await warmupServer(url)
          resolve()
        } else {
          throw new Error('Server not ready')
        }
      } catch (error) {
        if (done) return
        if (retries >= maxRetries) {
          done = true
          reject(
            new Error(
              `Server at ${url} did not start within the expected time (timeout after waiting for ${Math.round(performance.now() - startedAt)}ms).\nLogs:\n${getServerOutput()}`
            )
          )
        } else {
          retries++
          // log progress every 30 seconds to show we're still waiting
          if (retries % 120 === 0) {
            console.info(
              `Still waiting for ${url}... (${Math.round((performance.now() - startedAt) / 1000)}s)`
            )
          }
          setTimeout(checkServer, retryInterval)
        }
      }
    }
    checkServer()
  })
}

async function warmupServer(url: string, requests = 1): Promise<void> {
  for (let i = 0; i < requests; i++) {
    try {
      await fetch(url)
    } catch {
      // ignore warmup errors
    }
  }
}

export async function setupTestServers({
  skipDev = false,
}: { skipDev?: boolean } = {}): Promise<TestInfo> {
  const runWithNonCliMode = !!process.env.TEST_NON_CLI_MODE
  console.info('Setting up tests')

  let prodServer: ChildProcess | null = null
  let devServer: ChildProcess | null = null
  let buildProcess: ChildProcess | null = null

  const shouldStartDevServer = !ONLY_TEST_PROD && !skipDev
  const shouldStartProdServer = !ONLY_TEST_DEV

  // get available ports in a high range to avoid conflicts with common dev servers
  // use wider random offset to reduce race conditions when multiple tests start simultaneously
  // range: 10000-60000 gives 50000 ports, much less likely to collide than the previous 200
  const portRangeStart = 10000 + Math.floor(Math.random() * 50000)
  // native tests use a fixed prod port so ONE_SERVER_URL in .env.production matches
  const prodPort = process.env.IS_NATIVE_TEST
    ? 3456
    : await getPort({ port: portNumbers(portRangeStart, 65000) })
  const devPort =
    (process.env.DEV_PORT && Number.parseInt(process.env.DEV_PORT, 10)) ||
    (await getPort({ port: portNumbers(prodPort + 100, 65000) }))

  // ensure ports are clear before starting servers
  await killProcessOnPort(prodPort)
  await killProcessOnPort(devPort)

  let devServerGetOutput = () => ''
  let devServerExited: Promise<number | null> | undefined
  let prodServerGetOutput = () => ''
  let prodServerExited: Promise<number | null> | undefined

  try {
    if (shouldStartProdServer && !process.env.SKIP_BUILD) {
      // run prod build using spawn
      console.info('Starting a prod build.')
      const prodBuildStartedAt = performance.now()
      buildProcess = spawn('bun', ['run', 'build:web'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          ONE_SERVER_URL: `http://localhost:${prodPort}`,
        },
      })
      let buildProcessOutput = ''
      buildProcess.stdout?.on('data', (data) => {
        buildProcessOutput += data.toString()
      })
      buildProcess.stderr?.on('data', (data) => {
        buildProcessOutput += data.toString()
      })

      // wait for build process to complete
      await new Promise<void>((resolve, reject) => {
        buildProcess!.once('exit', (code) => {
          if (code === 0) {
            console.info(
              `Prod build completed successfully after ${Math.round(performance.now() - prodBuildStartedAt)}ms`
            )
            resolve()
          } else {
            reject(
              new Error(
                `Build process exited with code ${code} after ${Math.round(performance.now() - prodBuildStartedAt)}ms.\nLogs:\n${buildProcessOutput}`
              )
            )
          }
        })

        buildProcess!.on('error', reject)
      })
    }

    // start dev server
    if (shouldStartDevServer) {
      console.info(`Starting a dev server on http://localhost:${devPort}`)
      if (runWithNonCliMode) {
        console.info('Running in non-CLI mode, using Vite directly.')
      }

      const devEnv = Object.fromEntries(
        Object.entries(process.env).filter(([k, _v]) => {
          // [WR-B3ATY2VK] Vitest also loads `.env` and `.env.*`, and it loads with
          // MODE=test, also it exposes those env to underlying shell processes, which
          // those explicit env vars will override Vite loading `.env` and `.env.*`,
          // making some of our test fail because env vars are not loaded correctly.
          // So we need to use `env -u` to unset MODE and any env vars we care here.
          if (k === 'MODE' || k === 'VITE_TEST_ENV_MODE') {
            return false
          }
          return true
        })
      ) as typeof process.env

      const devArgs = runWithNonCliMode
        ? ['../../node_modules/.bin/vite', 'dev', '--host', '--port', devPort.toString()]
        : ['../../node_modules/.bin/one', 'dev', '--clean', '--port', devPort.toString()]

      const spawned = spawnServer('node', devArgs, {
        cwd: process.cwd(),
        env: devEnv,
        detached: true,
      })
      devServer = spawned.child
      devServerGetOutput = spawned.getOutput
      devServerExited = spawned.exited
    }

    // start prod server
    if (shouldStartProdServer) {
      console.info(`Starting a prod server on http://localhost:${prodPort}`)
      const spawned = spawnServer(
        'node',
        ['../../node_modules/.bin/one', 'serve', '--port', prodPort.toString()],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ONE_SERVER_URL: `http://localhost:${prodPort}`,
          },
          detached: true,
        }
      )
      prodServer = spawned.child
      prodServerGetOutput = spawned.getOutput
      prodServerExited = spawned.exited
    }

    // wait for both servers to be ready
    await Promise.all([
      shouldStartProdServer
        ? waitForServer(`http://localhost:${prodPort}`, {
            getServerOutput: prodServerGetOutput,
            serverExited: prodServerExited,
          })
        : null,
      shouldStartDevServer
        ? waitForServer(`http://localhost:${devPort}`, {
            getServerOutput: devServerGetOutput,
            serverExited: devServerExited,
          })
        : null,
    ])

    console.info('Servers are running.\n')

    return {
      testProdPort: prodPort,
      testDevPort: devPort,
      devServerPid: devServer?.pid,
      prodServerPid: prodServer?.pid,
      buildPid: null,
      testDir: process.cwd(),
    }
  } catch (error) {
    devServer?.kill()
    prodServer?.kill()
    console.error('Setup error:', error)
    throw error
  }
}
