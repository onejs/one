import { exec } from 'node:child_process'
import module from 'node:module'
import qrcode from 'qrcode-terminal'
import type { ViteDevServer } from 'vite'
import { filterViteServerResolvedUrls } from '../utils/filterViteServerResolvedUrls'

type Context = {
  server: ViteDevServer
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
      const url = ctx.server.resolvedUrls?.local[0]
      if (!url) {
        console.warn('Cannot get the local server URL.')
        return
      }
      nativeOpen(url)
    },
  },
  {
    keys: 'oi',
    label: 'open app in iOS Simulator',
    terminalLabel: '\x1b[1mo\x1b[0mpen app in \x1b[1mi\x1b[0mOS Simulator',
    action: (ctx) => {
      openIos(ctx)
    },
  },
  {
    keys: 'oa',
    label: 'open app in Android Emulator',
    terminalLabel: '\x1b[1mo\x1b[0mpen app in \x1b[1mA\x1b[0mndroid Emulator',
    action: (ctx) => {
      openAndroid(ctx)
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
      const url = getExpoGoUrl(ctx)
      if (!url) {
        return
      }

      printNativeQrCodeAndInstructions(url)
    },
  },

  // TODO this would need to be per-platform
  {
    keys: 'dt',
    label: 'open React Native DevTools',
    terminalLabel: 'open React Native \x1b[1mD\x1b[0mev\x1b[1mT\x1b[0mools',
    action: (ctx) => {
      const { host, port } = ctx.server.config.server
      const serverUrl = `http://${typeof host === 'string' && !!host ? host : 'localhost'}:${port}`
      const url = new URL('/open-debugger', serverUrl)

      // TODO: Seems to need these if multiple devices are connected, but haven't figured out how to pass these yet
      // Currently will just launch DevTools for most recently connected device
      // url.searchParams.set('appId', );
      // url.searchParams.set('device', );
      // url.searchParams.set('target', );

      // The `/open-debugger` endpoint may not respond, so we don't wait for it and will ignore timeout errors
      ;(async () => {
        const response = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(3000),
        }).catch((error) => {
          if (error.name === 'TimeoutError') {
            return null
          }

          throw error
        })

        if (!response) {
          // This is common for now, so don't log it
          // console.info(`No response received from the React Native DevTools.`)
        } else if (response.ok === false) {
          const responseText = await response.text()

          if (responseText.includes('Unable to find debugger target')) {
            // Will already print "No compatible apps connected. React Native DevTools can only be used with the Hermes engine.", so no need to warn again
            return
          }

          console.warn(
            `Failed to open React Native DevTools, ${url} returns ${response.status}: ${responseText}.`
          )
        }
      })()
    },
  },

  {
    keys: '?',
    label: 'open editor',
    terminalLabel: 'show this menu',
    action: async (ctx) => {},
  },
] satisfies Command[]

export async function startUserInterface(context: Context) {
  printCommandsTable(context)
  startInterceptingKeyStrokes(context)
}

function printCommandsTable(context: Context) {
  const longestKeyLength = COMMANDS.reduce(
    (max, command) => Math.max(max, command.keys.length),
    0
  )

  const commandsInfo = COMMANDS.map((cmd) =>
    getCommandInfoInTerminal(cmd, { longestKeyLength })
  ).join('\n')
  console.info(`\n${commandsInfo}\n`)
}

function getCommandInfoInTerminal(
  command: { keys: string; terminalLabel: string },
  { longestKeyLength = 0 }: { longestKeyLength?: number } = {}
) {
  return `\x1b[90m›\x1b[0m Press \x1b[1m${longestKeyLength ? command.keys.padEnd(longestKeyLength, ' ') : command.keys}\x1b[0m \x1b[90m│\x1b[0m ${command.terminalLabel}`
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
  // Allow Node.js to exit even if stdin is still listening
  stdin.unref()
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
  // Allow Node.js to exit even if timer is pending
  clearPressedKeysTimer.unref()
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
    console.info(
      `> ${pressedKeys}\nNo matching command for "${pressedKeys}"! Press "?" for help.`
    )
    pressedKeys = ''
    return
  }

  const possibleCommands = COMMANDS.filter((command) =>
    command.keys.startsWith(pressedKeys)
  )

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

async function printNativeQrCodeAndInstructions(url: string) {
  qrcode.generate(url, { small: true }, (code) => {
    console.info(
      `To open the app on your iPhone, install the Expo Go app and scan the QR code below with your iPhone camera:\n${code}`
    )
  })
}

function nativeOpen(url: string) {
  const start =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open'

  exec(`${start} ${url}`)
}

async function openIos(ctx: Context) {
  const projectRoot = ctx.server.config.root
  const port = ctx.server.config.server.port || 8081

  try {
    const require = module.createRequire(projectRoot)
    const applePlatformManagerModuleImportPath = require.resolve(
      '@expo/cli/build/src/start/platforms/ios/ApplePlatformManager.js',
      {
        paths: [projectRoot],
      }
    )
    const applePlatformManagerModule = await import(applePlatformManagerModuleImportPath)
    const PlatformManager = applePlatformManagerModule.default.ApplePlatformManager

    // TODO: Support dev client
    const platformManager = new PlatformManager(projectRoot, port, {
      /** Expo Go URL. */
      getExpoGoUrl: () => getExpoGoUrl(ctx),
      /** Get the base URL for the dev server hosting this platform manager. */
      getDevServerUrl: () => null,
      /** Get redirect URL for native disambiguation. */
      getRedirectUrl: () => null,
      /** Dev Client */
      getCustomRuntimeUrl: (props?: { scheme?: string }) => null,
    })
    await platformManager.openAsync({ runtime: 'expo' })
  } catch (e) {
    const stack = e instanceof Error ? e.stack : null
    console.error(`Failed to open app in iOS Simulator: ${e}${stack ? `\n${stack}` : ''}`)
  }
}

async function openAndroid(ctx: Context) {
  const projectRoot = ctx.server.config.root
  const port = ctx.server.config.server.port || 8081

  try {
    const require = module.createRequire(projectRoot)
    const androidPlatformManagerModuleImportPath = require.resolve(
      '@expo/cli/build/src/start/platforms/android/AndroidPlatformManager.js',
      {
        paths: [projectRoot],
      }
    )
    const androidPlatformManagerModule = await import(
      androidPlatformManagerModuleImportPath
    )
    const PlatformManager = androidPlatformManagerModule.default.AndroidPlatformManager

    // TODO: Support dev client
    const platformManager = new PlatformManager(projectRoot, port, {
      /** Expo Go URL. */
      getExpoGoUrl: () => getExpoGoUrl(ctx),
      /** Get the base URL for the dev server hosting this platform manager. */
      getDevServerUrl: () => null,
      /** Get redirect URL for native disambiguation. */
      getRedirectUrl: () => null,
      /** Dev Client */
      getCustomRuntimeUrl: (props?: { scheme?: string }) => null,
    })
    await platformManager.openAsync({ runtime: 'expo' })
  } catch (e) {
    const stack = e instanceof Error ? e.stack : null
    console.error(
      `Failed to open app in Android Emulator: ${e}${stack ? `\n${stack}` : ''}`
    )
  }
}

function getExpoGoUrl(ctx: Context) {
  const urls = filterViteServerResolvedUrls(ctx.server.resolvedUrls)?.network
  const url = urls?.[urls.length - 1]
  if (!url) {
    console.warn('Cannot get the local server URL.')
    return
  }

  return url.replace(/^https?/, 'exp')
}
