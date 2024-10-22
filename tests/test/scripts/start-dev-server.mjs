import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.join(__dirname, '..')

const PID_FILE = path.join(PROJECT_ROOT, 'dev-server.pid')
const LOG_FILE = path.join(PROJECT_ROOT, 'dev-server.log')

const SERVER_PORT = 8081

// Function to check if the server is running
function checkServer() {
  return new Promise((resolve, reject) => {
    const options = {
      host: 'localhost',
      port: SERVER_PORT,
    }
    const req = http.get(options, (res) => {
      resolve(res.statusCode === 200) // Server is up if status is 200
    })
    req.on('error', () => {
      reject(false) // Server is not up
    })
  })
}

// Function to wait for the server to be up
async function waitForServer(pid) {
  const maxRetries = 100
  const delay = 1000 // 1 second
  let retries = 0
  let isProcessExited = false

  while (retries < maxRetries) {
    try {
      const isUp = await checkServer()
      if (isUp) {
        console.info('Server is up!')
        return
      }
    } catch {
      // Ignore errors and retry
    }

    // If the child process has exited, stop waiting
    if (!isProcessRunning(pid)) {
      isProcessExited = true
      break
    }

    console.info(`Waiting for server... (${retries + 1}/${maxRetries})`)
    await new Promise((resolve) => setTimeout(resolve, delay))
    retries++
  }

  let lastFewLinesOfServerLog = null
  try {
    lastFewLinesOfServerLog = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-50).join('\n')
  } catch {}

  throw new Error(
    [
      isProcessExited
        ? 'Server process crashed or exited unexpectedly.'
        : 'Server did not start within the expected time.',
      lastFewLinesOfServerLog !== null
        ? `Last few lines of server log:\n--------\n${lastFewLinesOfServerLog}\n--------\n`
        : null,
    ]
      .filter(Boolean)
      .join('\n')
  )
}

// Function to kill any existing server using the PID from the file
function killExistingServer() {
  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, 'utf8')
    try {
      process.kill(pid, 'SIGTERM')
      console.info(`Killed existing server with PID: ${pid}`)
    } catch (error) {
      console.error(`Failed to kill process with PID: ${pid}`, error)
    }
    fs.unlinkSync(PID_FILE) // Remove the PID file
  }
}

// Function to start a new server
function startNewServer() {
  const out = fs.openSync(LOG_FILE, 'a' /* append mode */)
  const err = fs.openSync(LOG_FILE, 'a' /* append mode */)

  const child = spawn(
    // Not using `yarn dev` here since if we use `yarn dev` we will get a PID that is not the actual server's PID
    path.join(PROJECT_ROOT, 'node_modules', '.bin', 'one'),
    ['dev', '--port', SERVER_PORT],
    {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', out, err], // Redirect output to server.log
      detached: true, // Detaches the process from the parent
    }
  )
  fs.writeFileSync(PID_FILE, String(child.pid))
  console.info(`Started new server with PID: ${child.pid}`)
  child.unref() // Allows the parent process to exit independently of the child

  return child
}

function isProcessRunning(pid) {
  try {
    // Sending signal 0 does not kill the process, it's just a way to check if it exists
    process.kill(pid, 0)
    return true // Process exists
  } catch (error) {
    if (error.code === 'ESRCH') {
      return false // Process does not exist
    }

    if (error.code === 'EPERM') {
      // Permission error but process exists
      return true
    }

    throw error // Re-throw other errors
  }
}

async function main() {
  try {
    /** Only start or restart the server but do not wait for it to be up. */
    const noWait = process.argv.includes('--no-wait')
    /** Do not try to start or restart the server, only check and wait for the server to be up. */
    const checkOnly = process.argv.includes('--check-only')

    let serverProcessPid = null
    if (checkOnly) {
      try {
        serverProcessPid = fs.readFileSync(PID_FILE, 'utf8')
      } catch {}
    } else {
      // Kill any existing server
      killExistingServer()

      // Start a new server
      const serverProcess = startNewServer()

      serverProcessPid = serverProcess.pid
    }

    if (!noWait) {
      if (!serverProcessPid) {
        throw new Error(
          `Server process PID not found. Did the server start successfully? You might want to check if the PID file ${PID_FILE} exists.`
        )
      }
      // Wait for the server to be up
      await waitForServer(serverProcessPid)
    }

    console.info('Exiting script while keeping the server running in the background.')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
