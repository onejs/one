// interactive picker for ambiguous routes

import type { ServerRegistration } from './types'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as readline from 'node:readline'

const execAsync = promisify(exec)

interface PickerContext {
  bundleId: string
  servers: ServerRegistration[]
  onSelect: (server: ServerRegistration, remember: boolean) => void
  onCancel: () => void
}

let activePickerContext: PickerContext | null = null
let rl: readline.Interface | null = null
let stdinDataListener: ((key: Buffer) => void) | null = null

export async function getBootedSimulators(): Promise<
  { name: string; udid: string; state: string }[]
> {
  try {
    const { stdout } = await execAsync('xcrun simctl list devices booted -j')
    const data = JSON.parse(stdout)
    const simulators: { name: string; udid: string; state: string }[] = []

    for (const [_runtime, devices] of Object.entries(data.devices || {})) {
      for (const device of devices as any[]) {
        if (device.state === 'Booted') {
          simulators.push({
            name: device.name,
            udid: device.udid,
            state: device.state,
          })
        }
      }
    }
    return simulators
  } catch {
    return []
  }
}

export function showPicker(context: PickerContext): void {
  activePickerContext = context

  console.log('\n' + '─'.repeat(60))
  console.log(`🔀 Multiple servers for ${context.bundleId}`)
  console.log('─'.repeat(60))

  // show running simulators for context
  getBootedSimulators().then((sims) => {
    if (sims.length > 0) {
      console.log('\nRunning simulators:')
      for (const sim of sims) {
        console.log(`  • ${sim.name} (${sim.udid.slice(0, 8)}...)`)
      }
    }
  })

  console.log('\nSelect project:')
  context.servers.forEach((server, i) => {
    const shortRoot = server.root.replace(process.env.HOME || '', '~')
    console.log(`  [${i + 1}] ${shortRoot} (port ${server.port})`)
  })

  console.log('\nPress 1-' + context.servers.length + ' to select')
  console.log("Or 'r' + number to remember (e.g., 'r1')")
  console.log("Press 'c' to cancel\n")

  setupKeyboardInput()
}

function setupKeyboardInput(): void {
  if (rl) return

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()

  let buffer = ''

  stdinDataListener = (key: Buffer) => {
    const str = key.toString()

    // ctrl+c
    if (str === '\u0003') {
      cancelPicker()
      return
    }

    // escape
    if (str === '\u001b') {
      cancelPicker()
      return
    }

    // backspace
    if (str === '\u007f') {
      buffer = buffer.slice(0, -1)
      return
    }

    // enter
    if (str === '\r' || str === '\n') {
      processInput(buffer)
      buffer = ''
      return
    }

    buffer += str

    // check for immediate single key selection
    if (buffer.length === 1 && /^[1-9]$/.test(buffer)) {
      processInput(buffer)
      buffer = ''
    } else if (buffer.length === 2 && /^r[1-9]$/i.test(buffer)) {
      processInput(buffer)
      buffer = ''
    } else if (buffer.toLowerCase() === 'c') {
      cancelPicker()
      buffer = ''
    }
  }

  process.stdin.on('data', stdinDataListener)
}

function processInput(input: string): void {
  if (!activePickerContext) return

  const remember = input.toLowerCase().startsWith('r')
  const numStr = remember ? input.slice(1) : input
  const num = parseInt(numStr, 10)

  if (isNaN(num) || num < 1 || num > activePickerContext.servers.length) {
    console.log(`Invalid selection: ${input}`)
    return
  }

  const server = activePickerContext.servers[num - 1]
  const context = activePickerContext

  cleanupPicker()
  context.onSelect(server, remember)
}

function cancelPicker(): void {
  const context = activePickerContext
  cleanupPicker()
  if (context) {
    context.onCancel()
  }
}

function cleanupPicker(): void {
  activePickerContext = null
  if (stdinDataListener) {
    process.stdin.removeListener('data', stdinDataListener)
    stdinDataListener = null
  }
  if (rl) {
    rl.close()
    rl = null
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false)
  }
}

// for non-interactive mode (CI, Detox), we need a way to resolve without user input
let pendingPickerResolvers: Map<
  string,
  { resolve: (server: ServerRegistration) => void; reject: (err: Error) => void }
> = new Map()

export function resolvePendingPicker(bundleId: string, serverId: string): boolean {
  const resolver = pendingPickerResolvers.get(bundleId)
  if (!resolver || !activePickerContext) return false

  const server = activePickerContext.servers.find((s) => s.id === serverId)
  if (!server) return false

  pendingPickerResolvers.delete(bundleId)
  cleanupPicker()
  resolver.resolve(server)
  return true
}

export function pickServer(
  bundleId: string,
  servers: ServerRegistration[]
): Promise<{ server: ServerRegistration; remember: boolean }> {
  return new Promise((resolve, reject) => {
    // check if we have a pending resolver for this bundleId (for programmatic resolution)
    pendingPickerResolvers.set(bundleId, {
      resolve: (server) => resolve({ server, remember: false }),
      reject,
    })

    showPicker({
      bundleId,
      servers,
      onSelect: (server, remember) => {
        pendingPickerResolvers.delete(bundleId)
        resolve({ server, remember })
      },
      onCancel: () => {
        pendingPickerResolvers.delete(bundleId)
        reject(new Error('Selection cancelled'))
      },
    })
  })
}
