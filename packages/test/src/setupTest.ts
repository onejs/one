import getPort from 'get-port'
import { exec, spawn, type ChildProcess } from 'node:child_process'
import { ONLY_TEST_DEV, ONLY_TEST_PROD } from './constants'

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
  { maxRetries = 30, retryInterval = 1000, getServerOutput = () => '' }
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
      devServer = spawn(
        'node',
        ['../../node_modules/.bin/one', 'dev', '--clean', '--port', devPort.toString()],
        {
          cwd: process.cwd(),
          env: { ...process.env },
          detached: true,
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
          detached: true,
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
