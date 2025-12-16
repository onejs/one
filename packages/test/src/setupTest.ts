import getPort from 'get-port'
import { exec, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { ONLY_TEST_DEV, ONLY_TEST_PROD } from './constants'

const execAsync = promisify(exec)

async function killProcessOnPort(port: number): Promise<void> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t`)
    const pids = stdout.trim().split('\n').filter(Boolean)

    if (pids.length > 0) {
      console.info(`Killing processes on port ${port}: ${pids.join(', ')}`)
      await Promise.all(pids.map(pid => execAsync(`kill -9 ${pid}`).catch(() => {})))
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error) {
    // No process found on port, which is fine
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

const waitForServer = (
  url: string,
  { maxRetries = 240, retryInterval = 1000, getServerOutput = () => '' }
): Promise<void> => {
  const startedAt = performance.now()
  return new Promise((resolve, reject) => {
    let retries = 0
    const checkServer = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) {
          console.info(
            `Server at ${url} is ready after ${Math.round(performance.now() - startedAt)}ms`
          )
          resolve()
        } else {
          throw new Error('Server not ready')
        }
      } catch (error) {
        if (retries >= maxRetries) {
          reject(
            new Error(
              `Server at ${url} did not start within the expected time (timeout after waiting for ${Math.round(performance.now() - startedAt)}ms).\nLogs:\n${getServerOutput()}`
            )
          )
        } else {
          retries++
          setTimeout(checkServer, retryInterval)
        }
      }
    }
    checkServer()
  })
}

export async function setupTestServers({ skipDev = false }: { skipDev? } = {}): Promise<TestInfo> {
  const runWithNonCliMode = !!process.env.TEST_NON_CLI_MODE
  console.info('Setting up tests 🛠️')

  let prodServer: ChildProcess | null = null
  let devServer: ChildProcess | null = null
  let buildProcess: ChildProcess | null = null // Add this line

  const shouldStartDevServer = !ONLY_TEST_PROD && !skipDev
  const shouldStartProdServer = !ONLY_TEST_DEV && !process.env.IS_NATIVE_TEST

  // Get available ports
  const prodPort = await getPort()
  const devPort =
    (process.env.DEV_PORT && Number.parseInt(process.env.DEV_PORT, 10)) || (await getPort())

  // Ensure ports are clear before starting servers
  await killProcessOnPort(prodPort)
  await killProcessOnPort(devPort)

  try {
    if (shouldStartProdServer && !process.env.SKIP_BUILD && !process.env.IS_NATIVE_TEST) {
      // Run prod build using spawn
      console.info('Starting a prod build.')
      const prodBuildStartedAt = performance.now()
      buildProcess = spawn('yarn', ['build:web'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
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

      // Wait for build process to complete
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

    // No need to kill the build process here, as it should have completed

    // Start dev server
    let devServerOutput = ''

    if (shouldStartDevServer) {
      console.info(`Starting a dev server on http://localhost:${devPort}`)
      if (runWithNonCliMode) {
        console.info('Running in non-CLI mode, using Vite directly.')
      }
      devServer = spawn(
        'node',
        runWithNonCliMode
          ? ['../../node_modules/.bin/vite', 'dev', '--host', '--port', devPort.toString()]
          : ['../../node_modules/.bin/one', 'dev', '--clean', '--port', devPort.toString()],
        {
          cwd: process.cwd(),
          env: {
            ...(Object.fromEntries(
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
            ) as typeof process.env),
          },
          // Note: removed detached: true to prevent orphan processes when parent is killed
          stdio: 'inherit',
        }
      )
    }

    // Start prod server
    let prodServerOutput = ''

    if (shouldStartProdServer) {
      console.info(`Starting a prod server on http://localhost:${prodPort}`)
      prodServer = spawn(
        'node',
        ['../../node_modules/.bin/one', 'serve', '--port', prodPort.toString()],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ONE_SERVER_URL: `http://localhost:${prodPort}`,
          },
          // Note: removed detached: true to prevent orphan processes when parent is killed
          stdio: 'inherit',
        }
      )
    }

    // Wait for both servers to be ready
    await Promise.all([
      shouldStartProdServer
        ? waitForServer(`http://localhost:${prodPort}`, {
            getServerOutput: () => 'Server output in terminal',
          })
        : null,
      shouldStartDevServer
        ? waitForServer(`http://localhost:${devPort}`, {
            getServerOutput: () => 'Server output in terminal',
          })
        : null,
    ])

    console.info('Servers are running.🎉 \n')

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
    // No need to kill buildProcess here as it should have completed or failed
    console.error('Setup error:', error)
    throw error
  }
}
