// minimal terminal UI for daemon - no deps, just ANSI
import type { DaemonState, ServerRegistration } from './types'
import {
  getAllServers,
  setRoute,
  getLastActiveServer,
  clearRoute,
  getRoute,
} from './registry'
import { getBootedSimulators } from './picker'
import { setRouteMode } from './server'
import colors from 'picocolors'

interface Simulator {
  name: string
  udid: string
  iosVersion?: string
}

type RouteMode = 'most-recent' | 'ask'

interface Point {
  x: number
  y: number
}

// cable is purely visual - derived from route state
interface Cable {
  serverIndex: number | null // null = disconnected/dragging
  controlPoint: Point
  velocity: Point
}

interface TUIState {
  simulators: Simulator[]
  servers: ServerRegistration[]
  // the active route's server index (derived from daemon state)
  connectedServerIndex: number | null
  // visual cable state for animation
  cable: Cable
  // dragging state
  isDragging: boolean
  // remember mode before dragging to restore after
  modeBeforeDrag: RouteMode | null
  selectedCol: 0 | 1
  selectedRow: number
  routeMode: RouteMode
  lastRender: string
  width: number
  height: number
  simEndX: number
  serverStartX: number
  rowStartY: number
  popup: { message: string; timeout: NodeJS.Timeout } | null
}

const ESC = '\x1b'
const CSI = `${ESC}[`

const ansi = {
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  clearScreen: `${CSI}2J`,
  home: `${CSI}H`,
}

let tuiState: TUIState | null = null
let daemonState: DaemonState | null = null
let refreshInterval: NodeJS.Timeout | null = null
let physicsInterval: NodeJS.Timeout | null = null
let stdinListener: ((key: Buffer) => void) | null = null
let resizeListener: (() => void) | null = null

export function getRouteMode(): RouteMode {
  return tuiState?.routeMode || 'ask'
}

function calcLayout(width: number) {
  const simEndX = Math.floor(width * 0.25) // narrower sim column for more cable room
  const serverStartX = Math.floor(width * 0.65)
  return { simEndX, serverStartX }
}

function showPopup(message: string, durationMs = 2000): void {
  if (!tuiState) return
  if (tuiState.popup) {
    clearTimeout(tuiState.popup.timeout)
  }
  const timeout = setTimeout(() => {
    if (tuiState) {
      tuiState.popup = null
      render()
    }
  }, durationMs)
  tuiState.popup = { message, timeout }
  render()
}

export function startTUI(state: DaemonState): void {
  daemonState = state

  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24
  const { simEndX, serverStartX } = calcLayout(width)

  tuiState = {
    simulators: [],
    servers: [],
    connectedServerIndex: null,
    cable: {
      serverIndex: null,
      controlPoint: { x: simEndX + 5, y: 7 },
      velocity: { x: 0, y: 0 },
    },
    isDragging: false,
    modeBeforeDrag: null,
    selectedCol: 0,
    selectedRow: 0,
    routeMode: 'most-recent',
    lastRender: '',
    width,
    height,
    simEndX,
    serverStartX,
    rowStartY: 5,
    popup: null,
  }

  process.stdout.write(ansi.clearScreen + ansi.home + ansi.hideCursor)

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()

  let resizePending = false
  resizeListener = () => {
    if (!tuiState) return
    tuiState.width = process.stdout.columns || 80
    tuiState.height = process.stdout.rows || 24
    const layout = calcLayout(tuiState.width)
    tuiState.simEndX = layout.simEndX
    tuiState.serverStartX = layout.serverStartX
    tuiState.lastRender = ''

    if (!resizePending) {
      resizePending = true
      setImmediate(() => {
        resizePending = false
        process.stdout.write(ansi.clearScreen + ansi.home)
        render()
      })
    }
  }
  process.stdout.on('resize', resizeListener)

  stdinListener = (key: Buffer) => {
    const str = key.toString()

    if (str === '\u0003' || str === 'q') {
      stopTUI()
      process.exit(0)
    }

    if (!tuiState || !daemonState) return

    if (str === '\u001b[A') {
      // up
      tuiState.selectedRow = Math.max(0, tuiState.selectedRow - 1)
    } else if (str === '\u001b[B') {
      // down
      const max =
        tuiState.selectedCol === 0
          ? Math.max(0, tuiState.simulators.length - 1)
          : Math.max(0, tuiState.servers.length - 1)
      tuiState.selectedRow = Math.min(max, tuiState.selectedRow + 1)
    } else if (str === '\u001b[C') {
      // right
      if (tuiState.selectedCol === 0) {
        tuiState.selectedCol = 1
        tuiState.selectedRow = Math.min(
          tuiState.selectedRow,
          Math.max(0, tuiState.servers.length - 1)
        )
      }
    } else if (str === '\u001b[D') {
      // left
      if (tuiState.selectedCol === 1) {
        tuiState.selectedCol = 0
        tuiState.selectedRow = Math.min(
          tuiState.selectedRow,
          Math.max(0, tuiState.simulators.length - 1)
        )
      }
    } else if (str === ' ' || str === '\r') {
      handleAction()
    } else if (str === 'd') {
      handleDisconnect()
    } else if (str === 'm') {
      tuiState.routeMode = tuiState.routeMode === 'most-recent' ? 'ask' : 'most-recent'
      setRouteMode(tuiState.routeMode)
    } else if (str === 'b') {
      stopTUI()
      console.log(colors.dim('\nDaemon running in background.'))
      return
    }

    render()
  }

  process.stdin.on('data', stdinListener)

  physicsInterval = setInterval(updatePhysics, 50)
  refreshInterval = setInterval(refreshData, 1000)
  refreshData()
}

function handleAction(): void {
  if (!tuiState || !daemonState) return

  if (tuiState.isDragging) {
    // connecting cable to a server
    if (tuiState.selectedCol === 1 && tuiState.servers.length > 0) {
      const serverIndex = tuiState.selectedRow
      const server = tuiState.servers[serverIndex]
      if (server) {
        // commit the route to daemon
        setRoute(daemonState, 'default', server.id)
        tuiState.connectedServerIndex = serverIndex
        tuiState.cable.serverIndex = serverIndex
        tuiState.isDragging = false

        // restore mode if was auto before
        if (tuiState.modeBeforeDrag === 'most-recent') {
          tuiState.routeMode = 'most-recent'
          setRouteMode('most-recent')
        }
        tuiState.modeBeforeDrag = null
      }
    }
    return
  }

  // start dragging - pick up cable
  if (tuiState.selectedCol === 0 && tuiState.simulators.length > 0) {
    // remember mode and switch to manual while editing
    tuiState.modeBeforeDrag = tuiState.routeMode
    if (tuiState.routeMode === 'most-recent') {
      tuiState.routeMode = 'ask'
      setRouteMode('ask')
    }

    // clear the route
    clearRoute(daemonState, 'default')
    tuiState.connectedServerIndex = null
    tuiState.cable.serverIndex = null
    tuiState.cable.velocity = { x: 3, y: -2 }
    tuiState.isDragging = true
  } else if (tuiState.selectedCol === 1 && tuiState.servers.length > 0) {
    // remember mode and switch to manual while editing
    tuiState.modeBeforeDrag = tuiState.routeMode
    if (tuiState.routeMode === 'most-recent') {
      tuiState.routeMode = 'ask'
      setRouteMode('ask')
    }

    clearRoute(daemonState, 'default')
    tuiState.connectedServerIndex = null
    tuiState.cable.serverIndex = null
    tuiState.cable.velocity = { x: -3, y: 2 }
    tuiState.isDragging = true
  }
}

function handleDisconnect(): void {
  if (!tuiState || !daemonState) return
  if (tuiState.connectedServerIndex === null) return

  // switch to manual mode
  if (tuiState.routeMode === 'most-recent') {
    tuiState.routeMode = 'ask'
    setRouteMode('ask')
    showPopup('Switched to manual mode', 1500)
  }

  clearRoute(daemonState, 'default')
  tuiState.connectedServerIndex = null
  tuiState.cable.serverIndex = null
  tuiState.cable.velocity = { x: -4, y: 3 }
}

function updatePhysics(): void {
  if (!tuiState) return

  const cable = tuiState.cable
  const gravity = 0.3
  const damping = 0.85
  const simY = tuiState.rowStartY // always connected to first sim visually

  let needsRender = false

  if (cable.serverIndex !== null) {
    // connected - settle into catenary with more slack
    const serverY = tuiState.rowStartY + cable.serverIndex
    const targetX = (tuiState.simEndX + tuiState.serverStartX) / 2
    const targetY = (simY + serverY) / 2 + 7 // more sag

    const dx = targetX - cable.controlPoint.x
    const dy = targetY - cable.controlPoint.y

    cable.velocity.x += dx * 0.15
    cable.velocity.y += dy * 0.15
    cable.velocity.x *= damping
    cable.velocity.y *= damping

    cable.controlPoint.x += cable.velocity.x
    cable.controlPoint.y += cable.velocity.y

    if (Math.abs(cable.velocity.x) > 0.05 || Math.abs(cable.velocity.y) > 0.05) {
      needsRender = true
    }
  } else {
    // disconnected - swing with gravity
    cable.velocity.y += gravity
    cable.velocity.x *= damping
    cable.velocity.y *= damping

    cable.controlPoint.x += cable.velocity.x
    cable.controlPoint.y += cable.velocity.y

    // constrain
    const anchorX = tuiState.simEndX
    const anchorY = simY
    if (cable.controlPoint.x < anchorX) {
      cable.controlPoint.x = anchorX
      cable.velocity.x = Math.abs(cable.velocity.x) * 0.5
    }
    if (cable.controlPoint.x > tuiState.serverStartX) {
      cable.controlPoint.x = tuiState.serverStartX
      cable.velocity.x = -Math.abs(cable.velocity.x) * 0.5
    }
    if (cable.controlPoint.y < anchorY) {
      cable.controlPoint.y = anchorY
      cable.velocity.y = Math.abs(cable.velocity.y) * 0.3
    }
    if (cable.controlPoint.y > tuiState.height - 5) {
      cable.controlPoint.y = tuiState.height - 5
      cable.velocity.y = -Math.abs(cable.velocity.y) * 0.5
    }

    needsRender = true
  }

  if (needsRender) render()
}

async function refreshData(): Promise<void> {
  if (!tuiState || !daemonState) return

  const newSims = await getBootedSimulators()
  const newServers = getAllServers(daemonState)

  tuiState.simulators = newSims
  tuiState.servers = newServers

  // get the actual route from daemon - this is the source of truth
  const route = getRoute(daemonState, 'default')
  let routedServerIndex: number | null = null
  if (route) {
    routedServerIndex = newServers.findIndex((s) => s.id === route.serverId)
    if (routedServerIndex === -1) routedServerIndex = null
  }

  // in auto mode with no route, auto-connect to most recent
  if (
    tuiState.routeMode === 'most-recent' &&
    routedServerIndex === null &&
    newServers.length > 0 &&
    newSims.length > 0 &&
    !tuiState.isDragging
  ) {
    const sortedServers = [...newServers].sort((a, b) => {
      const aTime = a.lastActiveAt || a.registeredAt
      const bTime = b.lastActiveAt || b.registeredAt
      return bTime - aTime
    })
    const mostRecent = sortedServers[0]
    const serverIndex = newServers.findIndex((s) => s.id === mostRecent.id)
    if (serverIndex !== -1) {
      setRoute(daemonState, 'default', mostRecent.id)
      routedServerIndex = serverIndex
    }
  }

  // sync visual state with daemon state (unless dragging)
  if (!tuiState.isDragging) {
    if (routedServerIndex !== tuiState.connectedServerIndex) {
      tuiState.connectedServerIndex = routedServerIndex
      tuiState.cable.serverIndex = routedServerIndex
      // give it a little bounce when route changes
      if (routedServerIndex !== null) {
        tuiState.cable.velocity = { x: 0, y: -2 }
      }
    }
  }

  // clamp selection
  if (tuiState.selectedCol === 0) {
    tuiState.selectedRow = Math.min(tuiState.selectedRow, Math.max(0, newSims.length - 1))
  } else {
    tuiState.selectedRow = Math.min(
      tuiState.selectedRow,
      Math.max(0, newServers.length - 1)
    )
  }

  render()
}

function render(): void {
  if (!tuiState) return

  const { width, height, simEndX, serverStartX } = tuiState
  const lines: string[] = []

  // header
  const title = ' one daemon '
  const headerPad = Math.max(0, width - title.length - 10)
  lines.push(colors.cyan(`┌─${title}${'─'.repeat(headerPad)}─:8081─┐`))

  // toggle switch row
  const isAuto = tuiState.routeMode === 'most-recent'
  const toggleLeft = isAuto ? colors.green('▶') : colors.dim('▷')
  const toggleRight = isAuto ? colors.dim('◁') : colors.yellow('◀')
  const autoLabel = isAuto ? colors.green('AUTO') : colors.dim('auto')
  const askLabel = isAuto ? colors.dim('ask') : colors.yellow('ASK')
  const toggle = `  ${autoLabel} ${toggleLeft}═══${toggleRight} ${askLabel}  [m] toggle`
  const togglePad = Math.max(0, width - stripAnsi(toggle).length - 2)
  lines.push(colors.cyan('│') + toggle + ' '.repeat(togglePad) + colors.cyan('│'))

  // column headers
  const simHeader = ' SIMULATORS'
  const srvHeader = 'SERVERS '
  const gap = ' '.repeat(Math.max(0, serverStartX - simEndX))
  lines.push(
    colors.cyan('│') +
      colors.bold(simHeader.padEnd(simEndX - 1)) +
      gap +
      colors.bold(srvHeader.padStart(width - serverStartX - 1)) +
      colors.cyan('│')
  )

  // separator
  lines.push(colors.cyan('│') + colors.dim('─'.repeat(width - 2)) + colors.cyan('│'))

  // content area
  const contentRows = height - 7
  for (let row = 0; row < contentRows; row++) {
    const y = tuiState.rowStartY + row
    let line = ''

    line += colors.cyan('│')

    // sim column - right aligned with dot on right
    const sim = tuiState.simulators[row]
    let simText = ''
    if (sim) {
      const isSelected = tuiState.selectedCol === 0 && tuiState.selectedRow === row
      const hasConnection = tuiState.connectedServerIndex !== null && row === 0
      const plug = hasConnection ? colors.green('●') : colors.dim('○')
      const name = truncate(sim.name, simEndX - 5)
      simText = `${name} ${plug}`
      if (isSelected) simText = colors.inverse(simText)
    }
    // right-align the sim text
    const simTextLen = stripAnsi(simText).length
    const simPad = Math.max(0, simEndX - 1 - simTextLen)
    line += ' '.repeat(simPad) + simText

    // cable zone
    let cableZone = ''
    for (let x = simEndX; x < serverStartX; x++) {
      const char = getCableCharAt(x, y)
      cableZone += char || ' '
    }
    line += cableZone

    // server column - dot and folder left, port right-aligned bold yellow
    const server = tuiState.servers[row]
    let srvLeft = ''
    let srvRight = ''
    if (server) {
      const isSelected = tuiState.selectedCol === 1 && tuiState.selectedRow === row
      const isConnected = tuiState.connectedServerIndex === row
      const lastActive = daemonState ? getLastActiveServer(daemonState) : null
      const isLastActive = lastActive?.id === server.id
      const plug = isConnected ? colors.green('●') : colors.dim('○')
      const star = isLastActive ? colors.yellow('★') : ' '
      const shortRoot = truncate(
        server.root.replace(process.env.HOME || '', '~'),
        width - serverStartX - 14
      )
      srvLeft = `${plug} ${star}${shortRoot}`
      srvRight = colors.bold(colors.yellow(`:${server.port}`))
      if (isSelected) {
        srvLeft = colors.inverse(srvLeft)
        srvRight = colors.inverse(srvRight)
      }
    }
    const srvLeftLen = stripAnsi(srvLeft).length
    const srvRightLen = stripAnsi(srvRight).length
    const srvColWidth = width - serverStartX - 2
    const srvGap = Math.max(1, srvColWidth - srvLeftLen - srvRightLen)
    line += srvLeft + ' '.repeat(srvGap) + srvRight

    line += colors.cyan('│')
    lines.push(line)
  }

  // popup or help
  if (tuiState.popup) {
    const msg = tuiState.popup.message
    const padLeft = Math.floor((width - msg.length - 4) / 2)
    const padRight = width - msg.length - padLeft - 4
    lines.push(
      colors.cyan('│') +
        ' '.repeat(Math.max(0, padLeft)) +
        colors.bgYellow(colors.black(` ${msg} `)) +
        ' '.repeat(Math.max(0, padRight)) +
        colors.cyan('│')
    )
  } else {
    lines.push(
      colors.cyan('│') +
        colors
          .dim(' ↑↓ select  ←→ move  space grab/plug  d disconnect  b bg  q quit')
          .padEnd(width - 2) +
        colors.cyan('│')
    )
  }

  // footer
  lines.push(colors.cyan(`└${'─'.repeat(width - 2)}┘`))

  const output = lines.join('\n')
  if (output !== tuiState.lastRender) {
    tuiState.lastRender = output
    process.stdout.write(ansi.home + output)
  }
}

function getCableCharAt(x: number, y: number): string | null {
  if (!tuiState) return null
  if (tuiState.simulators.length === 0) return null

  const cable = tuiState.cable
  const simY = tuiState.rowStartY // first sim
  const startX = tuiState.simEndX
  const startY = simY

  let endX: number, endY: number
  if (cable.serverIndex !== null) {
    endX = tuiState.serverStartX
    endY = tuiState.rowStartY + cable.serverIndex
  } else {
    endX = Math.round(cable.controlPoint.x)
    endY = Math.round(cable.controlPoint.y)
  }

  const ctrlX = Math.round(cable.controlPoint.x)
  const ctrlY = Math.round(cable.controlPoint.y)

  // sample bezier curve
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const invT = 1 - t

    const px = Math.round(invT * invT * startX + 2 * invT * t * ctrlX + t * t * endX)
    const py = Math.round(invT * invT * startY + 2 * invT * t * ctrlY + t * t * endY)

    if (px === x && py === y) {
      const connected = cable.serverIndex !== null
      const color = connected ? colors.green : colors.yellow

      // determine character based on curve direction
      const tPrev = Math.max(0, (i - 1) / steps)
      const tNext = Math.min(1, (i + 1) / steps)

      const prevX = Math.round(
        (1 - tPrev) * (1 - tPrev) * startX +
          2 * (1 - tPrev) * tPrev * ctrlX +
          tPrev * tPrev * endX
      )
      const prevY = Math.round(
        (1 - tPrev) * (1 - tPrev) * startY +
          2 * (1 - tPrev) * tPrev * ctrlY +
          tPrev * tPrev * endY
      )
      const nextX = Math.round(
        (1 - tNext) * (1 - tNext) * startX +
          2 * (1 - tNext) * tNext * ctrlX +
          tNext * tNext * endX
      )
      const nextY = Math.round(
        (1 - tNext) * (1 - tNext) * startY +
          2 * (1 - tNext) * tNext * ctrlY +
          tNext * tNext * endY
      )

      const dx = nextX - prevX
      const dy = nextY - prevY

      let char: string
      if (Math.abs(dx) > Math.abs(dy) * 2) {
        char = '─'
      } else if (Math.abs(dy) > Math.abs(dx) * 2) {
        char = '│'
      } else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) {
        char = '╲'
      } else {
        char = '╱'
      }

      return color(char)
    }
  }

  return null
}

function truncate(str: string, maxLen: number): string {
  if (maxLen <= 0) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

export function stopTUI(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (physicsInterval) {
    clearInterval(physicsInterval)
    physicsInterval = null
  }
  if (stdinListener) {
    process.stdin.removeListener('data', stdinListener)
    stdinListener = null
  }
  if (resizeListener) {
    process.stdout.removeListener('resize', resizeListener)
    resizeListener = null
  }
  process.stdout.write(ansi.clearScreen + ansi.home + ansi.showCursor)

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false)
  }
  tuiState = null
  daemonState = null
}

// for pulse animations (called from server.ts)
export function triggerPulse(
  _serverId: string,
  _direction: 'request' | 'response'
): void {
  // TODO: implement pulse animations
}
