import {
  transform,
  type ModuleConfig,
  type Output,
  type ParserConfig,
  type ReactConfig,
  type Options as SWCOptions,
} from '@swc/core'
import type { SourceMapPayload } from 'node:module'
import { extname } from 'node:path'
import type { Options } from './types'
import { debug } from './constants'

const SHARED_MODULE_CONFIG = {
  importInterop: 'none',
} satisfies Partial<ModuleConfig>

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

export const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/

export function shouldSourceMap() {
  return process.env.VXRN_ENABLE_SOURCE_MAP === '1'
}

export async function transformSWC(_id: string, code: string, options: Options) {
  const id = _id.split('?')[0].replace(process.cwd(), '')

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

const transformWithOptions = async (
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

    debug?.(`transformSWC ${id} using ${parser}`)

    result = await transform(code, transformOptions)
  } catch (e: any) {
    console.info(
      `SWC failed to transform file, but sometimes this is fine so continuing... Please report: ${id} ${e.message}`
    )

    return { code }
  }

  return result
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
