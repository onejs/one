import {
  transform,
  type Output,
  type ParserConfig,
  type Options as SWCOptions,
  type TransformConfig,
} from '@swc/core'
import type { SourceMapPayload } from 'node:module'
import { extname } from 'node:path'
import { configuration } from './configure'
import { asyncGeneratorRegex, debug, parsers, runtimePublicPath } from './constants'
import type { Options } from './types'

export async function transformSWC(id: string, code: string, options: Options & { es5?: boolean }) {
  if (id.includes('.vite')) {
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

  const enableNativeCSS =
    configuration.enableNativeCSS &&
    // temp fix idk why  this error:
    // node_modules/react-native-reanimated/src/component/LayoutAnimationConfig.tsx (19:9): "createInteropElement" is not exported by "../../node_modules/react-native-css-interop/dist/runtime/jsx-dev-runtime.js", imported by "node_modules/react-native-reanimated/src/component/LayoutAnimationConfig.tsx
    !id.includes('node_modules')

  const refresh =
    options.environment === 'ssr' || options.production || options.noHMR ? false : !options.forceJSX

  const reactConfig = {
    refresh,
    development: !options.forceJSX && !options.production,
    runtime: 'automatic',
    importSource: 'react',
    ...(enableNativeCSS
      ? {
          importSource: 'react-native-css-interop',
          pragma: 'createInteropElement',
          // swc doesnt actually change the import right
          runtime: 'classic',
        }
      : {}),
  } satisfies TransformConfig['react']

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

  const finalOptions = {
    filename: id,
    swcrc: false,
    configFile: false,
    ...transformOptions,
  }

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

  if (enableNativeCSS) {
    if (result.code.includes(`createInteropElement`)) {
      result.code = `import { createInteropElement } from 'react-native-css-interop/jsx-dev-runtime'\n${result.code}`
    }
  }

  const shouldHMR = refreshContentRE.test(result.code)

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
            ` ⚠️ Fixing non-type-specifc import in node_module, this should be fixed upstream: ${fakeExport} in ${id}`
          )
          result.code += `\n${fakeExport}\n`
        }
      }
    }
  }

  if (!result || options.noHMR || (!refresh && !shouldHMR)) {
    return result
  }

  wrapSourceInRefreshRuntime(id, result, options, shouldHMR)

  // TODO bring back?
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

function wrapSourceInRefreshRuntime(
  id: string,
  result: Output,
  options: Options,
  shouldHMR: boolean
) {
  if (options.environment === 'client' || options.environment === 'ssr') {
    return wrapSourceInRefreshRuntimeWeb(id, result, shouldHMR)
  }
  return wrapSourceInRefreshRuntimeNative(id, result, options, shouldHMR)
}

function wrapSourceInRefreshRuntimeWeb(id: string, result: Output, shouldHMR: boolean) {
  const sourceMap: SourceMapPayload = JSON.parse(result.map!)
  sourceMap.mappings = ';;' + sourceMap.mappings

  result.code = `import * as RefreshRuntime from "${runtimePublicPath}";

${result.code}`

  if (shouldHMR) {
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
  shouldHMR: boolean
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

  if (shouldHMR) {
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
          refresh: false,
        },
      },
    },
  })
}
