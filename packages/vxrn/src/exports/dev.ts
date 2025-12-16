import { spawn } from 'node:child_process'
import FSExtra from 'fs-extra'
import colors from 'picocolors'
import { debounce } from 'perfect-debounce'
import type { ViteDevServer } from 'vite'
import type { VXRNOptions } from '../types'
import { cleanupKeypressInput } from '../utils/bindKeypressInput'
import { cleanupUserInterface } from '../user-interface/index'

const { ensureDir } = FSExtra

/**
 * Detect when parent process dies and force exit to prevent stuck orphan processes.
 * This prevents "zombie" dev servers that consume 100% CPU when their parent
 * (e.g., vitest) is killed.
 *
 * On Unix: Uses a bash watchdog for fast startup and reliable detection.
 * On Windows: Skipped (Windows handles orphan processes differently).
 */
function setupParentDeathDetection() {
  // Skip on Windows - orphan handling works differently there
  if (process.platform === 'win32') return

  const myPid = process.pid

  // Bash watchdog starts instantly and reliably detects orphaned processes.
  // It checks: 1) if target process died, 2) if any ancestor died,
  // 3) if reparented to init (PID 1)
  const watchdogScript = `
pid=${myPid}
a1=$(ps -p $pid -o ppid= 2>/dev/null | tr -d ' ')
a2=$(ps -p $a1 -o ppid= 2>/dev/null | tr -d ' ')
a3=$(ps -p $a2 -o ppid= 2>/dev/null | tr -d ' ')
a4=$(ps -p $a3 -o ppid= 2>/dev/null | tr -d ' ')
a5=$(ps -p $a4 -o ppid= 2>/dev/null | tr -d ' ')
while true; do
  sleep 0.2
  kill -0 $pid 2>/dev/null || exit 0
  p1=$(ps -p $pid -o ppid= 2>/dev/null | tr -d ' ')
  [ "$p1" = "1" ] && kill -9 $pid 2>/dev/null && exit
  p2=$(ps -p $p1 -o ppid= 2>/dev/null | tr -d ' ')
  [ "$p2" = "1" ] && kill -9 $pid 2>/dev/null && exit
  [ -n "$a1" ] && [ "$a1" != "1" ] && ! kill -0 $a1 2>/dev/null && kill -9 $pid 2>/dev/null && exit
  [ -n "$a2" ] && [ "$a2" != "1" ] && ! kill -0 $a2 2>/dev/null && kill -9 $pid 2>/dev/null && exit
  [ -n "$a3" ] && [ "$a3" != "1" ] && ! kill -0 $a3 2>/dev/null && kill -9 $pid 2>/dev/null && exit
  [ -n "$a4" ] && [ "$a4" != "1" ] && ! kill -0 $a4 2>/dev/null && kill -9 $pid 2>/dev/null && exit
  [ -n "$a5" ] && [ "$a5" != "1" ] && ! kill -0 $a5 2>/dev/null && kill -9 $pid 2>/dev/null && exit
done
`

  const watchdog = spawn('bash', ['-c', watchdogScript], {
    detached: true,
    stdio: 'ignore',
  })
  watchdog.unref()

  // In-process check as backup (works when event loop isn't saturated)
  const initialPpid = process.ppid
  const interval = setInterval(() => {
    if (process.ppid !== initialPpid) {
      process.exit(0)
    }
  }, 100)
  interval.unref()
}

export type DevOptions = VXRNOptions & {
  clean?: boolean
}

export const dev = async (optionsIn: DevOptions) => {
  // Detect if parent process dies and exit immediately to prevent orphan stuck processes
  setupParentDeathDetection()

  const devStartTime = Date.now()
  process.env.IS_VXRN_CLI = 'true'

  if (typeof optionsIn.debug === 'string') {
    process.env.DEBUG ||= !optionsIn.debug ? `vite` : `vite:${optionsIn.debug}`
  }

  // import vite only after setting process.env.DEBUG
  const { startUserInterface } = await import('../user-interface/index')
  const { bindKeypressInput } = await import('../utils/bindKeypressInput')
  const { fillOptions } = await import('../config/getOptionsFilled')
  const { getViteServerConfig } = await import('../config/getViteServerConfig')
  const { printServerUrls } = await import('../utils/printServerUrls')
  const { clean } = await import('./clean')
  const { filterViteServerResolvedUrls } = await import('../utils/filterViteServerResolvedUrls')
  const { removeUndefined } = await import('../utils/removeUndefined')
  const { createServer, loadConfigFromFile } = await import('vite')

  const { config } =
    (await loadConfigFromFile({
      mode: 'dev',
      command: 'serve',
    })) ?? {}

  if (!config) {
    console.error(`
⛔️ No vite.config.ts, please create a minimal config:

import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one()
  ]
})

`)
    process.exit(0)
  }

  // use one server config as defaults
  // this is a bit hacky for now passing it in like this
  const oneServerConfig = config?.plugins?.find(
    (x) => Array.isArray(x) && x[0]?.['name'] === 'one:config'
  )?.[0]?.['__get']?.server

  const options = await fillOptions({
    ...optionsIn,
    server: {
      ...(oneServerConfig || {}),
      ...removeUndefined(optionsIn.server || {}),
    },
  })

  const { cacheDir } = options

  bindKeypressInput()

  if (options.clean) {
    await clean(optionsIn, options.clean)
  }

  await ensureDir(cacheDir)

  const serverConfig = await getViteServerConfig(options, config)

  let viteServer: ViteDevServer | null = null

  return {
    viteServer,

    start: async () => {
      viteServer = await createServer(serverConfig)

      // This fakes vite into thinking its loading files for HMR
      // Debounced per-file to avoid CPU spikes during builds
      const pendingTransforms = new Map<string, ReturnType<typeof debounce>>()

      viteServer.watcher.addListener('change', async (path) => {
        // Skip dist files to avoid loops during builds
        if (path.includes('/dist/') || path.includes('\\dist\\')) {
          return
        }

        const id = path.replace(process.cwd(), '')
        if (!id.endsWith('tsx') && !id.endsWith('jsx')) {
          return
        }

        // Get or create a debounced transform for this file
        if (!pendingTransforms.has(id)) {
          pendingTransforms.set(
            id,
            debounce(async () => {
              try {
                await viteServer!.transformRequest(id)
              } catch (err) {
                console.info('err', err)
              }
            }, 100)
          )
        }

        pendingTransforms.get(id)!()
      })

      await viteServer.listen()

      const totalStartupTime = Date.now() - devStartTime

      console.info()
      console.info(colors.bold('Server running on') + ' ⪢')
      console.info()

      const viteServerResolvedUrls = filterViteServerResolvedUrls(viteServer.resolvedUrls)
      if (viteServerResolvedUrls) {
        printServerUrls(viteServerResolvedUrls, {}, viteServer.config.logger.info)
      }

      startUserInterface({ server: viteServer })

      return {
        closePromise: new Promise((res) => {
          viteServer?.httpServer?.on('close', res)
        }),
      }
    },

    stop: () => {
      // Cleanup stdin listeners to prevent process from hanging
      cleanupKeypressInput()
      cleanupUserInterface()

      if (viteServer) {
        viteServer.watcher.removeAllListeners()
        return viteServer.close()
      }
    },
  }
}
