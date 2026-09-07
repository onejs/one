import { extname } from 'node:path'
import { normalizePath } from 'vite'
import { configuration } from './configure'
import { asyncGeneratorRegex, debug, runtimePublicPath } from './constants'
import type { Options } from './types'

export interface Output {
  code: string
  map?: any
}

// posix-only — id is normalized below
const ignoreId = /node_modules\/(\.vite|vite)\//

export async function transformSWC(
  id: string,
  code: string,
  options: Options & { es5?: boolean },
  swcOptions?: any
): Promise<Output | undefined> {
  // unify caller contracts (Vite plugin: POSIX id; patches.ts: native id)
  id = normalizePath(id.split('?')[0]).replace(normalizePath(process.cwd()), '')

  if (ignoreId.test(id)) {
    return
  }

  if (id === runtimePublicPath) {
    return
  }

  const lang = getLang(id, options.forceJSX)
  if (!lang) {
    return
  }

  const refresh =
    options.environment !== 'ssr' &&
    !options.production &&
    !options.noHMR &&
    !options.forceJSX &&
    !id.includes('node_modules')

  const importSource =
    configuration.enableNativewind && !id.includes('node_modules')
      ? 'nativewind'
      : 'react'

  const shouldEs5Transform =
    options.es5 ||
    (!process.env.VXRN_USE_BABEL_FOR_GENERATORS && asyncGeneratorRegex.test(code))

  const target = shouldEs5Transform ? 'es2015' : 'es2020'
  const sourceMaps =
    swcOptions?.sourceMaps !== undefined
      ? Boolean(swcOptions.sourceMaps)
      : shouldSourceMap()

  const oxcOptions: import('oxc-transform').TransformOptions = {
    lang,
    target,
    assumptions: {
      setPublicClassFields: true,
      ...(swcOptions?.assumptions || {}),
    },
    sourcemap: sourceMaps,
    jsx: {
      runtime: 'automatic',
      development: !options.forceJSX && !options.production,
      refresh: Boolean(refresh),
      importSource,
    },
  }

  const { transformSync } = await import('oxc-transform')

  const result: Output = (() => {
    try {
      debug?.(
        `transformSWC (oxc) ${id} using options:\n${JSON.stringify(oxcOptions, null, 2)}`
      )

      const res = transformSync(id, code, oxcOptions)
      if (res.errors?.length) {
        const err = res.errors[0]
        const error: any = new Error(
          err.message + (err.codeframe ? `\n${err.codeframe}` : '')
        )
        if (err.labels?.[0]) {
          error.start = err.labels[0].start
          error.end = err.labels[0].end
        }
        throw error
      }
      return {
        code: res.code,
        map: res.map,
      }
    } catch (e: any) {
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
    (id.includes('node_modules') && (lang === 'ts' || lang === 'tsx'))
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
        const alreadyExported = new RegExp(
          `export (const|let|class|function) ${name}\\s+`
        ).test(result.code)

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

export const transformOxc = transformSWC

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

function wrapSourceInRefreshRuntimeWeb(
  id: string,
  result: Output,
  hasRefreshRuntime: boolean
) {
  const sourceMap = result.map
    ? typeof result.map === 'string'
      ? JSON.parse(result.map)
      : { ...result.map }
    : undefined
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

    const sourceMap = result.map
      ? typeof result.map === 'string'
        ? JSON.parse(result.map)
        : { ...result.map }
      : undefined

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

const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/

export function shouldSourceMap() {
  return process.env.VXRN_ENABLE_SOURCE_MAP === '1'
}

function getLang(id: string, forceJSX = false): 'js' | 'jsx' | 'ts' | 'tsx' | undefined {
  if (id.endsWith('one-entry-native')) {
    return 'tsx'
  }

  const extension = extname(id)

  if (extension === '.tsx') return 'tsx'
  if (extension === '.ts') return 'ts'
  if (extension === '.jsx' || extension === '.mdx') return 'jsx'
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    if (forceJSX || id.includes('expo-modules-core')) {
      return 'jsx'
    }
    return 'js'
  }

  if (!extension) {
    return forceJSX ? 'jsx' : 'js'
  }

  return undefined
}

export const transformSWCStripJSX = async (id: string, code: string) => {
  const lang = getLang(id)
  if (!lang) return

  const { transformSync } = await import('oxc-transform')
  const res = transformSync(id, code, {
    lang,
    target: 'es2020',
    assumptions: {
      setPublicClassFields: true,
    },
    sourcemap: shouldSourceMap(),
    jsx: {
      runtime: 'automatic',
      development: true,
      refresh: false,
    },
  })

  if (res.errors?.length) {
    const err = res.errors[0]
    throw new Error(err.message + (err.codeframe ? `\n${err.codeframe}` : ''))
  }

  return { code: res.code, map: res.map as any }
}

export const transformOxcStripJSX = transformSWCStripJSX
