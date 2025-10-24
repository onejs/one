import {
  transform,
  type Output,
  type ParserConfig,
  type Options as SWCOptions,
  type TransformConfig,
} from '@swc/core'
import { extname, sep } from 'node:path'
import { merge } from 'ts-deepmerge'
import { configuration } from './configure'
import { asyncGeneratorRegex, debug, parsers, runtimePublicPath } from './constants'
import type { Options } from './types'

const ignoreId = new RegExp(`node_modules\\${sep}(\\.vite|vite)\\${sep}`)

export async function transformSWC(
  id: string,
  code: string,
  options: Options & { es5?: boolean },
  swcOptions?: SWCOptions
) {
  if (ignoreId.test(id)) {
    return
  }

  id = id
    .split('?')[0]
    // fixes hmr
    .replace(process.cwd(), '')

  if (id === runtimePublicPath) {
    return
  }

  const parser = getParser(id, options.forceJSX)

  if (!parser) {
    return
  }

  const refresh =
    options.environment !== 'ssr' &&
    !options.production &&
    !options.noHMR &&
    !options.forceJSX &&
    !id.includes('node_modules')

  const reactConfig = {
    refresh,
    development: !options.forceJSX && !options.production,
    runtime: 'automatic',
    importSource: 'react',
    ...(configuration.enableNativewind && !id.includes('node_modules')
      ? {
          importSource: 'nativewind',
          // pragma: 'createInteropElement',
          // pragmaFrag: '_InteropFragment',
          // swc doesnt actually change the import right
          // runtime: 'classic',
        }
      : {}),
  } satisfies TransformConfig['react']

  const transformOptions = ((): SWCOptions => {
    if (options.environment === 'client' || options.environment === 'ssr') {
      return {
        sourceMaps: shouldSourceMap(),
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

    const shouldEs5Transform =
      options.es5 || (!process.env.VXRN_USE_BABEL_FOR_GENERATORS && asyncGeneratorRegex.test(code))

    const opts: SWCOptions = shouldEs5Transform
      ? {
          jsc: {
            parser,
            target: 'es5',
            transform: {
              useDefineForClassFields: true,
              react: reactConfig,
            },
          },
        }
      : {
          ...(!options.forceJSX && { env: SWC_ENV }),
          jsc: {
            ...(options.forceJSX && { target: 'esnext' }),
            parser,
            transform: {
              useDefineForClassFields: true,
              react: reactConfig,
            },
          },
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
      ...opts,
    }
  })()

  const finalOptions = merge(
    {
      filename: id,
      swcrc: false,
      configFile: false,
      ...transformOptions,
    },
    swcOptions || {}
  ) satisfies SWCOptions

  const result: Output = await (async () => {
    try {
      debug?.(`transformSWC ${id} using options:\n${JSON.stringify(finalOptions, null, 2)}`)

      return await transform(code, finalOptions)
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

  if (configuration.enableNativeCSS) {
    if (result.code.includes(`createInteropElement(`)) {
      // TODO need to fix sourceMap adding a ';'
      result.code = `import { createInteropElement, Fragment as _InteropFragment } from 'react-native-css-interop/jsx-dev-runtime'\n${result.code}`
    }
  }

  const hasRefreshRuntime = refresh && refreshContentRE.test(result.code)

  // fix for node_modules that ship tsx but don't use type-specific imports
  if (
    options.fixNonTypeSpecificImports ||
    (id.includes('node_modules') && parser.syntax === 'typescript')
  ) {
    // we need to keep fake objects for type exports
    const typeExportsMatch = code.match(/^\s*export\s+type\s+([^\s]+)/gi)
    if (typeExportsMatch) {
      for (const typeExport of Array.from(typeExportsMatch)) {
        const [_export, _type, name] = typeExport.split(/\s+/)
        // FIXME: support `export { ... } from '...'`
        if (name.startsWith('{')) continue

        // FIXME: support `export type Type<T> = ...`
        if (name.includes('<')) continue

        // basic sanity check it isn't exported already
        const alreadyExported = new RegExp(`export (const|let|class|function) ${name}\\s+`).test(
          result.code
        )

        if (!alreadyExported) {
          const fakeExport = `export let ${name} = {};`
          console.info(
            ` ⚠️ Fixing non-type-specific import in node_module, this should be fixed upstream: ${fakeExport} in ${id}`
          )
          result.code += `\n${fakeExport}\n`
        }
      }
    }
  }

  if (result && !options.production && !options.noHMR) {
    return wrapSourceInRefreshRuntime(id, result, options, hasRefreshRuntime)
  }

  return result
}

function wrapSourceInRefreshRuntime(
  id: string,
  result: Output,
  options: Options,
  hasRefreshRuntime: boolean
) {
  if (options.environment === 'ssr') {
    return result
  }
  if (options.environment === 'client') {
    return wrapSourceInRefreshRuntimeWeb(id, result, hasRefreshRuntime)
  }
  return wrapSourceInRefreshRuntimeNative(id, result, options, hasRefreshRuntime)
}

function wrapSourceInRefreshRuntimeWeb(id: string, result: Output, hasRefreshRuntime: boolean) {
  const sourceMap = result.map ? JSON.parse(result.map) : undefined
  if (sourceMap) {
    sourceMap.mappings = ';;' + sourceMap.mappings
  }

  result.code = `import * as RefreshRuntime from "${runtimePublicPath}";

${result.code}`

  if (hasRefreshRuntime) {
    if (sourceMap) {
      sourceMap.mappings = ';;;;;;' + sourceMap.mappings
    }
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

  return { code: result.code, map: sourceMap }
}

function wrapSourceInRefreshRuntimeNative(
  id: string,
  result: Output,
  options: Options,
  hasRefreshRuntime: boolean
) {
  const postfixCode = `if (module.hot) {
  if (module.hot.accept) {
    module.hot.accept((nextExports) => {
      RefreshRuntime.performReactRefresh()
    });
  }
}`

  if (hasRefreshRuntime) {
    // do we need this vite-native-client here? cant we do this on its own?
    const prefixCode = `const RefreshRuntime = __cachedModules["react-refresh/cjs/react-refresh-runtime.development"];
const prevRefreshReg = globalThis.$RefreshReg$;
const prevRefreshSig = globalThis.$RefreshSig$ || (() => {
  console.info("no react refresh setup!")
  return (x) => x
});
globalThis.$RefreshReg$ = (type, id) => RefreshRuntime.register(type, "${id}" + " " + id);
globalThis.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
module.url = '${id}'
module.hot = createHotContext(module.url)`

    const sourceMap = result.map ? JSON.parse(result.map) : undefined

    if (sourceMap) {
      // we need ";" equal to number of lines added to the top
      const prefixLen = prefixCode.split('\n').length + 1
      sourceMap.mappings = new Array(prefixLen).fill(';').join('') + sourceMap.mappings
    }

    return {
      code: `${prefixCode}
${result.code}

if (module.hot) {
  globalThis.$RefreshReg$ = prevRefreshReg;
  globalThis.$RefreshSig$ = prevRefreshSig;
  globalThis['lastHmrExports'] = JSON.stringify(Object.keys(exports))
}

${postfixCode}
`,
      map: sourceMap,
    }
  }

  result.code += postfixCode
  return result
}

const SWC_ENV = {
  targets: {
    node: '4',
  },
  // debug: true,
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
} satisfies SWCOptions['env']

const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/

function shouldSourceMap() {
  return process.env.VXRN_ENABLE_SOURCE_MAP === '1'
}

function getParser(id: string, forceJSX = false) {
  if (id.endsWith('one-entry-native')) {
    return parsers['.tsx']
  }

  const extension = extname(id)
  let parser: ParserConfig = !extension ? parsers['.js'] : parsers[extension]

  if (extension === '.js' || extension === '.mjs') {
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
          refresh: false,
        },
      },
    },
  })
}
