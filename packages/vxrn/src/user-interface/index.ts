import ip from 'ip'
import { exec } from 'node:child_process'
import qrcode from 'qrcode-terminal'

type Context = {
  server: {
    port: number
    host: string
  }
}

type Command = {
  keys: string
  label: string
  terminalLabel: string
  action: (ctx: Context) => void
}

const COMMANDS = [
  {
    keys: 'ow',
    label: 'open web',
    terminalLabel: '\x1b[1mo\x1b[0mpen \x1b[1mw\x1b[0meb',
    action: (ctx) => {
      const port = ctx.server.port
      let host = ctx.server.host
      if (host === '0.0.0.0') {
        host = '127.0.0.1'
      }
      nativeOpen(`http://${host}:${port}`)
    },
  },
  {
    keys: 'oe',
    label: 'open editor',
    terminalLabel: '\x1b[1mo\x1b[0mpen \x1b[1me\x1b[0mditor',
    action: async (ctx) => {
      const { defaultEditor } = await import('env-editor')
      exec(`${defaultEditor().binary} .`)
    },
  },
  {
    keys: 'qr',
    label: 'show Expo Go QR code',
    terminalLabel: 'show Expo Go \x1b[1mQR\x1b[0m code',
    action: (ctx) => {
      printNativeQrCodeAndInstructions(ctx)
    },
  },

  {
    keys: '?',
    label: 'open editor',
    terminalLabel: ' show this menu',
    action: async (ctx) => {},
  },
] satisfies Command[]

export async function startUserInterface(context: Context) {
  printCommandsTable(context)
  startInterceptingKeyStrokes(context)
}

function printCommandsTable(context: Context) {
  const commandsInfo = COMMANDS.map(getCommandInfoInTerminal).join('\n')
  console.info(`\n${commandsInfo}\n`)
}

function getCommandInfoInTerminal(command: { keys: string; terminalLabel: string }) {
  return `\x1b[90m›\x1b[0m Press \x1b[1m${command.keys}\x1b[0m \x1b[90m│\x1b[0m ${command.terminalLabel}`
}

function startInterceptingKeyStrokes(context: Context) {
  const { stdin } = process
  if (!stdin.setRawMode) {
    console.warn('Using a non-interactive terminal, keyboard commands are disabled.')
    return
  }
  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')
  stdin.on('data', handleKeypress.bind(null, context))
}

let pressedKeys = ''
let clearPressedKeysTimer: NodeJS.Timeout | null = null
function clearPressedKeys() {
  pressedKeys = ''
  clearPrintedInfo()
}
function resetClearPressedKeysTimer() {
  if (clearPressedKeysTimer) {
    clearTimeout(clearPressedKeysTimer)
  }
  clearPressedKeysTimer = setTimeout(clearPressedKeys, 3000)
}

function handleKeypress(context: Context, key: string) {
  if (key === '\u001b' /* ESC */) {
    clearPrintedInfo()
    pressedKeys = ''
    return
  }

  if (key === '?' || key === '/') {
    clearPrintedInfo()
    console.info('> ?\n⇒ Available commands:')
    printCommandsTable(context)
    return
  }

  resetClearPressedKeysTimer()

  if (key === '' /* DEL */) {
    pressedKeys = pressedKeys.slice(0, -1)
  } else {
    key = key.toLowerCase()
    if (/^[a-z]$/.test(key)) {
      pressedKeys += key
    }
  }

  if (pressedKeys.length === 0) {
    clearPrintedInfo()
    return
  }

  const matchedCommand = COMMANDS.find((command) => command.keys === pressedKeys)

  if (matchedCommand) {
    clearPrintedInfo()
    console.info(`> ${matchedCommand.keys}\n⇒ ${matchedCommand.label}...`)
    pressedKeys = ''
    setTimeout(() => matchedCommand.action?.(context), 500) // A small delay so that the user can see which command was matched
    return
  }

  if (pressedKeys.length >= 3) {
    clearPrintedInfo()
    console.info(`> ${pressedKeys}\nNo matching command for "${pressedKeys}"! Press "?" for help.`)
    pressedKeys = ''
    return
  }

  const possibleCommands = COMMANDS.filter((command) => command.keys.startsWith(pressedKeys))

  const commandsInfo = possibleCommands
    .map((command) => {
      const matchedPart = command.keys.slice(0, pressedKeys.length)
      const remainingPart = command.keys.slice(pressedKeys.length)
      return `  \x1b[4m${matchedPart}\x1b[0m\x1b[1m${remainingPart}\x1b[0m\x1b[90m - \x1b[0m${command.terminalLabel}`
    })
    .join('\n')
  const infoToPrint = `\n${commandsInfo}\n> ${pressedKeys}`
  printInfo(infoToPrint)
}

let lastPrintedInfo = ''
function printInfo(info: string) {
  clearPrintedInfo()
  lastPrintedInfo = info
  process.stdout.write(info)
}
function clearPrintedInfo() {
  if (lastPrintedInfo) {
    process.stdout.write('\x1b[2K') // Clear the current line
    // clear the n lines of the last printed info
    process.stdout.write('\x1b[1A\x1b[2K'.repeat(lastPrintedInfo.split('\n').length - 1))
    process.stdout.write('\x1b[2K') // Clear the current line
    process.stdout.write('\x1b[G') // Moves the cursor to the start of the line
  }

  lastPrintedInfo = ''
}

async function printNativeQrCodeAndInstructions(context: Context) {
  qrcode.generate(
    `exp://${ip.address() /* Get the actual IP address of the local network interface instead of getting the one the server is listening to */}:${context.server.port}`,
    { small: true },
    (code) => {
      console.info(
        `To open the app on your iPhone, install the Expo Go app and scan the QR code below with your iPhone camera:\n${code}`
      )
    }
  )
}

function nativeOpen(url: string) {
  const start =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'

  exec(`${start} ${url}`)
}
