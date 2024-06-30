import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { createBuilder, type UserConfig } from 'vite'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { isBuildingNativeBundle, setIsBuildingNativeBundle } from './isBuildingNativeBundle'
import { resolveFile } from './resolveFile'

const { pathExists } = FSExtra

// used for normalizing hot reloads
export let entryRoot = ''

export async function getReactNativeBundle(
  options: VXRNOptionsFilled,
  nativeBuildConfig: UserConfig
) {
  const { root, cacheDir } = options

  if (process.env.LOAD_TMP_BUNDLE) {
    // for easier quick testing things:
    const tmpBundle = join(process.cwd(), 'bundle.tmp.js')
    if (await pathExists(tmpBundle)) {
      console.info('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ returning temp bundle ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️', tmpBundle)
      return await readFile(tmpBundle, 'utf-8')
    }
  }

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

  const builder = await createBuilder(nativeBuildConfig)

  const buildOutput = await builder.build(builder.environments.ios)

  if (!('output' in buildOutput)) {
    throw `❌`
  }

  let appCode = buildOutput.output
    // entry last
    .sort((a, b) => (a['isEntry'] ? 1 : -1))
    .map((outputModule) => {
      if (outputModule.type == 'chunk') {
        const importsMap = {
          currentPath: outputModule.fileName,
        }
        for (const imp of outputModule.imports) {
          const relativePath = relative(dirname(outputModule.fileName), imp)
          importsMap[relativePath[0] === '.' ? relativePath : './' + relativePath] = imp
        }

        if (outputModule.isEntry) {
          entryRoot = dirname(outputModule.fileName)
        }

        return `
// fileName: ${outputModule.fileName}
// name: ${outputModule.name}
// facadeModuleId: ${outputModule.facadeModuleId}
___modules___["${outputModule.fileName}"] = ((exports, module) => {
const require = createRequire(${JSON.stringify(importsMap, null, 2)})

${outputModule.code}
})

${
  outputModule.isEntry
    ? `
// run entry
const __require = createRequire({})
__require("react-native")
__require("${outputModule.fileName}")
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

  const prebuilds = {
    reactJSX: join(cacheDir, 'react-jsx-runtime.js'),
    react: join(cacheDir, 'react.js'),
    reactNative: join(cacheDir, 'react-native.js'),
  }

  const templateFile = resolveFile('vxrn/react-native-template.js')
  const template = (await readFile(templateFile, 'utf-8'))

    // TODO this is not stable based on cwd
    .replace('_virtual/virtual_react-native.js', relative(root, prebuilds.reactNative))
    .replace('_virtual/virtual_react.js', relative(root, prebuilds.react))
    .replaceAll('_virtual/virtual_react-jsx.js', relative(root, prebuilds.reactJSX))

  const out = template + appCode

  done(out)
  setIsBuildingNativeBundle(null)

  return out
}
