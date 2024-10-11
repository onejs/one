import {
  type ModuleConfig,
  type Output,
  type ParserConfig,
  type ReactConfig,
  type Options as SWCOptions,
  transform,
} from '@swc/core'
import { type SourceMapPayload, createRequire } from 'node:module'
import { extname } from 'node:path'
import type { PluginOption, UserConfig } from 'vite'
import { transformGenerators } from './transformBabel'

// this file is a mess lol

// TODO we arent reading .env early enough to just put this in parent scope
function shouldSourceMap() {
  return process.env.VXRN_ENABLE_SOURCE_MAP === '1'
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
  noHMR?: boolean

  production?: boolean
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

const SWC_ENV = {
  targets: {
    node: '4',
  },
  include: [],
  // this breaks the uniswap app for any file with a ...spread
  exclude: [
    'transform-spread',
    'transform-destructuring',
    'transform-object-rest-spread',
    // `transform-async-to-generator` is relying on `transform-destructuring`.
    // If we exclude `transform-destructuring` but not `transform-async-to-generator`, the SWC binary will panic
    // with error: `called `Option::unwrap()` on a `None` value`.
    // See: https://github.com/swc-project/swc/blob/v1.7.14/crates/swc_ecma_compat_es2015/src/generator.rs#L703-L705
    'transform-async-to-generator',
    'transform-regenerator', // Similar to above
  ],
}

function getParser(id: string, forceJSX = false) {
  if (id.endsWith('one-entry-native')) {
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
  const hasTransformed = {}

  const asyncGeneratorRegex = /(async \*|async function\*|for await)/

  const transformWithoutGenerators = async (code: string, id: string) => {
    const parser = getParser(id)
    hasTransformed[id] = true
    return await transform(code, {
      filename: id,
      swcrc: false,
      configFile: false,
      sourceMaps: shouldSourceMap(),
      jsc: {
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
      env: SWC_ENV,
    })
  }

  const transformWithGenerators = async (code: string, id: string) => {
    if (process.env.VXRN_USE_BABEL_FOR_GENERATORS) {
      return await transformGenerators(code)
    }

    const parser = getParser(id)
    hasTransformed[id] = true
    return await transform(code, {
      filename: id,
      swcrc: false,
      configFile: false,
      sourceMaps: shouldSourceMap(),
      jsc: {
        parser,
        target: 'es5',
        transform: {
          useDefineForClassFields: true,
          react: {
            development: !_options?.production,
            refresh: false,
            runtime: 'automatic',
          },
        },
      },
    })
  }

  const options = {
    mode: _options?.mode ?? 'serve',
    jsxImportSource: _options?.jsxImportSource ?? 'react',
    tsDecorators: _options?.tsDecorators,
    plugins: _options?.plugins
      ? _options?.plugins.map((el): typeof el => [resolve(el[0]), el[1]])
      : undefined,
    production: _options?.production,
  }

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
                  name: `swc-react-native-transform`,
                  options: {
                    order: 'pre',
                    handler(options) {},
                  },

                  async transform(code, id) {
                    // cant actually do this! we should prebuild using swc probably
                    // if (id.includes('react-native-prebuilt')) {
                    //   return
                    // }

                    if (asyncGeneratorRegex.test(code)) {
                      return await transformWithGenerators(code, id)
                    }

                    try {
                      return await transformWithoutGenerators(code, id)
                    } catch (err) {
                      // seeing an error with /Users/n8/universe/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
                      // fallback to a different config:
                      if (process.env.DEBUG === 'vxrn') {
                        console.error(`${err}`)
                      }
                      return await transformWithGenerators(code, id)
                    }
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

        if (asyncGeneratorRegex.test(code)) {
          return await transformWithGenerators(code, _id)
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
  const refresh = options.production || options.noHMR ? false : !options.forceJSX

  const result = await transformWithOptions(id, code, options, {
    refresh,
    development: !options.forceJSX && !options.production,
    runtime: 'automatic',
    importSource: options.jsxImportSource,
  })

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

const SHARED_MODULE_CONFIG = {
  importInterop: 'none', // We want SWC to transform imports to require since there's no Rollup to handle them afterwards, but without adding any interop helpers that would break with our RN module system
} satisfies Partial<ModuleConfig>

export const transformWithOptions = async (
  id: string,
  code: string,
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
        ...SHARED_MODULE_CONFIG,
        type: 'nodenext',
      },
      ...(options.mode === 'serve-cjs' && {
        module: {
          ...SHARED_MODULE_CONFIG,
          type: 'commonjs',
          strict: true,
        },
      }),
      jsc: {
        parser,
        transform: {
          useDefineForClassFields: true,
          react: reactConfig,
        },
        ...(options.forceJSX ? { target: 'esnext' } : {}),
      },
      ...(options.forceJSX ? {} : { env: SWC_ENV }),
    } satisfies SWCOptions

    result = await transform(code, transformOptions)
  } catch (e: any) {
    // try another config?
    console.info(
      `SWC failed to transform file, but sometimes this is fine so continuing... Please report: ${id} ${e.message}`
    )

    return { code }

    // const message: string = e.message
    // const fileStartIndex = message.indexOf('╭─[')
    // if (fileStartIndex !== -1) {
    //   const match = message.slice(fileStartIndex).match(/:(\d+):(\d+)]/)
    //   if (match) {
    //     e.line = match[1]
    //     e.column = match[2]
    //   }
    // }
    // throw e
  }

  return result
}

function wrapSourceInRefreshRuntime(id: string, code: string, options: Options) {
  const prefixCode =
    options.mode === 'build'
      ? `
  // ensure it loads react, react native, vite client
  import 'react-native'
  import 'react'
  import '@vxrn/vite-native-client'
  `
      : ``

  if (options.production) {
    return `
  ${prefixCode}

  module.url = '${id}'

  ${code}
    `
  }

  return `const RefreshRuntime = __cachedModules["react-refresh/cjs/react-refresh-runtime.development"];
const prevRefreshReg = globalThis.$RefreshReg$;
const prevRefreshSig = globalThis.$RefreshSig$ || (() => {
  console.info("no react refresh setup!")
  return (x) => x
});
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

export const transformCommonJs = async (id: string, code: string) => {
  const parser = getParser(id)
  if (!parser) return
  return await transform(code, {
    filename: id,
    swcrc: false,
    configFile: false,
    module: {
      type: 'commonjs',
    },
    sourceMaps: shouldSourceMap(),
    jsc: {
      target: 'es5',
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
