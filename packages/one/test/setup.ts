import { exec, spawn, type ChildProcess } from 'node:child_process'
import * as path from 'node:path'
import getPort from 'get-port'
import { promisify } from 'node:util'

export type TestInfo = {
  testDir: string
  testProdPort: number
  testDevPort: number
  devServerPid: number
  prodServerPid: number
  buildPid: number // Add this line
}

const execAsync = promisify(exec)

const waitForServer = (url: string, maxRetries = 600, retryInterval = 1000): Promise<void> => {
  const startedAt = performance.now()
  return new Promise((resolve, reject) => {
    let retries = 0
    const checkServer = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) {
          console.info(`Server at ${url} is ready after ${Math.round(performance.now() - startedAt)}ms`)
          resolve()
        } else {
          throw new Error('Server not ready')
        }
      } catch (error) {
        if (retries >= maxRetries) {
          reject(new Error(`Server at ${url} did not start within the expected time`))
        } else {
          retries++
          setTimeout(checkServer, retryInterval)
        }
      }
    }
    checkServer()
  })
}

export default async () => {
  const fixtureDir = path.join(__dirname, '../../../tests/test')
  console.info('Setting up tests 🛠️')
  console.info(`Using fixture directory: ${fixtureDir}`)

  let prodServer: ChildProcess | null = null
  let devServer: ChildProcess | null = null
  let buildProcess: ChildProcess | null = null // Add this line

  // Get available ports
  const prodPort = await getPort()
  const devPort = await getPort()

  try {
    // Run prod build using spawn
    console.info('Starting a prod build.')
    const prodBuildStartedAt = performance.now()
    buildProcess = spawn('yarn', ['build:web'], {
      cwd: fixtureDir,
      env: {
        ...process.env,
        ONE_SERVER_URL: `http://localhost:${prodPort}`,
      },
    })

    // Wait for build process to complete
    await new Promise<void>((resolve, reject) => {
      buildProcess!.on('exit', (code) => {
        if (code === 0) {
          console.info(`Prod build completed successfully after ${Math.round(performance.now() - prodBuildStartedAt)}ms`)
          resolve()
        } else {
          reject(new Error(`Build process exited with code ${code} after ${Math.round(performance.now() - prodBuildStartedAt)}ms`))
        }
      })
      buildProcess!.on('error', reject)
    })

    // No need to kill the build process here, as it should have completed

    // Start dev server
    console.info(`Starting a dev server on http://localhost:${devPort}`)
    devServer = exec(`yarn dev --port ${devPort}`, {
      cwd: fixtureDir,
      env: { ...process.env },
    })

    // Start prod server
    console.info(`Starting a prod server on http://localhost:${prodPort}`)
    prodServer = exec(`yarn serve --port ${prodPort}`, {
      cwd: fixtureDir,
      env: {
        ...process.env,
        ONE_SERVER_URL: `http://localhost:${prodPort}`,
      },
    })

    // Wait for both servers to be ready
    await Promise.all([
      waitForServer(`http://localhost:${devPort}`),
      waitForServer(`http://localhost:${prodPort}`),
    ])

    console.info('Both dev and prod servers are running.🎉 \n')

    // Attach information to globalThis
    const testInfo = {
      testDir: fixtureDir,
      testProdPort: prodPort,
      testDevPort: devPort,
      devServerPid: devServer?.pid,
      prodServerPid: prodServer?.pid,
      buildPid: null, // Set to null as the build process should have completed
    }

    return testInfo
  } catch (error) {
    devServer?.kill()
    prodServer?.kill()
    // No need to kill buildProcess here as it should have completed or failed
    console.error('Setup error:', error)
    throw error
  }
}
