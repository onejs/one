import * as babel from '@babel/core'
import createViteFlow from '@vxrn/vite-flow'
import viteReactPlugin from '@vxrn/vite-native-swc'
import type { Plugin } from 'vite'
import { type UserConfig, resolveConfig, transformWithEsbuild, type InlineConfig } from 'vite'
import { nativeExtensions } from '../constants'
import { reactNativeCommonJsPlugin } from '../plugins/reactNativeCommonJsPlugin'
import { getOptimizeDeps } from './getOptimizeDeps'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { basename } from 'node:path'
import { swapPrebuiltReactModules } from './swapPrebuiltReactModules'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { rollup } from 'rollup'
import { dedupe } from './getBaseViteConfig'

export async function getReactNativeConfig(options: VXRNOptionsFilled, viteRNClientPlugin: any) {
  const { root, port } = options
  const { optimizeDeps } = getOptimizeDeps('build')

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

  // const alias = {
  //   'react/jsx-runtime': import.meta.resolve('vxrn/react-jsx-runtime-18').replace('file://', ''),
  //   'react/jsx-dev-runtime': import.meta
  //     .resolve('vxrn/react-jsx-dev-runtime-18')
  //     .replace('file://', ''),
  //   'react-dom': import.meta.resolve('vxrn/react-dom-18').replace('file://', ''),
  //   react: import.meta.resolve('vxrn/react-18').replace('file://', ''),
  // }

  const vendorFilenames = new Set([
    'react-jsx-dev-runtime.development.js',
    'react.development.js',
    'react-dom.development.js',
    'react-jsx-runtime.development.js',
  ])

  async function optimizeWithRollup(code: string, id: string) {
    const inputOptions = {
      input: id,
      plugins: [nodeResolve(), commonjs()],
    }
    const bundle = await rollup(inputOptions)
    const { output } = await bundle.generate({
      format: 'es',
    })
    const optimizedCode = output[0].code

    await bundle.close()

    return optimizedCode
  }

  // build app
  let nativeBuildConfig = {
    plugins: [
      viteFlow,

      swapPrebuiltReactModules(),

      // lol realized this is already done here ^
      // {
      //   name: 'use-react-18 for native',
      //   enforce: 'pre',

      //   // we gotta manually do the es conversion
      //   async transform(code, id) {
      //     const name = basename(id)
      //     if (vendorFilenames.has(name)) {
      //       const codeOut = await optimizeWithRollup(code, id)
      //       return {
      //         code: codeOut,
      //       }
      //     }
      //   },

      //   async config() {
      //     return {
      //       resolve: {
      //         dedupe: [...Object.keys(alias), ...Object.values(alias)],
      //         alias,
      //       },
      //     } satisfies InlineConfig
      //   },
      // } satisfies Plugin,

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
      ...optimizeDeps,
      esbuildOptions: {
        jsx: 'automatic',
      },
    },

    resolve: {
      dedupe: dedupe,
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

  return nativeBuildConfig satisfies UserConfig
}
