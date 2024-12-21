import nodeResolve from '@rollup/plugin-node-resolve'
import viteNativeSWC, { swcTransform } from '@vxrn/vite-native-swc'
import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  type InlineConfig,
  type Plugin,
  resolveConfig,
  type ResolvedConfig,
  transformWithEsbuild,
  type UserConfig,
} from 'vite'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { getBabelReanimatedPlugin } from '../plugins/babelReanimated'
import { nativeClientInjectPlugin } from '../plugins/clientInjectPlugin'
import { reactNativeCommonJsPlugin } from '../plugins/reactNativeCommonJsPlugin'
import { reactNativeDevAssetPlugin } from '../plugins/reactNativeDevAssetPlugin'
import { dedupe } from './getBaseViteConfig'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { swapPrebuiltReactModules } from './swapPrebuiltReactModules'

// Suppress these logs:
// * Use of eval in "(...)/react-native-prebuilt/vendor/react-native-0.74.1/index.js" is strongly discouraged as it poses security risks and may cause issues with minification.
// * Use of eval in "(...)/one/dist/esm/useLoader.native.js" is strongly discouraged as it poses security risks and may cause issues with minification.
// (not an exhaustive list)
const IGNORE_ROLLUP_LOGS_RE =
  /vite-native-client\/dist\/esm\/client|node_modules\/\.vxrn\/react-native|react-native-prebuilt\/vendor|one\/dist/

export async function getReactNativeConfig(
  options: VXRNOptionsFilled,
  internal: { mode?: 'dev' | 'prod'; assetsDest?: string } = { mode: 'dev' },
  platform: 'ios' | 'android'
) {
  const {
    root,
    server: { port },
  } = options
  const { optimizeDeps } = getOptimizeDeps('build')

  const { mode } = internal
  const serverUrl = process.env.ONE_SERVER_URL || options.server.url

  // build app
  let nativeBuildConfig = {
    plugins: [
      ...(globalThis.__vxrnAddNativePlugins || []),

      ...(mode === 'dev' ? [nativeClientInjectPlugin()] : []),

      // vite doesnt support importing from a directory but its so common in react native
      // so lets make it work, and node resolve theoretically fixes but you have to pass in moduleDirs
      // but we need this to work anywhere including in normal source files
      {
        name: 'node-dir-imports',
        enforce: 'pre',

        async resolveId(importee, importer) {
          if (!importer || !importee.startsWith('./')) {
            return null
          }
          // let nodeResolve handle node_modules
          if (importer?.includes('node_modules')) {
            return
          }
          try {
            const resolved = join(dirname(importer), importee)
            if ((await stat(resolved)).isDirectory()) {
              // fix for importing a directory
              // TODO this would probably want to support their configured extensions
              // TODO also platform-specific extensions
              for (const ext of ['ts', 'tsx', 'mjs', 'js']) {
                try {
                  const withExt = join(resolved, `index.${ext}`)
                  await stat(withExt)
                  // its a match
                  return withExt
                } catch {
                  // keep going
                }
              }
            }
          } catch {
            // not a dir keep going
          }
        },
      } satisfies Plugin,

      {
        name: 'one:native-no-external',
        enforce: 'pre',
        config() {
          const noExternalsEnvConfig = {
            consumer: 'server',
            resolve: {
              noExternal: true,
            },
          } as const

          return {
            environments: {
              ios: noExternalsEnvConfig,
              android: noExternalsEnvConfig,
            },
          }
        },
      } satisfies Plugin,

      nodeResolve(),

      swapPrebuiltReactModules(options.cacheDir, {
        // TODO: a better way to pass the mode (dev/prod) to PrebuiltReactModules
        mode: internal.mode || 'dev',
        platform,
      }),

      reactNativeDevAssetPlugin({
        projectRoot: options.root,
        mode: internal.mode,
        assetsDest: internal.assetsDest,
        assetExts: DEFAULT_ASSET_EXTS,
      }),

      getBabelReanimatedPlugin(),

      reactNativeCommonJsPlugin({
        root,
        port,
        mode: 'build',
      }),

      // Avoid "failed to read input source map: failed to parse inline source map url" errors on certain packages, such as react-native-reanimated.
      {
        name: 'remove-inline-source-maps',
        transform: {
          order: 'pre',
          async handler(code, id) {
            if (!id.includes('react-native-reanimated')) {
              return null
            }

            const inlineSourceMapIndex = code.lastIndexOf('//# sourceMappingURL=')
            if (inlineSourceMapIndex >= 0) {
              return code.slice(0, inlineSourceMapIndex).trimEnd()
            }

            return null
          },
        },
      },

      viteNativeSWC({
        tsDecorators: true,
        mode: 'build',
        production: mode === 'prod',
      }),

      // TODO i think this probably should be a swc plugin (has to be wasm-rust unfortuantely)
      // but luckily not too bad because its pretty simple: if export type, export let object
      // and a basic check for if any other export exists that is already there
      {
        name: 'one-node-module-transforms',

        transform: {
          order: 'pre',
          async handler(code: string, id: string) {
            const isNodeModule = id.includes('node_modules')

            // handles typescript
            if (isNodeModule && /\.tsx?$/.test(id)) {
              // we need to keep fake objects for type exports
              const typeExportsMatch = code.match(/^\s*export\s+type\s+([^\s]+)/gi)

              const output = await swcTransform(id, code, {
                mode: mode === 'dev' ? 'serve' : 'build',
                noHMR: true, // We should not insert HMR runtime code at this stage, as we expect another plugin (e.g. vite:react-swc) to handle that. Inserting it here may cause error: `The symbol "RefreshRuntime" has already been declared`.
              })

              if (!output) return null

              let codeOut = output.code

              // add back in export types as fake objects:

              if (typeExportsMatch) {
                for (const typeExport of Array.from(typeExportsMatch)) {
                  const [_export, _type, name] = typeExport.split(/\s+/)
                  // FIXME: support `export { ... } from '...'`
                  if (name.startsWith('{')) continue

                  // basic sanity check it isn't exported already
                  const alreadyExported = new RegExp(
                    `export (const|let|class|function) ${name}\\s+`
                  ).test(codeOut)

                  if (!alreadyExported) {
                    const fakeExport = `export let ${name} = {};`
                    codeOut += `\n${fakeExport}\n`
                  }
                }
              }

              return {
                code: codeOut,
                map: output.map,
              }
            }

            // handles expo modules
            if (
              isNodeModule &&
              (id.includes('node_modules/expo-') || id.includes('node_modules/@expo/'))
            ) {
              // Use the exposed transform from vite, instead of directly
              // transforming with esbuild
              return transformWithEsbuild(code, id, {
                loader: 'jsx',
                jsx: 'automatic',
              })
            }
          },
        },
      },

      {
        // FIXME: This is a workaround to "tree-shake" things that will cause problems away before we have Rollup tree-shaking configured properly (https://github.com/onejs/one/pull/340).
        name: 'vxrn:manual-tree-shake',
        enforce: 'post',
        async renderChunk(code, chunk, options, meta) {
          if (chunk.name.endsWith('packages/one/dist/esm/createApp.native')) {
            // What we want to do here is to "tree-shake" `require('react-scan/native')` away if it's value is not assigned to anything (i.e. not used).
            // However, `react-scan/native` will be wrapped with a "commonjs-es-import" virtual module by the `@rollup/plugin-commonjs` plugin (Vite built-in) so that import won't have `react-scan/native` in it's name. The only thing for sure is that it's path will contain `_virtual`.
            // As in `createApp.native` the only "side-effect modules" we are currently using are './polyfills-mobile' and './setup', which won't be wrapped with a virtual module, this won't remove unintended things for now.
            return { code: code.replace(/^require\(.+_virtual.+\);/gm, '') }
          }
        },
      } satisfies Plugin,
    ].filter(Boolean),

    appType: 'custom',
    root,
    clearScreen: false,

    optimizeDeps: {
      ...optimizeDeps,
      esbuildOptions: {
        jsx: 'automatic',
      },
    },

    resolve: {
      dedupe,
    },

    mode: mode === 'dev' ? 'development' : 'production',

    define: {
      'process.env.NODE_ENV': mode === 'dev' ? `"development"` : `"production"`,
      'process.env.ONE_SERVER_URL': JSON.stringify(serverUrl),
    },

    build: {
      ssr: true,
      minify: false,
      commonjsOptions: {
        transformMixedEsModules: true,
        ignore(id) {
          return id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime'
        },
      },
      rollupOptions: {
        input: options.entries.native,
        treeshake: false,
        preserveEntrySignatures: 'strict',
        output: {
          preserveModules: true,
          format: 'cjs',
        },

        onwarn(message, warn) {
          // Suppress "Module level directives cause errors when bundled" warnings
          if (!process.env.DEBUG?.startsWith('vxrn')) {
            if (
              message.code === 'MODULE_LEVEL_DIRECTIVE' ||
              message.code === 'INVALID_ANNOTATION' ||
              message.code === 'MISSING_EXPORT' ||
              message.code === 'SOURCEMAP_ERROR'
            ) {
              warnAboutSuppressingLogsOnce()
              return
            }
          }
          warn(message)
        },

        onLog(level, log, handler) {
          if (!process.env.DEBUG?.startsWith('vxrn')) {
            if (IGNORE_ROLLUP_LOGS_RE.test(log.message)) {
              warnAboutSuppressingLogsOnce()
              return
            }
          }

          handler(level, log)
        },
      },
    },
  } satisfies InlineConfig

  // TODO
  // if (options.nativeConfig) {
  //   nativeBuildConfig = mergeConfig(nativeBuildConfig, options.nativeConfig) as any
  // }

  // // this fixes my swap-react-native plugin not being called pre 😳
  resolvedConfig = await resolveConfig(nativeBuildConfig, 'build')

  // The `resolveConfig` function will load user's `vite.config.*` (by calling `loadConfigFromFile`).
  // Here we do this to make user defined global constant replacements (https://vite.dev/config/shared-options#define) to take effect in RN.
  // TODO: Ultimately, we should make all the user defined config options to take effect in RN.
  if (resolvedConfig.define) {
    nativeBuildConfig.define = {
      ...nativeBuildConfig.define,
      ...resolvedConfig.define,
    }
  }

  return nativeBuildConfig satisfies UserConfig
}

let resolvedConfig: ResolvedConfig | null = null
export function getReactNativeResolvedConfig() {
  return resolvedConfig
}

let didWarnSuppressingLogs = false
function warnAboutSuppressingLogsOnce() {
  if (!didWarnSuppressingLogs) {
    didWarnSuppressingLogs = true
    // honestly they are harmdless so no need to warn, but it would be nice to do it once ever and then save that we did to disk
    // console.warn(` [vxrn] Suppressing mostly harmless logs, enable with DEBUG=vxrn`)
  }
}
