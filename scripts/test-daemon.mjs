#!/usr/bin/env node
/**
 * Test script for the one daemon
 *
 * Tests:
 * 1. Daemon starts on specified port
 * 2. IPC socket communication works
 * 3. Server registration works
 * 4. HTTP proxy routing works
 * 5. Multiple servers with same bundleId handled correctly
 */

import * as http from 'node:http'
import * as net from 'node:net'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { spawn } from 'node:child_process'

const DAEMON_PORT = 8888
const SOCKET_PATH = path.join(os.homedir(), '.one', 'daemon.sock')

// colors
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const cyan = (s) => `\x1b[36m${s}\x1b[0m`

let testsPassed = 0
let testsFailed = 0

function log(msg) {
  console.log(`  ${msg}`)
}

function pass(name) {
  testsPassed++
  console.log(`${green('✓')} ${name}`)
}

function fail(name, error) {
  testsFailed++
  console.log(`${red('✗')} ${name}`)
  if (error) console.log(`    ${red(error)}`)
}

// helper to send IPC message
async function sendIPC(message) {
  return new Promise((resolve, reject) => {
    const client = net.connect(SOCKET_PATH)
    let buffer = ''

    const timeout = setTimeout(() => {
      client.destroy()
      reject(new Error('IPC timeout'))
    }, 5000)

    client.on('connect', () => {
      client.write(JSON.stringify(message) + '\n')
    })

    client.on('data', (data) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          clearTimeout(timeout)
          const response = JSON.parse(line)
          client.destroy()
          resolve(response)
          return
        } catch {
          // continue
        }
      }
    })

    client.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

// helper to make HTTP request
async function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve({ status: res.statusCode, data }))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('HTTP timeout'))
    })
  })
}

// create a simple test server that responds with its port
function createTestServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ port, url: req.url }))
    })
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function runTests() {
  console.log(cyan('\n═══════════════════════════════════════════════════'))
  console.log(cyan('  one daemon test suite'))
  console.log(cyan('═══════════════════════════════════════════════════\n'))

  let daemonProcess = null
  let testServer1 = null
  let testServer2 = null

  try {
    // clean up any existing socket
    if (fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH)
    }

    // start daemon
    console.log(yellow('Starting daemon on port ' + DAEMON_PORT + '...\n'))

    daemonProcess = spawn('npx', ['one', 'daemon', '--port', String(DAEMON_PORT)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(process.cwd(), 'examples', 'one-basic'),
    })

    daemonProcess.stdout.on('data', (data) => {
      // log(`[daemon] ${data.toString().trim()}`)
    })

    daemonProcess.stderr.on('data', (data) => {
      // log(`[daemon err] ${data.toString().trim()}`)
    })

    // wait for daemon to start
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test 1: IPC ping
    try {
      const response = await sendIPC({ type: 'ping' })
      if (response.type === 'pong') {
        pass('IPC ping/pong works')
      } else {
        fail('IPC ping/pong works', `Expected pong, got ${response.type}`)
      }
    } catch (err) {
      fail('IPC ping/pong works', err.message)
    }

    // Test 2: Register a server
    let server1Id = null
    try {
      const response = await sendIPC({
        type: 'register',
        port: 9001,
        bundleId: 'com.test.app',
        root: '/tmp/test-app-1',
      })
      if (response.type === 'registered' && response.id) {
        server1Id = response.id
        pass('Server registration works')
      } else {
        fail('Server registration works', `Expected registered, got ${response.type}`)
      }
    } catch (err) {
      fail('Server registration works', err.message)
    }

    // Test 3: Status shows registered server
    try {
      const response = await sendIPC({ type: 'status' })
      if (response.type === 'status' && response.servers.length === 1) {
        pass('Status shows registered server')
      } else {
        fail(
          'Status shows registered server',
          `Expected 1 server, got ${response.servers?.length}`
        )
      }
    } catch (err) {
      fail('Status shows registered server', err.message)
    }

    // Test 4: Register second server with same bundleId
    let server2Id = null
    try {
      const response = await sendIPC({
        type: 'register',
        port: 9002,
        bundleId: 'com.test.app',
        root: '/tmp/test-app-2',
      })
      if (response.type === 'registered' && response.id) {
        server2Id = response.id
        pass('Second server registration works')
      } else {
        fail(
          'Second server registration works',
          `Expected registered, got ${response.type}`
        )
      }
    } catch (err) {
      fail('Second server registration works', err.message)
    }

    // Test 5: Status shows both servers
    try {
      const response = await sendIPC({ type: 'status' })
      if (response.type === 'status' && response.servers.length === 2) {
        pass('Status shows both servers')
      } else {
        fail(
          'Status shows both servers',
          `Expected 2 servers, got ${response.servers?.length}`
        )
      }
    } catch (err) {
      fail('Status shows both servers', err.message)
    }

    // Test 6: Set route to specific server
    try {
      const response = await sendIPC({
        type: 'route',
        bundleId: 'com.test.app',
        serverId: server2Id,
      })
      if (response.type === 'routed') {
        pass('Route setting works')
      } else {
        fail('Route setting works', `Expected routed, got ${response.type}`)
      }
    } catch (err) {
      fail('Route setting works', err.message)
    }

    // Test 7: Start actual test servers and verify HTTP routing
    testServer1 = await createTestServer(9001)
    testServer2 = await createTestServer(9002)
    log('')
    log('Started test servers on 9001 and 9002')

    try {
      // request with ?app=com.test.app should route to server2 (port 9002) due to route setting
      const response = await httpGet(DAEMON_PORT, '/test?app=com.test.app')
      const data = JSON.parse(response.data)
      if (data.port === 9002) {
        pass('HTTP routing respects configured route')
      } else {
        fail(
          'HTTP routing respects configured route',
          `Expected port 9002, got ${data.port}`
        )
      }
    } catch (err) {
      fail('HTTP routing respects configured route', err.message)
    }

    // Test 8: Unregister server
    try {
      const response = await sendIPC({ type: 'unregister', id: server1Id })
      if (response.type === 'unregistered') {
        pass('Server unregistration works')
      } else {
        fail('Server unregistration works', `Expected unregistered, got ${response.type}`)
      }
    } catch (err) {
      fail('Server unregistration works', err.message)
    }

    // Test 9: Status shows only one server after unregister
    try {
      const response = await sendIPC({ type: 'status' })
      if (response.type === 'status' && response.servers.length === 1) {
        pass('Status correct after unregister')
      } else {
        fail(
          'Status correct after unregister',
          `Expected 1 server, got ${response.servers?.length}`
        )
      }
    } catch (err) {
      fail('Status correct after unregister', err.message)
    }

    // Test 10: Daemon management endpoint
    try {
      const response = await httpGet(DAEMON_PORT, '/__daemon/status')
      const data = JSON.parse(response.data)
      if (data.servers && Array.isArray(data.servers)) {
        pass('Daemon status endpoint works')
      } else {
        fail('Daemon status endpoint works', 'Invalid response format')
      }
    } catch (err) {
      fail('Daemon status endpoint works', err.message)
    }
  } finally {
    // cleanup
    log('')
    log(yellow('Cleaning up...'))

    if (testServer1) testServer1.close()
    if (testServer2) testServer2.close()

    if (daemonProcess) {
      daemonProcess.kill('SIGTERM')
      await new Promise((r) => setTimeout(r, 500))
    }

    // clean up socket
    if (fs.existsSync(SOCKET_PATH)) {
      try {
        fs.unlinkSync(SOCKET_PATH)
      } catch {}
    }
  }

  // summary
  console.log(cyan('\n═══════════════════════════════════════════════════'))
  console.log(
    `  Tests: ${green(testsPassed + ' passed')}, ${testsFailed > 0 ? red(testsFailed + ' failed') : testsFailed + ' failed'}`
  )
  console.log(cyan('═══════════════════════════════════════════════════\n'))

  process.exit(testsFailed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error(red('Test suite error:'), err)
  process.exit(1)
})
