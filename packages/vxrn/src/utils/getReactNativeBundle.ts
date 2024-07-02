import * as babel from '@babel/core'
import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { createBuilder } from 'vite'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { getReactNativeConfig } from './getReactNativeConfig'
import { isBuildingNativeBundle, setIsBuildingNativeBundle } from './isBuildingNativeBundle'
import { resolveFile } from './resolveFile'
import { getPrebuilds, prebuildReactNativeModules } from './swapPrebuiltReactModules'

const { pathExists } = FSExtra

// used for normalizing hot reloads
export let entryRoot = ''

export async function getReactNativeBundle(options: VXRNOptionsFilled, viteRNClientPlugin: any) {
  const { root, port, cacheDir } = options
  const { depsToOptimize, needsInterop } = getOptimizeDeps('build')

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

  async function babelReanimated(input: string, filename: string) {
    return await new Promise<string>((res, rej) => {
      babel.transform(
        input,
        {
          plugins: ['react-native-reanimated/plugin'],
          filename,
        },
        (err: any, result) => {
          if (!result || err) rej(err || 'no res')
          res(result!.code!)
        }
      )
    })
  }

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

        if (outputModule.isEntry) {
          entryRoot = dirname(id)
        }

        return `
// fileName: ${id}
// name: ${outputModule.name}
// facadeModuleId: ${outputModule.facadeModuleId}
___modules___["${id}"] = ((exports, module) => {
const require = createRequire("${id}", ${JSON.stringify(importsMap, null, 2)})

${outputModule.code}
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
