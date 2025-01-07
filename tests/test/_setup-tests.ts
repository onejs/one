import { execPromise } from '@vxrn/utils'
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import net from 'node:net'
import { afterAll, beforeAll } from 'vitest'

let devServer: ChildProcessWithoutNullStreams | null = null
let prodServer: ChildProcessWithoutNullStreams | null = null
let devServerPort = 3111
let prodServerPort = 3112

beforeAll(async () => {
  await failIfPortInUse(devServerPort)
  await failIfPortInUse(prodServerPort)

  // run production build:
  const buildStartedAt = performance.now()
  if (!process.env.SKIP_BUILD) {
    console.info(`Building web`)
    await execPromise(`yarn build:web`)
  }
  console.info(`Build finished after ${Math.round(performance.now() - buildStartedAt)}ms`)

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

  await setupServerAndWaitUntilReady(devServer, devServerPort)
  await setupServerAndWaitUntilReady(prodServer, prodServerPort)
}, 120000)

/**
 * Setup logging, etc. for the server process and wait until it's ready.
 */
async function setupServerAndWaitUntilReady(
  server: ChildProcessWithoutNullStreams,
  port: number,
  { timeout = 30000 }: { timeout?: number } = {}
) {
  // Collect server output
  let serverOutput = ''
  server.stdout?.on('data', (data) => {
    serverOutput += data.toString()
  })
  server.stderr?.on('data', (data) => {
    serverOutput += data.toString()
  })

  // Wait for server to be ready
  const retryInterval = 1000
  try {
    await waitForServer(`http://localhost:${port}`, {
      getServerOutput: () => serverOutput,
      maxRetries: timeout / retryInterval,
    })
    console.info(`Server is ready on ${port}`)
  } catch (error) {
    console.error(`Failed to start server on ${port}:`, error)
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
    console.info('Prod server stopped')
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

const failIfPortInUse = async (port: number) => {
  let isInUse = false
  try {
    if ((await isPortInUse(port)) || (await checkAgainIsPortInUse(port))) {
      isInUse = true
    }
  } catch (e) {
    console.error(`Failed to check if port ${port} is in use:`, e)
    throw e
  }

  if (isInUse) {
    throw new Error(
      `Port ${port} is already in use, please check if other processes are listening on this port (lsof -i:${port}) and stop them, as they might interfere with the tests`
    )
  }
}

const isPortInUse = (port) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', (err) => {
      if (err instanceof Error && (err as any).code === 'EADDRINUSE') {
        resolve(true) // Port is in use
      } else {
        reject(err) // Some other error
      }
    })

    server.once('listening', () => {
      server.close()
      resolve(false) // Port is not in use
    })

    server.listen(port)
  })
}

/**
 * `isPortInUse` is not safe since if a port can be bound to a server, it's still possible that a server is already running and accepting connections on that port.
 */
const checkAgainIsPortInUse = (port) => {
  return new Promise((resolve) => {
    const client = new net.Socket()

    client.setTimeout(1000)

    client.once('error', (err) => {
      if (err instanceof Error && (err as any).code === 'ECONNREFUSED') {
        // Port is not in use
        resolve(false)
      } else {
        // Port is in use or another error occurred
        resolve(true)
      }
    })

    client.once('connect', () => {
      // Port is in use
      client.destroy() // Close the connection
      resolve(true)
    })

    client.once('timeout', () => {
      // Port is in use but unresponsive
      client.destroy()
      resolve(true)
    })

    client.connect(port, '127.0.0.1') // Try to connect to localhost
  })
}
