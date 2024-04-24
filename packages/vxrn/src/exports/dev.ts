import reactSwcPlugin from '@vitejs/plugin-react-swc'
import wsAdapter from 'crossws/adapters/node'
import {
  createApp,
  createRouter,
  defineEventHandler,
  defineWebSocketHandler,
  eventHandler,
  getQuery,
  toNodeListener,
} from 'h3'
import { createProxyEventHandler } from 'h3-proxy'
import { readFile } from 'node:fs/promises'
import { createServer as nodeCreateServer } from 'node:http'
import { dirname, join, relative, resolve } from 'node:path'
import readline from 'node:readline'
import { WebSocket } from 'ws'

import * as babel from '@babel/core'
import { buildReact, buildReactJSX, buildReactNative } from '@vxrn/react-native-prebuilt'
import viteReactPlugin, { swcTransform, transformForBuild } from '@vxrn/vite-native-swc'
import { parse } from 'es-module-lexer'
import FSExtra from 'fs-extra'
import {
  build,
  createServer,
  mergeConfig,
  resolveConfig,
  transformWithEsbuild,
  type InlineConfig,
  type PluginOption,
  type UserConfig,
} from 'vite'

import createViteFlow from '@vxrn/vite-flow'
import type { Peer } from 'crossws'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import { clientBundleTreeShakePlugin } from '../plugins/clientBundleTreeShakePlugin'
import { clientInjectionsPlugin } from '../plugins/clientInjectPlugin'
import { reactNativeCommonJsPlugin } from '../plugins/reactNativeCommonJsPlugin'
import type { VXRNConfig } from '../types'
import { getBaseViteConfig } from '../utils/getBaseViteConfig'
import { getOptionsFilled, type VXRNConfigFilled } from '../utils/getOptionsFilled'
import { getVitePath } from '../utils/getVitePath'
import { checkPatches } from '../utils/patches'
import { createExpoServer } from '../vendor/createExpoServer'

// sorry for the mess, exploring before abstracting

let isBuildingNativeBundle: Promise<string> | null = null
const hotUpdateCache = new Map<string, string>()

const depsToOptimize = [
  '@react-native/normalize-color',
  // '@react-navigation/core',
  // '@react-navigation/native',
  '@vxrn/expo-router',
  'expo-modules-core',
  'expo-status-bar',
  // 'react',
  // 'react/jsx-dev-runtime',
  // 'react/jsx-runtime',
  // 'react-dom',
  // 'react-dom/server',
  // 'react-dom/client',
  // 'react-dom/server',
  // 'react-native-safe-area-context',
  'react-native-web',
  'react-native',
]

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch {
    return require.resolve(path)
  }
}

const nativeExtensions = [
  '.native.tsx',
  '.native.jsx',
  '.native.js',
  '.tsx',
  '.ts',
  '.js',
  '.css',
  '.json',
]

const extensions = [
  '.web.tsx',
  '.tsx',
  '.web.ts',
  '.ts',
  '.web.jsx',
  '.jsx',
  '.web.js',
  '.web.mjs',
  '.mjs',
  '.js',
  '.css',
  '.json',
]

const { ensureDir, pathExists, pathExistsSync } = FSExtra

export const dev = async (optionsIn: VXRNConfig) => {
  const options = await getOptionsFilled(optionsIn)
  const { host, port, root, cacheDir } = options

  // TODO move somewhere
  bindKeypressInput()

  checkPatches(options).catch((err) => {
    console.error(`\n 🥺 couldn't patch`, err)
  })

  await ensureDir(cacheDir)

  const serverConfig = await getViteServerConfig(options)
  const viteServer = await createServer(serverConfig)

  // first resolve config so we can pass into client plugin, then add client plugin:
  const resolvedConfig = await resolveConfig(serverConfig, 'serve')
  const viteRNClientPlugin = clientInjectionsPlugin(resolvedConfig)

  // this fakes vite into thinking its loading files, so it hmrs in native mode despite not requesting
  viteServer.watcher.addListener('change', async (path) => {
    const id = path.replace(process.cwd(), '')
    if (!id.endsWith('tsx') && !id.endsWith('jsx')) {
      return
    }
    // just so it thinks its loaded
    try {
      void viteServer.transformRequest(id)
    } catch (err) {
      // ok
      console.info('err', err)
    }
  })

  await viteServer.listen()
  const vitePort = viteServer.config.server.port

  const router = createRouter()
  const app = createApp({
    onError: (error) => {
      console.error(error)
    },
    onRequest: (event) => {
      console.info(' →', event.path)
    },
  })

  router.get(
    '/file',
    defineEventHandler((e) => {
      const query = getQuery(e)
      if (typeof query.file === 'string') {
        const source = hotUpdateCache.get(query.file)
        return new Response(source, {
          headers: {
            'content-type': 'text/javascript',
          },
        })
      }
    })
  )

  router.get(
    '/index.bundle',
    defineEventHandler(async (e) => {
      return new Response(await getReactNativeBundle(options, viteRNClientPlugin), {
        headers: {
          'content-type': 'text/javascript',
        },
      })
    })
  )

  router.get(
    '/status',
    defineEventHandler(() => `packager-status:running`)
  )

  app.use(router)

  // TODO move these to router.get():
  app.use(
    defineEventHandler(async ({ node: { req } }) => {
      if (!req.headers['user-agent']?.match(/Expo|React/)) {
        return
      }

      if (req.url === '/' || req.url?.startsWith('/?platform=')) {
        return getIndexJsonResponse({ port, root })
      }
    })
  )

  // TODO move, this does SSR + API
  createExpoServer(options, app, viteServer)

  const { handleUpgrade } = wsAdapter(app.websocket)

  // vite hmr two way bridge:
  if (vitePort) {
    const clients = new Set<Peer>()
    const socket = new WebSocket(`ws://localhost:${vitePort}/__vxrnhmr`, 'vite-hmr')

    socket.on('message', (msg) => {
      const message = msg.toString()
      for (const listener of [...clients]) {
        listener.send(message)
      }
    })

    socket.on('error', (err) => {
      console.info('error bridging socket to vite', err)
    })

    // vite hmr:
    app.use(
      '/__vxrnhmr',
      defineWebSocketHandler({
        open(peer) {
          console.debug('[hmr:web] open', peer)
          clients.add(peer)
        },

        message(peer, message) {
          socket.send(message.rawData)
        },

        close(peer, event) {
          console.info('[hmr:web] close', peer, event)
          clients.delete(peer)
        },

        error(peer, error) {
          console.error('[hmr:web] error', peer, error)
        },
      })
    )
  }

  // react native hmr:
  app.use(
    '/__hmr',
    defineWebSocketHandler({
      open(peer) {
        console.debug('[hmr] open', peer)
      },

      message(peer, message) {
        console.info('[hmr] message', peer, message)
        if (message.text().includes('ping')) {
          peer.send('pong')
        }
      },

      close(peer, event) {
        console.info('[hmr] close', peer, event)
      },

      error(peer, error) {
        console.error('[hmr] error', peer, error)
      },
    })
  )

  type ClientMessage = {
    type: 'client-log'
    level: 'log' | 'error' | 'info' | 'debug' | 'warn'
    data: string[]
  }

  // react native log bridge
  app.use(
    '/__client',
    defineWebSocketHandler({
      open(peer) {
        console.info('[client] open', peer)
      },

      message(peer, messageRaw) {
        const message = JSON.parse(messageRaw.text()) as any as ClientMessage

        switch (message.type) {
          case 'client-log': {
            console.info(`🪵 [${message.level}]`, ...message.data)
            return
          }

          default: {
            console.warn(`[client] Unknown message type`, message)
          }
        }
      },

      close(peer, event) {
        console.info('[client] close', peer, event)
      },

      error(peer, error) {
        console.error('[client] error', peer, error)
      },
    })
  )

  // Define proxy event handler
  const proxyEventHandler = createProxyEventHandler({
    target: `http://127.0.0.1:${vitePort}`,
    enableLogger: !!process.env.DEBUG,
  })
  app.use(eventHandler(proxyEventHandler))

  const server = nodeCreateServer(toNodeListener(app))

  server.on('upgrade', handleUpgrade)

  return {
    server,
    viteServer,

    async start() {
      server.listen(port)

      console.info(`Server running on http://localhost:${port}`)

      return {
        closePromise: new Promise((res) => viteServer.httpServer?.on('close', res)),
      }
    },

    stop: async () => {
      await Promise.all([server.close(), viteServer.close()])
    },
  }
}

async function getReactNativeBundle(options: VXRNConfigFilled, viteRNClientPlugin: any) {
  const { root, port, cacheDir } = options

  if (process.env.LOAD_TMP_BUNDLE) {
    // for easier quick testing things:
    const tmpBundle = join(process.cwd(), 'bundle.tmp.js')
    if (await pathExists(tmpBundle)) {
      console.info('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ returning temp bundle ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️', tmpBundle)
      return await readFile(tmpBundle, 'utf-8')
    }
  }

  if (isBuildingNativeBundle) {
    const res = await isBuildingNativeBundle
    return res
  }

  let done
  isBuildingNativeBundle = new Promise((res) => {
    done = res
  })

  async function babelReanimated(input: string, filename: string) {
    return await new Promise<string>((res, rej) => {
      babel.transform(
        input,
        {
          plugins: ['react-native-reanimated/plugin'],
          filename,
        },
        (err: any, result) => {
          if (!result || err) rej(err || 'no res')
          res(result!.code!)
        }
      )
    })
  }

  const viteFlow = options.flow ? createViteFlow(options.flow) : null

  // build app
  let buildConfig = {
    plugins: [
      viteFlow,

      swapPrebuiltReactModules(cacheDir),

      {
        name: 'reanimated',

        async transform(code, id) {
          if (code.includes('worklet')) {
            const out = await babelReanimated(code, id)
            return out
          }
        },
      },

      clientBundleTreeShakePlugin({}),
      viteRNClientPlugin,

      reactNativeCommonJsPlugin({
        root,
        port,
        mode: 'build',
      }),

      viteReactPlugin({
        tsDecorators: true,
        mode: 'build',
      }),

      {
        name: 'treat-js-files-as-jsx',
        async transform(code, id) {
          if (!id.match(/expo-status-bar/)) return null
          // Use the exposed transform from vite, instead of directly
          // transforming with esbuild
          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic',
          })
        },
      },
    ].filter(Boolean),
    appType: 'custom',
    root,
    clearScreen: false,

    optimizeDeps: {
      include: depsToOptimize,
      esbuildOptions: {
        jsx: 'automatic',
      },
    },

    resolve: {
      extensions: nativeExtensions,
    },

    mode: 'development',
    define: {
      'process.env.NODE_ENV': `"development"`,
    },
    build: {
      ssr: false,
      minify: false,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        treeshake: false,
        preserveEntrySignatures: 'strict',
        output: {
          preserveModules: true,
          format: 'cjs',
        },
      },
    },
  } satisfies InlineConfig

  if (options.buildConfig) {
    buildConfig = mergeConfig(buildConfig, options.buildConfig) as any
  }

  // this fixes my swap-react-native plugin not being called pre 😳
  await resolveConfig(buildConfig, 'build')

  // seems to be not working but needed to put it after the resolve or else it was cleared
  // @ts-ignore
  // buildConfig.build.rollupOptions.input = join(root, buildInput)

  const buildOutput = await build(buildConfig)

  if (!('output' in buildOutput)) {
    throw `❌`
  }

  let appCode = buildOutput.output
    // entry last
    .sort((a, b) => (a['isEntry'] ? 1 : -1))
    .map((outputModule) => {
      if (outputModule.type == 'chunk') {
        const importsMap = {
          currentPath: outputModule.fileName,
        }
        for (const imp of outputModule.imports) {
          const relativePath = relative(dirname(outputModule.fileName), imp)
          importsMap[relativePath[0] === '.' ? relativePath : './' + relativePath] = imp
        }

        if (outputModule.isEntry) {
          entryRoot = dirname(outputModule.fileName)
        }

        return `
___modules___["${outputModule.fileName}"] = ((exports, module) => {
const require = createRequire(${JSON.stringify(importsMap, null, 2)})

${outputModule.code}
})

${
  outputModule.isEntry
    ? `
// run entry
const __require = createRequire({})
__require("react-native")
__require("${outputModule.fileName}")
`
    : ''
}
`
      }
    })
    .join('\n')

  if (!appCode) {
    throw `❌`
  }

  appCode = appCode
    // this can be done in the individual file transform
    .replaceAll('undefined.accept(() => {})', '')
    .replaceAll('undefined.accept(function() {});', '')
    .replaceAll('(void 0).accept(() => {})', '')
    .replaceAll('(void 0).accept(function() {});', '')
    // TEMP FIX for expo-router tamagui thing since expo router 3 upgrade
    .replaceAll('dist/esm/index.mjs"', 'dist/esm/index.js"')

  // TODO this is not stable based on cwd
  const appRootParent = join(root, '..', '..')

  const prebuilds = {
    reactJSX: join(cacheDir, 'react-jsx-runtime.js'),
    react: join(cacheDir, 'react.js'),
    reactNative: join(cacheDir, 'react-native.js'),
  }

  const templateFile = resolveFile('vxrn/react-native-template.js')
  const template = (await readFile(templateFile, 'utf-8'))
    .replace('_virtual/virtual_react-native.js', relative(appRootParent, prebuilds.reactNative))
    .replace('_virtual/virtual_react.js', relative(appRootParent, prebuilds.react))
    .replaceAll('_virtual/virtual_react-jsx.js', relative(appRootParent, prebuilds.reactJSX))

  const out = template + appCode

  done(out)
  isBuildingNativeBundle = null

  return out
}

// we should just detect or whitelist and use flow to convert instead of this but i did a
// few things to the prebuilts to make them work, we may need to account for
async function swapPrebuiltReactModules(cacheDir: string) {
  const prebuilds = {
    reactJSX: join(cacheDir, 'react-jsx-runtime.js'),
    react: join(cacheDir, 'react.js'),
    reactNative: join(cacheDir, 'react-native.js'),
  }

  if (!(await pathExists(prebuilds.reactNative))) {
    console.info('Pre-building react, react-native react/jsx-runtime (one time cost)...')
    await Promise.all([
      buildReactNative({
        entryPoints: [resolveFile('react-native')],
        outfile: prebuilds.reactNative,
      }),
      buildReact({
        entryPoints: [resolveFile('react')],
        outfile: prebuilds.react,
      }),
      buildReactJSX({
        entryPoints: [resolveFile('react/jsx-dev-runtime')],
        outfile: prebuilds.reactJSX,
      }),
    ])
  }

  // react native port (it scans 19000 +5)
  const jsxRuntime = {
    // alias: 'virtual:react-jsx',
    alias: prebuilds.reactJSX,
    contents: await readFile(prebuilds.reactJSX, 'utf-8'),
  } as const

  const virtualModules = {
    'react-native': {
      // alias: 'virtual:react-native',
      alias: prebuilds.reactNative,
      contents: await readFile(prebuilds.reactNative, 'utf-8'),
    },
    react: {
      // alias: 'virtual:react',
      alias: prebuilds.react,
      contents: await readFile(prebuilds.react, 'utf-8'),
    },
    'react/jsx-runtime': jsxRuntime,
    'react/jsx-dev-runtime': jsxRuntime,
  } as const

  return {
    name: `swap-react-native`,
    enforce: 'pre',

    resolveId(id, importer = '') {
      if (id.startsWith('react-native/Libraries')) {
        return `virtual:rn-internals:${id}`
      }

      // this will break web support, we need a way to somehow switch between?
      if (id === 'react-native-web') {
        return prebuilds.reactNative
      }

      for (const targetId in virtualModules) {
        if (id === targetId || id.includes(`node_modules/${targetId}/`)) {
          const info = virtualModules[targetId]

          return info.alias
        }
      }

      // TODO this is terrible and slow, we should be able to get extensions working:
      // having trouble getting .native.js to be picked up via vite
      // tried adding packages to optimizeDeps, tried resolveExtensions + extensions...
      // tried this but seems to not be called for node_modules
      if (isBuildingNativeBundle) {
        if (id[0] === '.') {
          const absolutePath = resolve(dirname(importer), id)
          const nativePath = absolutePath.replace(/(.m?js)/, '.native.js')
          if (nativePath === id) return
          try {
            const directoryPath = absolutePath + '/index.native.js'
            const directoryNonNativePath = absolutePath + '/index.js'
            if (pathExistsSync(directoryPath)) {
              return directoryPath
            }
            if (pathExistsSync(directoryNonNativePath)) {
              return directoryNonNativePath
            }
            if (pathExistsSync(nativePath)) {
              return nativePath
            }
          } catch (err) {
            console.warn(`error probably fine`, err)
          }
        }
      }
    },

    load(id) {
      if (id.startsWith('virtual:rn-internals')) {
        const idOut = id.replace('virtual:rn-internals:', '')
        let out = `const ___val = __cachedModules["${idOut}"]
        const ___defaultVal = ___val ? ___val.default || ___val : ___val
        export default ___defaultVal`
        return out
      }

      for (const targetId in virtualModules) {
        const info = virtualModules[targetId as keyof typeof virtualModules]
        if (id === info.alias) {
          return info.contents
        }
      }
    },
  } satisfies PluginOption
}

function getIndexJsonResponse({ port, root }: { port: number | string; root }) {
  return {
    name: 'myapp',
    slug: 'myapp',
    scheme: 'myapp',
    version: '1.0.0',
    jsEngine: 'jsc',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
      imageUrl: 'http://127.0.0.1:8081/assets/./assets/splash.png',
    },
    updates: { fallbackToCacheTimeout: 0 },
    assetBundlePatterns: ['**/*'],
    ios: { supportsTablet: true, bundleIdentifier: 'com.natew.myapp' },
    android: {
      package: 'com.tamagui.myapp',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
        foregroundImageUrl: 'http://127.0.0.1:8081/assets/./assets/adaptive-icon.png',
      },
    },
    web: { favicon: './assets/favicon.png' },
    extra: { eas: { projectId: '061b4470-78c7-4d6a-b850-8167fb0a3434' } },
    _internal: {
      isDebug: false,
      projectRoot: root,
      dynamicConfigPath: null,
      staticConfigPath: join(root, 'app.json'),
      packageJsonPath: join(root, 'package.json'),
    },
    sdkVersion: '50.0.0',
    platforms: ['ios', 'android', 'web'],
    iconUrl: `http://127.0.0.1:${port}/assets/./assets/icon.png`,
    debuggerHost: `127.0.0.1:${port}`,
    logUrl: `http://127.0.0.1:${port}/logs`,
    developer: { tool: 'expo-cli', projectRoot: root },
    packagerOpts: { dev: true },
    mainModuleName: 'index',
    __flipperHack: 'React Native packager is running',
    hostUri: `127.0.0.1:${port}`,
    bundleUrl: `http://127.0.0.1:${port}/index.bundle?platform=ios&dev=true&hot=false&lazy=true`,
    id: '@anonymous/myapp-473c4543-3c36-4786-9db1-c66a62ac9b78',
  }
}

export function bindKeypressInput() {
  if (!process.stdin.setRawMode) {
    console.warn({
      msg: 'Interactive mode is not supported in this environment',
    })
    return
  }

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)

  process.stdin.on('keypress', (_key, data) => {
    const { ctrl, name } = data
    if (ctrl === true) {
      switch (name) {
        // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
        case 'c':
          process.exit()
        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP')
          break
      }
    } else {
      switch (name) {
        case 'r':
          // ctx.broadcastToMessageClients({ method: 'reload' })
          // ctx.log.info({
          //   msg: 'Reloading app',
          // })
          break
        case 'd':
          // ctx.broadcastToMessageClients({ method: 'devMenu' })
          // ctx.log.info({
          //   msg: 'Opening developer menu',
          // })
          break
        case 'c':
          process.stdout.write('\u001b[2J\u001b[0;0H')
          // TODO: after logging we should print information about port and host
          break
      }
    }
  })
}

function isWithin(outer: string, inner: string) {
  const rel = relative(outer, inner)
  return !rel.startsWith('../') && rel !== '..'
}

// used for normalizing hot reloads
let entryRoot = ''

async function getViteServerConfig(config: VXRNConfigFilled) {
  const { root, host, webConfig, cacheDir } = config

  const needsInterop = [
    'react',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react-native-web-internals',
    'react-dom',
    'react-native-web-lite',
    // '@vxrn/expo-router',
    // '@vxrn/expo-router/render',
    'react-dom/server',
    'react-dom/client',
  ]

  const ssrDepsToOptimize = [...depsToOptimize, ...needsInterop]

  let serverConfig: UserConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'development',
    }),
    {
      root,
      clearScreen: false,

      plugins: [
        //
        reactSwcPlugin({}),
        reactNativeHMRPlugin(config),
        // TODO this one shouldnt be on for SSR so need to diverge somehow
        clientBundleTreeShakePlugin({}),
      ],
      optimizeDeps: {
        include: depsToOptimize,
        exclude: [`${cacheDir}/*`],
        esbuildOptions: {
          resolveExtensions: extensions,
        },
      },
      ssr: {
        noExternal: true,
        optimizeDeps: {
          include: ssrDepsToOptimize,
          extensions: extensions,
          needsInterop: needsInterop,
          esbuildOptions: {
            resolveExtensions: extensions,
          },
        },
      },
      server: {
        hmr: {
          path: '/__vxrnhmr',
        },
        cors: true,
        host,
      },
    } satisfies UserConfig
  ) satisfies InlineConfig

  if (webConfig) {
    serverConfig = mergeConfig(serverConfig, webConfig) as any
  }

  serverConfig = {
    ...serverConfig,
    plugins: [...serverConfig.plugins!],
  }

  return serverConfig
}

function reactNativeHMRPlugin({ root }: VXRNConfigFilled) {
  return {
    name: 'client-transform',

    async handleHotUpdate({ read, modules, file }) {
      try {
        if (!isWithin(root, file)) {
          return
        }

        const [module] = modules
        if (!module) return

        const id = module?.url || file.replace(root, '')

        const code = await read()

        // got a weird pre compiled file on startup
        if (code.startsWith(`'use strict';`)) return

        if (!code) {
          return
        }

        let source = code

        // we have to remove jsx before we can parse imports...
        source = (await transformForBuild(id, source))?.code || ''

        const importsMap = {}

        // parse imports of modules into ids:
        // eg `import x from '@tamagui/core'` => `import x from '/me/node_modules/@tamagui/core/index.js'`
        const [imports] = parse(source)

        let accumulatedSliceOffset = 0

        for (const specifier of imports) {
          const { n: importName, s: start } = specifier

          if (importName) {
            const id = await getVitePath(entryRoot, file, importName)
            if (!id) {
              console.warn('???')
              continue
            }

            importsMap[id] = id.replace(/^(\.\.\/)+/, '')

            // replace module name with id for hmr
            const len = importName.length
            const extraLen = id.length - len
            source =
              source.slice(0, start + accumulatedSliceOffset) +
              id +
              source.slice(start + accumulatedSliceOffset + len)
            accumulatedSliceOffset += extraLen
          }
        }

        // then we have to convert to commonjs..
        source =
          (
            await swcTransform(id, source, {
              mode: 'serve-cjs',
            })
          )?.code || ''

        if (!source) {
          throw '❌ no source'
        }

        importsMap['currentPath'] = id

        const hotUpdateSource = `exports = ((exports) => {
          const require = createRequire(${JSON.stringify(importsMap, null, 2)})
          ${source
            .replace(`import.meta.hot.accept(() => {})`, ``)
            // replace import.meta.glob with empty array in hot reloads
            .replaceAll(/import.meta.glob\(.*\)/gi, `globalThis['__importMetaGlobbed'] || {}`)};
          return exports })({})`

        if (process.env.DEBUG) {
          console.info(`Sending hot update`, hotUpdateSource)
        }

        hotUpdateCache.set(id, hotUpdateSource)
      } catch (err) {
        console.error(`Error processing hmr update:`, err)
      }
    },
  }
}
