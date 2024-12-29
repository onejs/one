import FSExtra, { ensureFile } from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import type { RollupCache } from 'rollup'
import { createBuilder } from 'vite'
// import { buildEnvironment } from './fork/vite/build'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { getReactNativeConfig } from './getReactNativeConfig'
import { isBuildingNativeBundle, setIsBuildingNativeBundle } from './isBuildingNativeBundle'
import { prebuildReactNativeModules } from './swapPrebuiltReactModules'
import { resolvePath } from '@vxrn/resolve'
import { filterPluginsForNative } from './filterPluginsForNative'

const { pathExists } = FSExtra

// used for normalizing hot reloads
export let entryRoot = ''

let cachedReactNativeBundles: Record<string, string | undefined> = {}

export function clearCachedBundle() {
  cachedReactNativeBundles = {}
}

const cache: Record<string, RollupCache> = {}

export async function getReactNativeBundle(
  options: VXRNOptionsFilled,
  platform: 'ios' | 'android',
  internal: { mode?: 'dev' | 'prod'; assetsDest?: string; useCache?: boolean } = {
    mode: 'dev',
    useCache: true,
  }
) {
  entryRoot = options.root

  const cached = cachedReactNativeBundles[platform]
  if (cached && !process.env.VXRN_DISABLE_CACHE) {
    return cached
  }

  await prebuildReactNativeModules(options.cacheDir, {
    // TODO: a better way to pass the mode (dev/prod) to PrebuiltReactModules
    mode: internal.mode,
  })

  if (isBuildingNativeBundle) {
    const res = await isBuildingNativeBundle
    return res
  }

  let done
  setIsBuildingNativeBundle(
    new Promise((res) => {
      done = res
    })
  )

  // build app
  const nativeBuildConfig = await getReactNativeConfig(options, internal, platform)

  nativeBuildConfig.plugins = filterPluginsForNative(nativeBuildConfig.plugins, { isNative: true })

  // instrument plugins:
  const buildStats: Record<string, number> = {}
  if (process.env.ONE_DEBUG_BUILD_PERF) {
    nativeBuildConfig.plugins = nativeBuildConfig.plugins.map((plugin) => {
      return new Proxy(plugin, {
        get(target, key) {
          const value = Reflect.get(target, key)
          // wrap with instrumentation
          if (typeof value === 'function') {
            return function (this, ...args) {
              const name = `${plugin.name}:${key as any}`
              const start = performance.now()
              const logEnd = () => {
                buildStats[name] ||= 0
                buildStats[name] += performance.now() - start
              }
              const out = value.call(this, ...args)
              if (out instanceof Promise) {
                return out
                  .then((val) => {
                    logEnd()
                    return val
                  })
                  .catch((err) => {
                    logEnd()
                    throw err
                  })
              }
              logEnd()
              return out
            }
          }
          return value
        },
      })
    })
  }

  const builder = await createBuilder(nativeBuildConfig)

  const environment = builder.environments[platform]

  // We are using a forked version of the Vite internal function `buildEnvironment` (which is what `builder.build` calls) that will return the Rollup cache object with the build output, and also with some performance improvements.
  // disabled due to differences in vite 6 stable upgrade

  const buildOutput = await builder.build(environment)

  if (process.env.ONE_DEBUG_BUILD_PERF) {
    console.info(JSON.stringify(buildStats, null, 2))
  }

  if (!('output' in buildOutput)) {
    throw `❌`
  }

  let appCode = buildOutput.output
    // entry last
    .sort((a, b) => (a['isEntry'] ? 1 : a['fileName'].localeCompare(b['fileName']) + -2))
    .map((outputModule) => {
      const id = outputModule.fileName.replace(/.*node_modules\//, '')

      if (outputModule.type == 'chunk') {
        const importsMap = {}
        for (const imp of outputModule.imports) {
          const relativePath = relative(dirname(id), imp)
          importsMap[relativePath[0] === '.' ? relativePath : './' + relativePath] = imp.replace(
            /.*node_modules\//,
            ''
          )
        }

        let code = outputModule.code

        // A hacky way to exclude node-fetch from the bundle.
        //
        // Some part of Supabase SDK will import node-fetch statically (https://github.com/supabase/supabase-js/blob/v2.45.1/src/lib/fetch.ts#L2), or dynamically (https://github.com/supabase/auth-js/blob/8222ee198a0ab10570e8b4c31ffb2aeafef86392/src/lib/helpers.ts#L99), causing the node-fetch to be included in the bundle, and while imported statically it will throw a runtime error when running on React Native.
        if (outputModule.facadeModuleId?.includes('@supabase/node-fetch')) {
          // This should be safe since the imported '@supabase/node-fetch' will not actually be used in Supabase SDK as there's already a global `fetch` in React Native.
          code = ''
        }

        if (id.startsWith('.vxrn/react-native')) {
          // Turn eager imports of RN back into dynamic lazy imports.
          // We needed them eager so rollup won't be unhappy with missing exports, but now we need them lazy again to match the original RN behavior, which may avoid some issues. Such as:
          // * react-native v0.76 with: Codegen didn't run for RNCSafeAreaView. This will be an error in the future. Make sure you are using @react-native/babel-preset when building your JavaScript code.
          code = code
            .replace(
              // Step 1: Replace the whole `exports` block which contains `exports.REACT_NATIVE_ESM_MANUAL_EXPORTS_` with `module.exports = RN;`
              /(^exports.+$\s)*(^exports\.REACT_NATIVE_ESM_MANUAL_EXPORTS_.+$\s)(^exports.+$\s)*/m,
              'module.exports = RN;'
            )
            .replace(
              // Step 2: Remove other unnecessary `var thing = RN.thing;` lines
              /^.*REACT_NATIVE_ESM_MANUAL_EXPORTS_START[\s\S]*REACT_NATIVE_ESM_MANUAL_EXPORTS_END.*$/m,
              ''
            )
        }

        return `
// id: ${id}
// name: ${outputModule.name}
// facadeModuleId: ${outputModule.facadeModuleId}
// fileName: ${outputModule.fileName}
___vxrnAbsoluteToRelative___["${outputModule.facadeModuleId}"] = "${id}"
___modules___["${id}"] = ((exports, module) => {
const require = createRequire("${id}", ${JSON.stringify(importsMap, null, 2)})

${code}
})

${
  outputModule.isEntry
    ? `
// run entry
const __require = createRequire(":root:", {})
globalThis.ReactNative = __require("react-native")
globalThis.React = __require("react")
__require("${id}")
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
    // TEMP FIX for router tamagui thing since expo router 3 upgrade
    .replaceAll('dist/esm/index.mjs"', 'dist/esm/index.js"')

  const template = (await getReactNativeTemplate(internal.mode || 'dev')).replaceAll(
    '__VXRN_PLATFORM__',
    `"${platform}"`
  )

  const out = template + appCode

  cachedReactNativeBundles[platform] = out
  done(out)
  setIsBuildingNativeBundle(null)

  return out
}

/**
 * Get `react-native-template.js` with some `process.env.*` replaced with static values.
 */
async function getReactNativeTemplate(mode: 'dev' | 'prod') {
  const templateFile = resolvePath('vxrn/react-native-template.js')
  let template = await readFile(templateFile, 'utf-8')

  template = template.replace(/process\.env\.__DEV__/g, mode === 'dev' ? 'true' : 'false')

  if (mode === 'prod') {
    // `process` might not available in release runtime
    template = template.replace(/process\.env\.DEBUG/g, 'undefined')
  }

  return template
}
