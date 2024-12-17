import babel from '@babel/core'
import fs from 'node:fs'
import { extname } from 'node:path'
import type { Plugin } from 'vite'

export const createReactCompilerPlugin = (): Plugin => {
  const babelConfig = {
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-typescript'],
    plugins: [['babel-plugin-react-compiler', { target: '19' }]],
  }

  const filter = /.*(.tsx?)$/

  return {
    name: `one:react-compiler`,
    enforce: 'pre',

    async transform(code, id) {
      const shouldTransform = filter.test(id)
      if (!shouldTransform) return
      const result = await babel.transformAsync(code, { filename: id, ...babelConfig })
      return { code: result?.code ?? '', map: result?.map }
    },

    // this is only useful for deps optimization but in general we just want app
    // config() {
    //   return {
    //     optimizeDeps: {
    //       esbuildOptions: {
    //         plugins: [
    //           {
    //             name: 'babel',
    //             setup(build) {
    //               build.onLoad({ filter }, async (args) => {
    //                 const ext = extname(args.path)
    //                 const contents = await fs.promises.readFile(args.path, 'utf8')
    //                 const babelOptions = babel.loadOptions({
    //                   filename: args.path,
    //                   ...babelConfig,
    //                   caller: {
    //                     name: 'esbuild-plugin-babel',
    //                     supportsStaticESM: true,
    //                   },
    //                 })
    //                 if (!babelOptions) {
    //                   throw new Error(`invali`)
    //                 }
    //                 const result = await babel.transformAsync(contents, babelOptions)

    //                 return {
    //                   contents: result?.code ?? '',
    //                   loader: ext === 'tsx' ? 'tsx' : 'ts',
    //                 }
    //               })
    //             },
    //           },
    //         ],
    //       },
    //     },
    //   }
    // },
  }
}
