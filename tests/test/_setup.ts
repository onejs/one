import { beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { getPort } from 'get-port-please'

let devServer: any = null
let devServerPort: number

beforeAll(async () => {
  // Get a random available port
  devServerPort = await getPort()

  // Start the dev server
  console.info(`Starting dev server on port ${devServerPort}...`)
  devServer = spawn('yarn', ['dev', '--port', devServerPort.toString()], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: devServerPort.toString(),
    },
  })

  // Collect server output
  let serverOutput = ''
  devServer.stdout?.on('data', (data) => {
    serverOutput += data.toString()
  })
  devServer.stderr?.on('data', (data) => {
    serverOutput += data.toString()
  })

  // Wait for server to be ready
  try {
    await waitForServer(`http://localhost:${devServerPort}`, {
      getServerOutput: () => serverOutput,
    })
    console.info('Dev server is ready')
  } catch (error) {
    console.error('Failed to start dev server:', error)
    throw error
  }
})

afterAll(() => {
  if (devServer) {
    devServer.kill()
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
