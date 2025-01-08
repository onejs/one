import { transform, type Output, type ParserConfig, type Options as SWCOptions } from '@swc/core'
import type { SourceMapPayload } from 'node:module'
import { extname } from 'node:path'
import { debug } from './constants'
import type { Options } from './types'

export async function transformSWC(_id: string, code: string, options: Options) {
  const id = _id.split('?')[0].replace(process.cwd(), '')

  const parser = getParser(id, options.forceJSX)
  if (!parser) return

  const refresh = options.production || options.noHMR ? false : !options.forceJSX
  const reactConfig = {
    refresh,
    development: !options.forceJSX && !options.production,
    runtime: 'automatic',
    importSource: 'react',
  } as const

  const transformOptions = ((): SWCOptions => {
    if (options.environment === 'client' || options.environment === 'ssr') {
      return {
        sourceMaps: true,
        jsc: {
          target: 'es2020',
          parser,
          transform: {
            useDefineForClassFields: true,
            react: reactConfig,
          },
        },
      }
    }

    return {
      module: {
        importInterop: 'none',
        type: 'nodenext',
      },
      ...(options.mode === 'serve-cjs' && {
        module: {
          importInterop: 'none',
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
    }
  })()

  let result: Output = await (async () => {
    try {
      debug?.(`transformSWC ${id} using ${parser}`)

      return await transform(code, {
        filename: id,
        swcrc: false,
        configFile: false,
        sourceMaps: shouldSourceMap(),
        ...transformOptions,
      })
    } catch (e: any) {
      console.info(
        `SWC failed to transform file, but sometimes this is fine so continuing... Please report: ${id} ${e.message}`
      )

      return { code }
    }
  })()

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

const SWC_ENV = {
  targets: {
    node: '4',
  },
  include: [],
  exclude: [
    'transform-spread',
    'transform-destructuring',
    'transform-object-rest-spread',
    'transform-async-to-generator',
    'transform-regenerator',
  ],
}

const parsers: Record<string, ParserConfig> = {
  '.tsx': { syntax: 'typescript', tsx: true, decorators: true },
  '.ts': { syntax: 'typescript', tsx: false, decorators: true },
  '.jsx': { syntax: 'ecmascript', jsx: true },
  '.js': { syntax: 'ecmascript' },
  '.mdx': { syntax: 'ecmascript', jsx: true },
}

const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/

function shouldSourceMap() {
  return process.env.VXRN_ENABLE_SOURCE_MAP === '1'
}

function wrapSourceInRefreshRuntime(id: string, code: string, options: Options) {
  const prefixCode =
    options.mode === 'build'
      ? `
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

  if (code.includes('RefreshRuntime = __cachedModules')) {
    console.warn('[wrapSourceInRefreshRuntime] detected refresh runtime already in code, skipping')
    return code
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

function getParser(id: string, forceJSX = false) {
  if (id.endsWith('one-entry-native')) {
    return parsers['.tsx']
  }

  const extension = extname(id)
  let parser: ParserConfig = !extension ? parsers['.js'] : parsers[extension]

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
export const transformSWCStripJSX = async (id: string, code: string) => {
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
