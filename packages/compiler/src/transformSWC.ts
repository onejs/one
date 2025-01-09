import { transform, type Output, type ParserConfig, type Options as SWCOptions } from '@swc/core'
import type { SourceMapPayload } from 'node:module'
import { extname } from 'node:path'
import { debug, runtimePublicPath } from './constants'
import type { Options } from './types'

export async function transformSWC(_id: string, code: string, options: Options) {
  const id = _id.split('?')[0]

  if (id === runtimePublicPath) {
    return
  }

  const parser = getParser(id, options.forceJSX)
  if (!parser) return

  const refresh =
    options.environment === 'ssr' || options.production || options.noHMR ? false : !options.forceJSX

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
      sourceMaps: shouldSourceMap(),
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
        ...transformOptions,
      })
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
  })()

  const hasRefresh = refreshContentRE.test(result.code)

  if (!result || (!refresh && !hasRefresh)) {
    return result
  }

  wrapSourceInRefreshRuntime(id, result, options, hasRefresh)

  // if (result.map) {
  //   const sourceMap: SourceMapPayload = JSON.parse(result.map)
  //   sourceMap.mappings = ';;;;;;;;' + sourceMap.mappings
  //   return { code: result.code, map: sourceMap }
  // }

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

function wrapSourceInRefreshRuntime(
  id: string,
  result: Output,
  options: Options,
  hasRefresh: boolean
) {
  if (options.environment === 'client' || options.environment === 'ssr') {
    return wrapSourceInRefreshRuntimeWeb(id, result, hasRefresh)
  }
  return wrapSourceInRefreshRuntimeNative(id, result, options, hasRefresh)
}

function wrapSourceInRefreshRuntimeWeb(id: string, result: Output, hasRefresh: boolean) {
  const sourceMap: SourceMapPayload = JSON.parse(result.map!)
  sourceMap.mappings = ';;' + sourceMap.mappings

  result.code = `import * as RefreshRuntime from "${runtimePublicPath}";

${result.code}`

  if (hasRefresh) {
    sourceMap.mappings = ';;;;;;' + sourceMap.mappings
    result.code = `if (!window.$RefreshReg$) throw new Error("React refresh preamble was not loaded. Something is wrong.");
const prevRefreshReg = window.$RefreshReg$;
const prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${id}");
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

${result.code}

window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
`
  }

  result.code += `
RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
  RefreshRuntime.registerExportsForReactRefresh("${id}", currentExports);
  import.meta.hot.accept((nextExports) => {
    if (!nextExports) return;
    const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("${id}", currentExports, nextExports);
    if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
  });
});
`
}

function wrapSourceInRefreshRuntimeNative(
  id: string,
  result: Output,
  options: Options,
  hasRefresh: boolean
) {
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
${result.code}
`
  }

  // can probably remove havent seen this
  if (result.code.includes('RefreshRuntime = __cachedModules')) {
    console.warn(
      '‼️ [wrapSourceInRefreshRuntime] detected refresh runtime already in code, skipping'
    )
    return result.code
  }

  if (hasRefresh) {
    result.code = `const RefreshRuntime = __cachedModules["react-refresh/cjs/react-refresh-runtime.development"];
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

${result.code}

  if (module.hot) {
    globalThis.$RefreshReg$ = prevRefreshReg;
    globalThis.$RefreshSig$ = prevRefreshSig;
    globalThis['lastHmrExports'] = JSON.stringify(Object.keys(exports))
  }
`
  }

  result.code = `${result.code}

if (module.hot) {
  if (module.hot.accept) {
    module.hot.accept((nextExports) => {
      RefreshRuntime.performReactRefresh()
    });
  }
}`
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
