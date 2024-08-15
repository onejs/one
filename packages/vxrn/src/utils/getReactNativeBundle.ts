import * as babel from '@babel/core'
import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { createBuilder } from 'vite'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { getReactNativeConfig } from './getReactNativeConfig'
import { isBuildingNativeBundle, setIsBuildingNativeBundle } from './isBuildingNativeBundle'
import { resolveFile } from './resolveFile'
import { getPrebuilds, prebuildReactNativeModules } from './swapPrebuiltReactModules'

const { pathExists } = FSExtra

// used for normalizing hot reloads
export let entryRoot = ''

export async function getReactNativeBundle(options: VXRNOptionsFilled, viteRNClientPlugin: any) {
  entryRoot = options.root

  if (process.env.LOAD_TMP_BUNDLE) {
    // for easier quick testing things:
    const tmpBundle = join(process.cwd(), 'bundle.tmp.js')
    if (await pathExists(tmpBundle)) {
      console.info('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ returning temp bundle ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️', tmpBundle)
      return await readFile(tmpBundle, 'utf-8')
    }
  }

  await prebuildReactNativeModules(options.cacheDir)

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
  const nativeBuildConfig = await getReactNativeConfig(options, viteRNClientPlugin)

  const builder = await createBuilder(nativeBuildConfig)

  const buildOutput = await builder.build(builder.environments.ios)

  if (!('output' in buildOutput)) {
    throw `❌`
  }

  let appCode = buildOutput.output
    // entry last
    .sort((a, b) => (a['isEntry'] ? 1 : -1))
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
  const prebuilds = getPrebuilds(options.cacheDir)
  const template = await readFile(templateFile, 'utf-8')

  // TODO this is not stable based on cwd
  // .replace('_virtual/virtual_react-native.js', relative(root, prebuilds.reactNative))
  // .replace('_virtual/virtual_react.js', relative(root, prebuilds.react))
  // .replaceAll('_virtual/virtual_react-jsx.js', relative(root, prebuilds.reactJSX))

  const out = template + appCode

  done(out)
  setIsBuildingNativeBundle(null)

  return out
}
