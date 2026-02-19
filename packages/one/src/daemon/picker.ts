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
  { name: string; udid: string; state: string; iosVersion?: string }[]
> {
  try {
    const { stdout } = await execAsync('xcrun simctl list devices booted -j')
    const data = JSON.parse(stdout)
    const simulators: {
      name: string
      udid: string
      state: string
      iosVersion?: string
    }[] = []

    for (const [runtime, devices] of Object.entries(data.devices || {})) {
      // extract iOS version from runtime like "com.apple.CoreSimulator.SimRuntime.iOS-18-1"
      const versionMatch = runtime.match(/iOS-(\d+)-(\d+)/)
      const iosVersion = versionMatch
        ? `${versionMatch[1]}.${versionMatch[2]}`
        : undefined

      for (const device of devices as any[]) {
        if (device.state === 'Booted') {
          simulators.push({
            name: device.name,
            udid: device.udid,
            state: device.state,
            iosVersion,
          })
        }
      }
    }
    return simulators
  } catch {
    return []
  }
}

// show native macOS dialog using AppleScript
async function showMacOSDialog(
  bundleId: string,
  servers: ServerRegistration[]
): Promise<{ server: ServerRegistration; remember: boolean } | null> {
  if (process.platform !== 'darwin') {
    return null
  }

  // get running simulators for context
  const simulators = await getBootedSimulators()
  let simInfo = ''
  if (simulators.length > 0) {
    // dedupe by name+version, show unique simulators
    const seen = new Set<string>()
    const uniqueSims: string[] = []
    for (const sim of simulators) {
      const key = `${sim.name}-${sim.iosVersion || ''}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueSims.push(sim.iosVersion ? `${sim.name} (iOS ${sim.iosVersion})` : sim.name)
      }
    }
    if (uniqueSims.length === 1) {
      // single simulator - we know exactly which one is requesting
      simInfo = `\\n\\nFrom: ${uniqueSims[0]}`
    } else {
      // multiple simulators - show which might be requesting
      simInfo = `\\n\\nActive simulators: ${uniqueSims.slice(0, 3).join(', ')}${uniqueSims.length > 3 ? '...' : ''}`
    }
  }

  const choices = servers.map((s, i) => {
    const shortRoot = s.root.replace(process.env.HOME || '', '~')
    return `${i + 1}. ${shortRoot} (port ${s.port})`
  })

  // escape quotes for AppleScript
  const choicesStr = choices.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(', ')
  const prompt = `${bundleId} bundle requested${simInfo}\\n\\nWhich project should serve it?`

  const script = `choose from list {${choicesStr}} with title "one daemon" with prompt "${prompt}" default items {"${choices[0].replace(/"/g, '\\"')}"}`

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`)
    const result = stdout.trim()

    if (result === 'false' || !result) {
      return null // cancelled
    }

    // parse selection - format is "1. ~/path (port XXXX)"
    const match = result.match(/^(\d+)\./)
    if (match) {
      const index = parseInt(match[1], 10) - 1
      if (index >= 0 && index < servers.length) {
        return { server: servers[index], remember: false }
      }
    }

    return null
  } catch {
    return null
  }
}

export function showPicker(context: PickerContext): void {
  activePickerContext = context

  // try native macOS dialog first
  if (process.platform === 'darwin') {
    showMacOSDialog(context.bundleId, context.servers).then((result) => {
      if (result) {
        cleanupPicker()
        context.onSelect(result.server, result.remember)
      } else if (activePickerContext === context) {
        // dialog cancelled or failed, fall back to terminal picker
        showTerminalPicker(context)
      }
    })
    return
  }

  showTerminalPicker(context)
}

function showTerminalPicker(context: PickerContext): void {
  console.log('\n' + '─'.repeat(60))
  console.log(`🔀 ${context.bundleId} bundle requested`)
  console.log('─'.repeat(60))

  // show running simulators for context
  getBootedSimulators().then((sims) => {
    if (sims.length > 0) {
      // dedupe by name+version
      const seen = new Set<string>()
      const uniqueSims: { name: string; iosVersion?: string }[] = []
      for (const sim of sims) {
        const key = `${sim.name}-${sim.iosVersion || ''}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueSims.push(sim)
        }
      }
      if (uniqueSims.length === 1) {
        const sim = uniqueSims[0]
        console.log(
          `\nFrom: ${sim.name}${sim.iosVersion ? ` (iOS ${sim.iosVersion})` : ''}`
        )
      } else {
        console.log('\nActive simulators:')
        for (const sim of uniqueSims.slice(0, 5)) {
          console.log(
            `  • ${sim.name}${sim.iosVersion ? ` (iOS ${sim.iosVersion})` : ''}`
          )
        }
      }
    }
  })

  console.log('\nWhich project should serve it?')
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

  // ensure terminal is restored on signals
  const signalHandler = () => {
    cleanupPicker()
    process.exit(0)
  }
  process.on('SIGINT', signalHandler)
  process.on('SIGTERM', signalHandler)
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
