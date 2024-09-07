import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import type { RollupCache } from 'rollup'
import { createBuilder } from 'vite'
import { buildEnvironment } from './fork/vite/build'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { getReactNativeConfig } from './getReactNativeConfig'
import { isBuildingNativeBundle, setIsBuildingNativeBundle } from './isBuildingNativeBundle'
import { resolveFile } from './resolveFile'
import { prebuildReactNativeModules } from './swapPrebuiltReactModules'

const { pathExists } = FSExtra

// used for normalizing hot reloads
export let entryRoot = ''

const cache: Record<string, RollupCache> = {}

export async function getReactNativeBundle(options: VXRNOptionsFilled) {
  entryRoot = options.root

  if (process.env.LOAD_TMP_BUNDLE) {
    // for easier quick testing things:
    const tmpBundle = join(process.cwd(), 'bundle.tmp.js')
    if (await pathExists(tmpBundle)) {
      console.info('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ returning temp bundle ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️', tmpBundle)
      return await readFile(tmpBundle, 'utf-8')
    }
  }

  const vendoredModulesMap = await prebuildReactNativeModules(
    options.cacheDir,
    options.packageVersions
  )

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
  const nativeBuildConfig = await getReactNativeConfig(options)

  const builder = await createBuilder(nativeBuildConfig)

  const environmentName = 'ios' as const
  const environment = builder.environments[environmentName]

  const rollupCacheFile = join(options.cacheDir, `rn-rollup-cache-${environmentName}.json`)

  // See: https://rollupjs.org/configuration-options/#cache
  environment.config.build.rollupOptions.cache =
    cache[environmentName] ||
    (await (async () => {
      // Try to load Rollup cache from disk
      try {
        if (await pathExists(rollupCacheFile)) {
          const c = await FSExtra.readJSON(rollupCacheFile)
          return c
        }
      } catch (e) {
        console.error(`Error loading Rollup cache from ${rollupCacheFile}: ${e}`)
      }

      return null
    })()) ||
    true /* to initially enable Rollup cache */

  // We are using a forked version of the Vite internal function `buildEnvironment` (which is what `builder.build` calls) that will return the Rollup cache object with the build output, and also with some performance improvements.
  const buildOutput = await buildEnvironment(environment.config, environment)
  if (buildOutput.cache) {
    cache[environmentName] = buildOutput.cache

    // do not await cache write
    ;(async () => {
      try {
        await FSExtra.writeJSON(rollupCacheFile, buildOutput.cache)
      } catch (e) {
        console.error(`Error saving Rollup cache to ${rollupCacheFile}: ${e}`)
      }
    })()
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
__require("react-native")
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

  const templateFile = resolveFile('vxrn/react-native-template.js')
  const template = await readFile(templateFile, 'utf-8')

  const specialRequireMap = vendoredModulesMap
    ? `
globalThis.__vxrnPrebuildSpecialRequireMap = {
  'react-native': '${vendoredModulesMap.reactNative}',
  react: '${vendoredModulesMap.react}',
  'react/jsx-runtime': '${vendoredModulesMap.reactJSX}',
  'react/jsx-dev-runtime': '${vendoredModulesMap.reactJSX}',
}
  `
    : ``

  const out = specialRequireMap + template + appCode

  done(out)
  setIsBuildingNativeBundle(null)

  return out
}
