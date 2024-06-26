import * as babel from '@babel/core'
import createViteFlow from '@vxrn/vite-flow'
import viteReactPlugin from '@vxrn/vite-native-swc'
import FSExtra from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { createBuilder, resolveConfig, transformWithEsbuild, type InlineConfig } from 'vite'
import { nativeExtensions } from '../constants'
import { reactNativeCommonJsPlugin } from '../plugins/reactNativeCommonJsPlugin'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { isBuildingNativeBundle, setIsBuildingNativeBundle } from './isBuildingNativeBundle'
import { resolveFile } from './resolveFile'
import { swapPrebuiltReactModules } from './swapPrebuiltReactModules'

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

  const viteFlow = options.flow ? createViteFlow(options.flow) : null

  // build app
  let nativeBuildConfig = {
    plugins: [
      viteFlow,

      swapPrebuiltReactModules(cacheDir),

      {
        name: 'reanimated',
        async transform(code, id) {
          if (code.includes('worklet')) {
            const out = await babelReanimated(code, id)
            return out
          }
        },
      },

      viteRNClientPlugin,

      reactNativeCommonJsPlugin({
        root,
        port,
        mode: 'build',
      }),

      viteReactPlugin({
        tsDecorators: true,
        mode: 'build',
      }),

      {
        name: 'treat-js-files-as-jsx',
        async transform(code, id) {
          if (!id.includes(`expo-status-bar`)) return null
          // Use the exposed transform from vite, instead of directly
          // transforming with esbuild
          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic',
          })
        },
      },
    ].filter(Boolean),

    appType: 'custom',
    root,
    clearScreen: false,

    optimizeDeps: {
      include: depsToOptimize,
      needsInterop,
      esbuildOptions: {
        jsx: 'automatic',
      },
    },

    resolve: {
      extensions: nativeExtensions,
    },

    mode: 'development',

    define: {
      'process.env.NODE_ENV': `"development"`,
    },

    build: {
      ssr: false,
      minify: false,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        input: options.entries.native,
        treeshake: false,
        preserveEntrySignatures: 'strict',
        output: {
          preserveModules: true,
          format: 'cjs',
        },
      },
    },
  } satisfies InlineConfig

  // TODO
  // if (options.nativeConfig) {
  //   nativeBuildConfig = mergeConfig(nativeBuildConfig, options.nativeConfig) as any
  // }

  // // this fixes my swap-react-native plugin not being called pre 😳
  await resolveConfig(nativeBuildConfig, 'build')

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

  // TODO this is not stable based on cwd
  const appRootParent = join(root, '..', '..')

  const prebuilds = {
    reactJSX: join(cacheDir, 'react-jsx-runtime.js'),
    react: join(cacheDir, 'react.js'),
    reactNative: join(cacheDir, 'react-native.js'),
  }

  const templateFile = resolveFile('vxrn/react-native-template.js')
  const template = (await readFile(templateFile, 'utf-8'))
    .replace('_virtual/virtual_react-native.js', relative(appRootParent, prebuilds.reactNative))
    .replace('_virtual/virtual_react.js', relative(appRootParent, prebuilds.react))
    .replaceAll('_virtual/virtual_react-jsx.js', relative(appRootParent, prebuilds.reactJSX))

  const out = template + appCode

  done(out)
  setIsBuildingNativeBundle(null)

  return out
}
