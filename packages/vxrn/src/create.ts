import viteInspectPlugin from 'vite-plugin-inspect'
import { readFile } from 'fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

import * as babel from '@babel/core'
import viteReactPlugin, { swcTransform, transformForBuild } from '@vxrn/vite-native-swc'
import react from '@vitejs/plugin-react-swc'
import { parse } from 'es-module-lexer'
import { ensureDir, pathExists, pathExistsSync } from 'fs-extra'
import {
  type InlineConfig,
  type PluginOption,
  type UserConfig,
  build,
  createServer,
  mergeConfig,
  resolveConfig,
} from 'vite'
import { buildReactNative, buildReact, buildReactJSX } from '@vxrn/react-native-prebuilt'

import { clientInjectionsPlugin } from './dev/clientInjectPlugin'
import { createDevServer } from './dev/createDevServer'
import type { HMRListener, StartOptions } from './types'
import { nativePlugin } from './nativePlugin'
import { getVitePath } from './getVitePath'

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
  '.js',
  '.css',
  '.json',
]

export const create = async (options: StartOptions) => {
  const { host = '127.0.0.1', root, nativePort = 8081, webPort } = options
  // used for normalizing hot reloads
  let entryRoot = ''

  const packageRootDir = join(__dirname, '..')

  const cacheDir = join(options.root, 'node_modules', '.cache', 'vxrn')

  await ensureDir(cacheDir)

  const prebuilds = {
    reactJSX: join(cacheDir, 'react-jsx-runtime.js'),
    react: join(cacheDir, 'react.js'),
    reactNative: join(cacheDir, 'react-native.js'),
  }

  if (!(await pathExists(prebuilds.reactNative))) {
    console.info('Pre-building react, react-native react/jsx-runtime (one time cost)...')
    await Promise.all([
      buildReactNative({
        entryPoints: [require.resolve('react-native')],
        outfile: prebuilds.reactNative,
      }),
      buildReact({
        entryPoints: [require.resolve('react')],
        outfile: prebuilds.react,
      }),
      buildReactJSX({
        entryPoints: [require.resolve('react/jsx-dev-runtime')],
        outfile: prebuilds.reactJSX,
      }),
    ])
  }

  const templateFile = join(packageRootDir, 'react-native-template.js')

  // react native port (it scans 19000 +5)
  const hmrListeners: HMRListener[] = []
  const hotUpdatedCJSFiles = new Map<string, string>()
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

  const swapRnPlugin: PluginOption = {
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

      // having trouble getting .native.js to be picked up via vite
      // tried adding packages to optimizeDeps, tried resolveExtensions + extensions...
      // tried this but seems to not be called for node_modules
      if (id[0] === '.') {
        const absolutePath = resolve(dirname(importer), id)
        const nativePath = absolutePath.replace('.js', '') + '.native.js'
        if (nativePath === id) return
        if (pathExistsSync(nativePath)) {
          console.info('swap for native', id, nativePath)
          return nativePath
        }
      }
    },

    load(id) {
      if (id.startsWith('virtual:rn-internals')) {
        const idOut = id.replace('virtual:rn-internals:', '')
        return `const val = __cachedModules["${idOut}"]
          export const PressabilityDebugView = val.PressabilityDebugView
          export default val ? val.default || val : val`
      }

      for (const targetId in virtualModules) {
        const info = virtualModules[targetId as keyof typeof virtualModules]
        if (id === info.alias) {
          return info.contents
        }
      }
    },
  } as const

  let serverConfig: UserConfig = {
    root,
    mode: 'development',
    clearScreen: false,
    define: {
      __DEV__: 'true',
      'process.env.NODE_ENV': `"development"`,
    },

    resolve: {
      // dedupe: ['react', 'react-dom'],
      alias: {
        // ...Object.fromEntries(Object.entries(virtualModules).map(([k, v]) => [k, v.alias])),
        'react-native': require.resolve('react-native-web-lite'),
      },
    },
    optimizeDeps: {
      include: ['react'],
      exclude: Object.values(virtualModules).map((v) => v.alias),
      force: true,
      esbuildOptions: {
        resolveExtensions: extensions,
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    plugins: [
      swapRnPlugin,
      react(),
      // viteReactPlugin({
      //   tsDecorators: true,
      //   mode: 'serve',
      // }),
      {
        name: 'client-transform',

        async handleHotUpdate({ read, modules, file }) {
          try {
            if (!file.includes('/src/')) {
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

            const hotUpdateSource = `exports = ((exports) => {
              const require = createRequire(${JSON.stringify(importsMap, null, 2)})
              ${source
                .replace(`import.meta.hot.accept(() => {})`, ``)
                // replace import.meta.glob with empty array in hot reloads
                .replaceAll(/import.meta.glob\(.*\)/gi, `globalThis['__importMetaGlobbed'] || {}`)};
              return exports })({})`

            if (process.env.DEBUG === 'vxrn') {
              console.info(`Sending hot update`, hotUpdateSource)
            }

            hotUpdatedCJSFiles.set(id, hotUpdateSource)
          } catch (err) {
            console.error(`Error processing hmr update:`, err)
          }
        },
      },
    ],

    server: {
      cors: true,
      port: webPort,
      host,
    },
  } satisfies InlineConfig

  if (options.webConfig) {
    serverConfig = mergeConfig(serverConfig, options.webConfig) as any
  }

  // first resolve config so we can pass into client plugin, then add client plugin:
  const resolvedConfig = await resolveConfig(serverConfig, 'serve')

  const viteRNClientPlugin = clientInjectionsPlugin(resolvedConfig)

  serverConfig = {
    ...serverConfig,
    plugins: [...serverConfig.plugins!],
  }

  const viteServer = await createServer(serverConfig)

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

  let isBuilding: Promise<string> | null = null

  const nativeServer = await createDevServer(
    {
      root,
      port: nativePort,
      host,
    },
    {
      hotUpdatedCJSFiles,
      listenForHMR(cb) {
        hmrListeners.push(cb)
      },
      getIndexBundle: getBundleCode,
      indexJson: getIndexJsonResponse({ port: nativePort, root }),
    }
  )

  return {
    nativeServer: nativeServer.instance,
    viteServer,

    async start() {
      await Promise.all([viteServer.listen(), nativeServer.start()])

      return {
        closePromise: new Promise((res) => viteServer.httpServer?.on('close', res)),
      }
    },

    stop: async () => {
      await Promise.all([nativeServer.stop(), viteServer.close()])
    },
  }

  async function getBundleCode() {
    if (process.env.LOAD_TMP_BUNDLE) {
      // for easier quick testing things:
      const tmpBundle = join(process.cwd(), 'bundle.tmp.js')
      if (await pathExists(tmpBundle)) {
        console.info('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ returning temp bundle ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️', tmpBundle)
        return await readFile(tmpBundle, 'utf-8')
      }
    }

    if (isBuilding) {
      const res = await isBuilding
      return res
    }

    let done
    isBuilding = new Promise((res) => {
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

    // build app
    let buildConfig = {
      plugins: [
        swapRnPlugin,

        {
          name: 'reanimated',

          async transform(code, id) {
            if (code.includes('worklet')) {
              const out = await babelReanimated(code, id)
              return out
            }
          },
        },

        viteRNClientPlugin,

        nativePlugin({
          root: options.root,
          port: nativePort,
          mode: 'build',
        }),

        viteReactPlugin({
          tsDecorators: true,
          mode: 'build',
        }),

        viteInspectPlugin({
          build: true,
          outputDir: '.vite-inspect',
        }),

        {
          name: 'native-extensions',

          // async config(config) {
          //   config.resolve!.extensions = nativeExtensions
          //   config.optimizeDeps!.esbuildOptions!.resolveExtensions = nativeExtensions

          //   return config
          // },
        },
      ],
      appType: 'custom',
      root,
      clearScreen: false,

      // optimizeDeps: {
      //   include: ['tamagui'],
      // },

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

      resolve: {
        extensions: nativeExtensions,
      },

      mode: 'development',
      define: {
        'process.env.NODE_ENV': `"development"`,
      },
    } satisfies InlineConfig

    if (options.buildConfig) {
      buildConfig = mergeConfig(buildConfig, options.buildConfig) as any
    }

    // this fixes my swap-react-native plugin not being called pre 😳
    await resolveConfig(buildConfig, 'build')

    const buildOutput = await build(buildConfig)

    if (!('output' in buildOutput)) {
      throw `❌`
    }

    let appCode = buildOutput.output
      // entry last
      .sort((a, b) => (a['isEntry'] ? 1 : -1))
      .map((outputModule) => {
        if (outputModule.type == 'chunk') {
          const importsMap = {}
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
      .replaceAll('undefined.accept(function() {});', '') // swc

    // TODO this is not stable based on cwd
    const appRootParent = join(options.root, '..', '..')

    const template = (await readFile(templateFile, 'utf-8'))
      .replace('_virtual/virtual_react-native.js', relative(appRootParent, prebuilds.reactNative))
      .replace('_virtual/virtual_react.js', relative(appRootParent, prebuilds.react))
      .replaceAll('_virtual/virtual_react-jsx.js', relative(appRootParent, prebuilds.reactJSX))

    const out = template + appCode

    done(out)
    isBuilding = null

    return out
  }
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
    sdkVersion: '47.0.0',
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
