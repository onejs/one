// minimal terminal UI for daemon - no deps, just ANSI
import type { DaemonState, ServerRegistration } from './types'
import { getAllServers, getRoute, setRoute, getLastActiveServer } from './registry'
import { getBootedSimulators } from './picker'
import { setRouteMode } from './server'
import colors from 'picocolors'

interface Simulator {
  name: string
  udid: string
  iosVersion?: string
}

type RouteMode = 'most-recent' | 'ask'

interface TUIState {
  simulators: Simulator[]
  servers: ServerRegistration[]
  routes: Map<string, string> // sim udid -> server id
  selectedCol: 0 | 1 // 0 = sims, 1 = servers
  selectedRow: number
  connectingFrom: string | null // sim udid when in connect mode
  routeMode: RouteMode
}

const ESC = '\x1b'
const CSI = `${ESC}[`

// ansi helpers
const cursor = {
  hide: () => process.stdout.write(`${CSI}?25l`),
  show: () => process.stdout.write(`${CSI}?25h`),
  to: (x: number, y: number) => process.stdout.write(`${CSI}${y};${x}H`),
  clear: () => process.stdout.write(`${CSI}2J`),
}

const box = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│',
  arrow: '►', dot: '●', circle: '○',
  line: '────────',
}

let tuiState: TUIState | null = null
let daemonState: DaemonState | null = null
let refreshInterval: NodeJS.Timeout | null = null
let stdinListener: ((key: Buffer) => void) | null = null

// export current route mode so server.ts can check it
export function getRouteMode(): RouteMode {
  return tuiState?.routeMode || 'ask'
}

export function startTUI(state: DaemonState): void {
  daemonState = state
  tuiState = {
    simulators: [],
    servers: [],
    routes: new Map(),
    selectedCol: 0,
    selectedRow: 0,
    connectingFrom: null,
    routeMode: 'most-recent',
  }

  // setup terminal
  cursor.hide()
  cursor.clear()

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()

  // keyboard handler
  stdinListener = (key: Buffer) => {
    const str = key.toString()

    // ctrl+c or q to quit
    if (str === '\u0003' || str === 'q') {
      stopTUI()
      process.exit(0)
    }

    if (!tuiState) return

    // navigation
    if (str === '\u001b[A') { // up
      tuiState.selectedRow = Math.max(0, tuiState.selectedRow - 1)
    } else if (str === '\u001b[B') { // down
      const max = tuiState.selectedCol === 0
        ? tuiState.simulators.length - 1
        : tuiState.servers.length - 1
      tuiState.selectedRow = Math.min(max, tuiState.selectedRow + 1)
    } else if (str === '\u001b[C' || str === '\u001b[D') { // left/right
      tuiState.selectedCol = tuiState.selectedCol === 0 ? 1 : 0
      tuiState.selectedRow = 0
      tuiState.connectingFrom = null
    } else if (str === ' ' || str === '\r') { // space or enter to connect
      handleConnect()
    } else if (str === 'd') { // disconnect
      handleDisconnect()
    } else if (str === 'm') { // toggle mode
      tuiState.routeMode = tuiState.routeMode === 'most-recent' ? 'ask' : 'most-recent'
      setRouteMode(tuiState.routeMode)
    } else if (str === 'b') { // background - close TUI but keep daemon running
      stopTUI()
      console.log(colors.dim('\nDaemon running in background. Use `one daemon status` to check.'))
      return
    } else if (str === 'i') { // install as login item
      installLoginItem()
    } else if (str === 'r') { // remember/persist route
      // TODO: persist to disk
    }

    render()
  }

  process.stdin.on('data', stdinListener)

  // refresh data every 500ms
  refreshInterval = setInterval(refreshData, 500)
  refreshData()
}

function handleConnect(): void {
  if (!tuiState || !daemonState) return

  if (tuiState.selectedCol === 0) {
    // on simulator side - start connecting
    const sim = tuiState.simulators[tuiState.selectedRow]
    if (sim) {
      tuiState.connectingFrom = sim.udid
      tuiState.selectedCol = 1
      tuiState.selectedRow = 0
    }
  } else if (tuiState.connectingFrom) {
    // on server side with active connection - complete it
    const server = tuiState.servers[tuiState.selectedRow]
    if (server) {
      tuiState.routes.set(tuiState.connectingFrom, server.id)
      // also set in daemon state by bundleId
      setRoute(daemonState, server.bundleId, server.id)
      tuiState.connectingFrom = null
    }
  }
}

function handleDisconnect(): void {
  if (!tuiState) return

  if (tuiState.selectedCol === 0) {
    const sim = tuiState.simulators[tuiState.selectedRow]
    if (sim) {
      tuiState.routes.delete(sim.udid)
    }
  }
}

async function refreshData(): Promise<void> {
  if (!tuiState || !daemonState) return

  tuiState.simulators = await getBootedSimulators()
  tuiState.servers = getAllServers(daemonState)

  render()
}

function render(): void {
  if (!tuiState) return

  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24

  cursor.to(1, 1)

  const lines: string[] = []

  // header with mode switch
  const title = ' one daemon '
  const port = ':8081'
  const modeRecent = tuiState.routeMode === 'most-recent'
  const modeSwitch = `  [m] ${modeRecent ? colors.green('●') : colors.dim('○')} recent  ${!modeRecent ? colors.green('●') : colors.dim('○')} ask  `
  const modeSwitchLen = 22 // approx length without ansi
  const headerPad = width - title.length - port.length - modeSwitchLen - 4
  lines.push(colors.cyan(`${box.tl}${box.h}${title}${box.h.repeat(Math.max(0, headerPad))}`) + modeSwitch + colors.cyan(`${port}${box.h}${box.tr}`))

  // empty line
  lines.push(colors.cyan(box.v) + ' '.repeat(width - 4) + colors.cyan(box.v))

  // column headers
  const col1 = '  SIMULATORS'
  const col2 = 'SERVERS'
  const mid = Math.floor(width / 2)
  lines.push(
    colors.cyan(box.v) +
    colors.bold(colors.dim(col1)) +
    ' '.repeat(mid - col1.length - 2) +
    colors.bold(colors.dim(col2)) +
    ' '.repeat(width - mid - col2.length - 4) +
    colors.cyan(box.v)
  )

  // separator
  lines.push(
    colors.cyan(box.v) +
    colors.dim('  ' + '─'.repeat(mid - 4)) +
    '  ' +
    colors.dim('─'.repeat(width - mid - 4)) +
    colors.cyan(box.v)
  )

  // content rows
  const maxRows = Math.max(tuiState.simulators.length, tuiState.servers.length, 3)

  for (let i = 0; i < maxRows; i++) {
    const sim = tuiState.simulators[i]
    const server = tuiState.servers[i]

    // sim column
    let simStr = ''
    if (sim) {
      const isSelected = tuiState.selectedCol === 0 && tuiState.selectedRow === i
      const isConnecting = tuiState.connectingFrom === sim.udid
      const hasRoute = tuiState.routes.has(sim.udid)

      const dot = hasRoute ? box.dot : box.circle
      const name = sim.name.slice(0, 16)
      const ver = sim.iosVersion ? ` (${sim.iosVersion})` : ''

      let text = `  ${dot} ${name}${ver}`
      if (isSelected) text = colors.inverse(text)
      if (isConnecting) text = colors.yellow(text)
      if (hasRoute) text = colors.green(text)

      simStr = text
    }

    // connection line
    let connStr = '    '
    const simUdid = sim?.udid
    const connectedServerId = simUdid ? tuiState.routes.get(simUdid) : null
    if (connectedServerId && server?.id === connectedServerId) {
      connStr = colors.green(` ${box.line}${box.arrow} `)
    } else if (tuiState.connectingFrom === simUdid) {
      connStr = colors.yellow(` ${box.line}${box.arrow} `)
    }

    // server column
    let serverStr = ''
    if (server) {
      const isSelected = tuiState.selectedCol === 1 && tuiState.selectedRow === i
      const hasConnection = [...tuiState.routes.values()].includes(server.id)
      const lastActive = daemonState ? getLastActiveServer(daemonState) : null
      const isLastActive = lastActive?.id === server.id

      const dot = hasConnection ? box.dot : box.circle
      const activeMarker = isLastActive ? colors.yellow('★') : ' '
      const shortRoot = server.root.replace(process.env.HOME || '', '~').slice(0, 16)
      const port = `:${server.port}`

      let text = `${dot}${activeMarker}${shortRoot.padEnd(16)} ${colors.dim(port)}`
      if (isSelected) text = colors.inverse(text)
      if (hasConnection) text = colors.green(text)

      serverStr = text
    }

    // assemble row
    const simWidth = mid - 6
    const padSim = Math.max(0, simWidth - stripAnsi(simStr).length)
    const serverWidth = width - mid - 6
    const padServer = Math.max(0, serverWidth - stripAnsi(serverStr).length)

    lines.push(
      colors.cyan(box.v) +
      simStr + ' '.repeat(padSim) +
      connStr +
      serverStr + ' '.repeat(padServer) +
      colors.cyan(box.v)
    )
  }

  // empty padding
  const contentHeight = 4 + maxRows
  const padRows = Math.max(0, height - contentHeight - 4)
  for (let i = 0; i < padRows; i++) {
    lines.push(colors.cyan(box.v) + ' '.repeat(width - 4) + colors.cyan(box.v))
  }

  // help lines
  lines.push(colors.cyan(box.v) + ' '.repeat(width - 4) + colors.cyan(box.v))
  const help1 = '  [↑↓] select  [←→] switch  [space] connect  [d] disconnect'
  const help2 = '  [m] mode  [b] background  [i] install  [q] quit'
  lines.push(
    colors.cyan(box.v) +
    colors.dim(help1) +
    ' '.repeat(Math.max(0, width - help1.length - 4)) +
    colors.cyan(box.v)
  )
  lines.push(
    colors.cyan(box.v) +
    colors.dim(help2) +
    ' '.repeat(Math.max(0, width - help2.length - 4)) +
    colors.cyan(box.v)
  )

  // footer
  lines.push(colors.cyan(`${box.bl}${box.h.repeat(width - 4)}${box.br}`))

  // output
  process.stdout.write(lines.join('\n'))
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

async function installLoginItem(): Promise<void> {
  if (process.platform !== 'darwin') {
    return
  }

  const { exec } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execAsync = promisify(exec)

  // find one binary path
  const onePath = process.argv[1] || 'npx one'

  // use osascript to add login item
  const script = `
    tell application "System Events"
      make login item at end with properties {path:"${onePath}", name:"one daemon", hidden:true}
    end tell
  `

  try {
    await execAsync(`osascript -e '${script}'`)
    console.log(colors.green('\n✓ Added to login items'))
  } catch (err) {
    // try launchd plist instead
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.one.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>${onePath}</string>
    <string>daemon</string>
    <string>--tui=false</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>`

    const fs = await import('node:fs')
    const path = await import('node:path')
    const os = await import('node:os')

    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.one.daemon.plist')
    fs.writeFileSync(plistPath, plist)

    await execAsync(`launchctl load ${plistPath}`)
    console.log(colors.green('\n✓ Installed as launchd agent'))
  }
}

export function stopTUI(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (stdinListener) {
    process.stdin.removeListener('data', stdinListener)
    stdinListener = null
  }
  cursor.show()
  cursor.clear()
  cursor.to(1, 1)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false)
  }
  tuiState = null
  daemonState = null
}
