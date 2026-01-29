import * as vscode from 'vscode'
import WebSocket from 'ws'

let ws: WebSocket | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let enabled = true
let statusBarItem: vscode.StatusBarItem

// track last sent position to avoid spam
let lastSent = { file: '', line: 0, column: 0 }

function getConfig() {
  const config = vscode.workspace.getConfiguration('one.liveHighlight')
  return {
    enabled: config.get<boolean>('enabled', true),
    port: config.get<number>('port', 8081),
  }
}

function connect() {
  if (ws) return

  const { port } = getConfig()
  const url = `ws://localhost:${port}/__one/cursor`

  try {
    ws = new WebSocket(url)

    ws.on('open', () => {
      updateStatusBar(true)
      if (reconnectTimer) {
        clearInterval(reconnectTimer)
        reconnectTimer = null
      }
    })

    ws.on('close', () => {
      ws = null
      updateStatusBar(false)
      scheduleReconnect()
    })

    ws.on('error', () => {
      ws = null
      updateStatusBar(false)
      scheduleReconnect()
    })
  } catch {
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setInterval(() => {
    if (!ws && enabled) {
      connect()
    }
  }, 3000)
}

function disconnect() {
  if (reconnectTimer) {
    clearInterval(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
  updateStatusBar(false)
}

function updateStatusBar(connected: boolean) {
  if (!enabled) {
    statusBarItem.text = '$(circle-slash) One'
    statusBarItem.tooltip = 'One: Live highlighting disabled'
    statusBarItem.backgroundColor = undefined
  } else if (connected) {
    statusBarItem.text = '$(pulse) One'
    statusBarItem.tooltip = 'One: Live highlighting active'
    statusBarItem.backgroundColor = undefined
  } else {
    statusBarItem.text = '$(debug-disconnect) One'
    statusBarItem.tooltip = 'One: Connecting to dev server...'
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground')
  }
}

function isJsxFile(document: vscode.TextDocument): boolean {
  const lang = document.languageId
  return lang === 'typescriptreact' || lang === 'javascriptreact'
}

function isOnJsxElement(document: vscode.TextDocument, position: vscode.Position): boolean {
  // simple heuristic: check if we're inside or near a JSX tag
  const line = document.lineAt(position.line).text
  const before = line.substring(0, position.character)
  const after = line.substring(position.character)

  // check for JSX patterns
  // inside opening tag: <Foo ... | ...>
  // inside self-closing: <Foo ... | ... />
  // on tag name: <|Foo or <Foo|

  // find last < before cursor
  const lastOpen = before.lastIndexOf('<')
  if (lastOpen === -1) return false

  // check if there's a > between < and cursor (meaning tag is closed)
  const betweenOpenAndCursor = before.substring(lastOpen)
  if (betweenOpenAndCursor.includes('>')) {
    // might be inside content, check for closing tag
    return false
  }

  // we're likely inside a tag
  return true
}

function getJsxContext(
  document: vscode.TextDocument,
  position: vscode.Position
): { file: string; line: number; column: number } | null {
  if (!isJsxFile(document)) return null

  // get workspace-relative path
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  if (!workspaceFolder) return null

  const relativePath = document.uri.fsPath.replace(workspaceFolder.uri.fsPath, '')

  // if cursor is on a JSX element, find the opening tag's position
  // for now, just send current position - the browser will find the nearest element
  return {
    file: relativePath,
    line: position.line + 1, // vscode is 0-indexed, we use 1-indexed
    column: position.character + 1,
  }
}

function sendCursorPosition(editor: vscode.TextEditor | undefined) {
  if (!editor || !ws || ws.readyState !== WebSocket.OPEN) return
  if (!enabled) return

  const context = getJsxContext(editor.document, editor.selection.active)

  if (!context) {
    // not in JSX, send clear signal
    if (lastSent.file !== '') {
      ws.send(JSON.stringify({ type: 'cursor-clear' }))
      lastSent = { file: '', line: 0, column: 0 }
    }
    return
  }

  // avoid sending duplicate positions
  if (
    context.file === lastSent.file &&
    context.line === lastSent.line &&
    context.column === lastSent.column
  ) {
    return
  }

  lastSent = context
  ws.send(
    JSON.stringify({
      type: 'cursor-position',
      ...context,
    })
  )
}

export function activate(context: vscode.ExtensionContext) {
  // create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBarItem.command = 'one.toggleLiveHighlight'
  statusBarItem.show()
  context.subscriptions.push(statusBarItem)

  // load initial config
  enabled = getConfig().enabled
  updateStatusBar(false)

  // connect to dev server
  if (enabled) {
    connect()
  }

  // toggle command
  context.subscriptions.push(
    vscode.commands.registerCommand('one.toggleLiveHighlight', () => {
      enabled = !enabled
      if (enabled) {
        connect()
      } else {
        disconnect()
        // send clear to browser
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'cursor-clear' }))
        }
      }
      updateStatusBar(ws?.readyState === WebSocket.OPEN)
    })
  )

  // listen to cursor changes
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      sendCursorPosition(e.textEditor)
    })
  )

  // listen to active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      sendCursorPosition(editor)
    })
  )

  // listen to config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('one.liveHighlight')) {
        const config = getConfig()
        enabled = config.enabled
        if (enabled) {
          disconnect() // reconnect with new port
          connect()
        } else {
          disconnect()
        }
      }
    })
  )

  // send initial position
  sendCursorPosition(vscode.window.activeTextEditor)
}

export function deactivate() {
  disconnect()
}
