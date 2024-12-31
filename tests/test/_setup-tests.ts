import { execPromise } from '@vxrn/utils'
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { afterAll, beforeAll } from 'vitest'

let devServer: ChildProcessWithoutNullStreams | null = null
let prodServer: ChildProcessWithoutNullStreams | null = null
let devServerPort = 3111
let prodServerPort = 3112

beforeAll(async () => {
  // run production build:
  console.info(`Building web`)
  await execPromise(`yarn build:web`)

  // Start the dev server
  console.info(`Starting dev server on port ${devServerPort}...`)
  devServer = spawn('yarn', ['dev', '--port', devServerPort.toString()], {
    stdio: 'pipe',
    env: process.env,
  })

  // Start the prod server
  console.info(`Starting prod server on port ${prodServerPort}...`)
  prodServer = spawn('yarn', ['serve', '--port', prodServerPort.toString()], {
    stdio: 'pipe',
    env: process.env,
  })

  await startServerAndWaitToFinish(devServer, devServerPort)
  await startServerAndWaitToFinish(prodServer, prodServerPort)
})

async function startServerAndWaitToFinish(server: ChildProcessWithoutNullStreams, port: number) {
  // Collect server output
  let serverOutput = ''
  server.stdout?.on('data', (data) => {
    serverOutput += data.toString()
  })
  server.stderr?.on('data', (data) => {
    serverOutput += data.toString()
  })

  // Wait for server to be ready
  try {
    await waitForServer(`http://localhost:${port}`, {
      getServerOutput: () => serverOutput,
    })
    console.info('Dev server is ready')
  } catch (error) {
    console.error('Failed to start dev server:', error)
    throw error
  }
}

afterAll(() => {
  if (devServer) {
    devServer.kill()
    console.info('Dev server stopped')
  }
  if (prodServer) {
    prodServer.kill()
    console.info('Dev server stopped')
  }
})

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
