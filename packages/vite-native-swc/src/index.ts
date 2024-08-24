import { type SourceMapPayload, createRequire } from 'node:module'
import {
  type JscTarget,
  type Output,
  type ParserConfig,
  type ReactConfig,
  type Options as SWCOptions,
  transform,
} from '@swc/core'
import type { PluginOption, UserConfig } from 'vite'
import { extname } from 'node:path'

// this file is a mess lol

// TODO we arent reading .env early enough to just put this in parent scope
function shouldSourceMap() {
  return process.env.VXRN_DISABLE_SOURCE_MAP !== '1'
}

// TODO node has an import to do this: const require = createRequire(import.meta.url)
const resolve = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url
).resolve
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/

type Options = {
  mode: 'serve' | 'serve-cjs' | 'build'

  /**
   * Control where the JSX factory is imported from.
   * @default "react"
   */
  jsxImportSource?: string
  /**
   * Enable TypeScript decorators. Requires experimentalDecorators in tsconfig.
   * @default false
   */
  tsDecorators?: boolean
  /**
   * Use SWC plugins. Enable SWC at build time.
   * @default undefined
   */
  plugins?: [string, Record<string, any>][]

  forceJSX?: boolean
}

const isWebContainer = globalThis.process?.versions?.webcontainer

const parsers: Record<string, ParserConfig> = {
  '.tsx': { syntax: 'typescript', tsx: true, decorators: true },
  '.ts': { syntax: 'typescript', tsx: false, decorators: true },
  '.jsx': { syntax: 'ecmascript', jsx: true },
  '.js': { syntax: 'ecmascript' },
  // JSX is required to trigger fast refresh transformations, even if MDX already transforms it
  '.mdx': { syntax: 'ecmascript', jsx: true },
}

function getParser(id: string, forceJSX = false) {
  if (id.endsWith('vxs-entry-native')) {
    return parsers['.tsx']
  }

  const extension = extname(id)
  let parser: ParserConfig = !extension ? parsers['.js'] : parsers[extension]

  // compat
  if (extension === '.js') {
    if (forceJSX) {
      parser = parsers['.jsx']
    }

    if (id.includes('expo-modules-core')) {
      parser = parsers['.jsx']
    }
  }

  return parser
}

export default (_options?: Options): PluginOption[] => {
  const options = {
    mode: _options?.mode ?? 'serve',
    jsxImportSource: _options?.jsxImportSource ?? 'react',
    tsDecorators: _options?.tsDecorators,
    plugins: _options?.plugins
      ? _options?.plugins.map((el): typeof el => [resolve(el[0]), el[1]])
      : undefined,
  }

  const hasTransformed = {}

  return [
    {
      name: 'vite:react-swc',
      enforce: 'pre',

      config: () => {
        const config = {
          esbuild: false,

          build: {
            // idk why i need both..
            rollupOptions: {
              plugins: [
                {
                  name: `native-transform`,
                  options: {
                    order: 'pre',
                    handler(options) {},
                  },

                  async transform(code, id) {
                    const parser = getParser(id)

                    const out = await transform(code, {
                      filename: id,
                      swcrc: false,
                      configFile: false,
                      sourceMaps: shouldSourceMap(),
                      jsc: {
                        target: 'es5',
                        parser,
                        transform: {
                          useDefineForClassFields: true,
                          react: {
                            development: true,
                            refresh: false,
                            runtime: 'automatic',
                          },
                        },
                      },
                    })

                    hasTransformed[id] = true
                    return out
                  },
                },
              ],
            },
          },
        } satisfies UserConfig

        return {
          environments: {
            ios: config,
            android: config,
          },
        }
      },

      configResolved(config) {
        const mdxIndex = config.plugins.findIndex((p) => p.name === '@mdx-js/rollup')
        if (
          mdxIndex !== -1 &&
          mdxIndex > config.plugins.findIndex((p) => p.name === 'vite:react-swc')
        ) {
          throw new Error('[vite:react-swc] The MDX plugin should be placed before this plugin')
        }
        if (isWebContainer) {
          config.logger.warn(
            '[vite:react-swc] SWC is currently not supported in WebContainers. You can use the default React plugin instead.'
          )
        }
      },

      async transform(code, _id, transformOptions) {
        if (hasTransformed[_id]) return
        if (_id.includes(`virtual:`)) {
          return
        }

        const out = await swcTransform(_id, code, options)
        hasTransformed[_id] = true
        return out
      },
    },
  ]
}

export async function swcTransform(_id: string, code: string, options: Options) {
  // todo hack
  const id = _id.split('?')[0].replace(process.cwd(), '')

  // const refresh = !transformOptions?.ssr && !hmrDisabled
  // only change for now:
  const refresh = !options.forceJSX

  const result = await transformWithOptions(
    id,
    code,
    options.forceJSX ? 'esnext' : 'es5',
    options,
    {
      refresh,
      development: !options.forceJSX,
      runtime: 'automatic',
      importSource: options.jsxImportSource,
    }
  )

  if (!result) {
    return
  }

  if (!refresh || !refreshContentRE.test(result.code)) {
    return result
  }

  result.code = wrapSourceInRefreshRuntime(id, result.code, options)

  if (result.map) {
    const sourceMap: SourceMapPayload = JSON.parse(result.map)
    sourceMap.mappings = ';;;;;;;;' + sourceMap.mappings
    return { code: result.code, map: sourceMap }
  }

  return { code: result.code }
}

export const transformWithOptions = async (
  id: string,
  code: string,
  target: JscTarget,
  options: Options,
  reactConfig: ReactConfig
) => {
  const parser = getParser(id, options.forceJSX)
  if (!parser) return

  let result: Output
  try {
    const transformOptions = {
      filename: id,
      swcrc: false,
      configFile: false,
      sourceMaps: shouldSourceMap(),
      module: {
        type: 'nodenext',
      },
      ...(options.mode === 'serve-cjs' && {
        module: {
          type: 'commonjs',
          strict: true,
          importInterop: 'node',
        },
      }),
      jsc: {
        target,
        parser,
        transform: {
          useDefineForClassFields: true,
          react: reactConfig,
        },
      },
    } satisfies SWCOptions

    result = await transform(code, transformOptions)
  } catch (e: any) {
    const message: string = e.message
    const fileStartIndex = message.indexOf('╭─[')
    if (fileStartIndex !== -1) {
      const match = message.slice(fileStartIndex).match(/:(\d+):(\d+)]/)
      if (match) {
        e.line = match[1]
        e.column = match[2]
      }
    }
    throw e
  }

  return result
}

export function wrapSourceInRefreshRuntime(id: string, code: string, options: Options) {
  const prefixCode =
    options.mode === 'build'
      ? `
  // ensure it loads react, react native, vite client
  import 'react-native'
  import 'react'
  import '@vxrn/vite-native-client'
  `
      : ``

  return `const RefreshRuntime = __cachedModules["react-refresh/cjs/react-refresh-runtime.development"];
const prevRefreshReg = globalThis.$RefreshReg$;
const prevRefreshSig = globalThis.$RefreshSig$;
globalThis.$RefreshReg$ = (type, id) => RefreshRuntime.register(type, "${id}" + " " + id);
globalThis.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

${prefixCode}

module.url = '${id}'
module.hot = createHotContext(module.url)

${code}


if (module.hot) {
  globalThis.$RefreshReg$ = prevRefreshReg;
  globalThis.$RefreshSig$ = prevRefreshSig;
  globalThis['lastHmrExports'] = JSON.stringify(Object.keys(exports))
  if (module.hot.accept) {
    module.hot.accept((nextExports) => {
      RefreshRuntime.performReactRefresh()
    });
  }
}
  `
}

export const transformForBuild = async (id: string, code: string) => {
  const parser = getParser(id)
  if (!parser) return
  return await transform(code, {
    filename: id,
    swcrc: false,
    configFile: false,
    sourceMaps: shouldSourceMap(),
    jsc: {
      target: 'es2019',
      parser,
      transform: {
        useDefineForClassFields: true,
        react: {
          development: true,
          runtime: 'automatic',
        },
      },
    },
  })
}
