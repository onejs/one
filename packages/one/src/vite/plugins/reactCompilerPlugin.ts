import babel from '@babel/core'
import { relative } from 'node:path'
import type { Plugin } from 'vite'

export const createReactCompilerPlugin = (root: string): Plugin => {
  const getBabelConfig = (target: '18' | '19') => ({
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-typescript'],
    plugins: [['babel-plugin-react-compiler', { target }]],
  })

  const filter = /.*(.tsx?)$/

  return {
    name: `one:react-compiler`,
    enforce: 'pre',

    async transform(codeIn, id) {
      const shouldTransform = filter.test(id)
      if (!shouldTransform) return
      const env = this.environment.name
      const target = env === 'ios' || env === 'android' ? '18' : '19'

      if (codeIn.startsWith('// disable-compiler')) {
        return
      }

      const result = await babel.transformAsync(codeIn, { filename: id, ...getBabelConfig(target) })
      const code = result?.code ?? ''

      if (code.includes(target === '18' ? `react-compiler-runtime` : `react/compiler-runtime`)) {
        console.info(` 🪄 ${relative(root, id)}`)
      }

      return { code, map: result?.map }
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
