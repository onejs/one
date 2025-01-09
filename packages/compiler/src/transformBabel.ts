import { relative } from 'node:path'
import type { Plugin } from 'vite'
import babel from '@babel/core'
import { configuration } from './configure'
import { asyncGeneratorRegex, debug } from './constants'

type BabelPlugins = babel.TransformOptions['plugins']

export type TransformBabelOptions = {
  reactCompiler?: boolean
  reanimated?: boolean
  getUserPlugins?: GetBabelConfig
}

export type TransformBabelProps = TransformBabelOptions & {
  id: string
  code: string
  development: boolean
}

export type GetBabelConfig = (
  id: string,
  code: string
) =>
  | boolean
  | {
      plugins: Exclude<BabelPlugins, null | undefined>
      excludeDefaultPlugins?: boolean
    }

export async function transformWithBabelIfNeeded(props: TransformBabelProps) {
  const babelPlugins = getBabelPlugins(props)
  if (babelPlugins?.length) {
    debug?.(`transformBabel: ${props.id}`)
    return await transformBabel(props, babelPlugins)
  }
}

function getBabelPlugins({
  getUserPlugins,
  id,
  code,
  development,
}: TransformBabelProps): BabelPlugins {
  const userPlugins = getUserPlugins?.(id, code)
  if (typeof userPlugins !== 'undefined') {
    if (userPlugins === true) {
      return getDefaultBabelPlugins(id, code, development, true)
    }
    if (userPlugins === false) {
      return null
    }
    if (userPlugins.excludeDefaultPlugins) {
      return userPlugins.plugins
    }
    return [getDefaultBabelPlugins(id, code, development), ...userPlugins.plugins]
  }
  return getDefaultBabelPlugins(id, code, development)
}

/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
async function transformBabel(
  { id, code, development }: TransformBabelProps,
  plugins: babel.TransformOptions['plugins']
) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      code,
      {
        filename: id,
        compact: false,
        minified: false,
        presets: ['@babel/preset-typescript'],
        plugins: plugins || getDefaultBabelPlugins(id, code, development),
      },
      (err: any, result) => {
        if (!result || err) {
          return rej(err || 'no res')
        }
        res(result!.code!)
      }
    )
  })
}

const getDefaultBabelPlugins = (id: string, code: string, development: boolean, force = false) => {
  let plugins: BabelPlugins = []

  if (force || shouldBabelGenerators(id, code)) {
    plugins = getBasePlugins(development)
  }

  if (!configuration.disableReanimated && shouldBabelReanimated(id, code)) {
    plugins.push('react-native-reanimated/plugin')
  }

  return plugins
}

const getBasePlugins = (development: boolean) =>
  [
    ['@babel/plugin-transform-destructuring'],
    ['@babel/plugin-transform-react-jsx', { development }],
    ['@babel/plugin-transform-async-generator-functions'],
    ['@babel/plugin-transform-async-to-generator'],
    [
      '@babel/plugin-transform-runtime',
      {
        helpers: true,
        // NOTE THIS WAS SPELLED WRONG BEFOER THIS COMMIT MAYBE IT WAS UNINTENTIONALLY WORKING
        regenerator: false,
      },
    ],
  ] satisfies BabelPlugins

/**
 * ----- react compiler -----
 */

export const createReactCompilerPlugin = (root: string): Plugin => {
  const getBabelConfig = (target: '18' | '19') => ({
    babelrc: false,
    configFile: false,
    presets: [],
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

/**
 * ----- generators ------
 */

function shouldBabelGenerators(id: string, code: string) {
  if (process.env.VXRN_USE_BABEL_FOR_GENERATORS) {
    return asyncGeneratorRegex.test(code)
  }
}

/**
 * ------- reanimated --------
 */

/**
 * Taken from https://github.com/software-mansion/react-native-reanimated/blob/3.15.1/packages/react-native-reanimated/plugin/src/autoworkletization.ts#L19-L59, need to check if this is up-to-date when supporting newer versions of react-native-reanimated.
 */
const REANIMATED_AUTOWORKLETIZATION_KEYWORDS = [
  'worklet',
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
  'useFrameCallback',
  'useAnimatedStyle',
  'useAnimatedProps',
  'createAnimatedPropAdapter',
  'useDerivedValue',
  'useAnimatedReaction',
  'useWorkletCallback',
  'withTiming',
  'withSpring',
  'withDecay',
  'withRepeat',
  'runOnUI',
  'executeOnUIRuntimeSync',
]

/**
 * Regex to test if a piece of code should be processed by react-native-reanimated's Babel plugin.
 */
const REANIMATED_REGEX = new RegExp(REANIMATED_AUTOWORKLETIZATION_KEYWORDS.join('|'))

const REANIMATED_IGNORED_PATHS = [
  // React and React Native libraries are not likely to use reanimated.
  // This can also avoid the "[BABEL] Note: The code generator has deoptimised the styling of ... as it exceeds the max of 500KB" warning since the react-native source code also contains `useAnimatedProps`.
  'react-native-prebuilt/vendor',
  'node_modules/.vxrn/react-native',
]

const REANIMATED_IGNORED_PATHS_REGEX = new RegExp(
  REANIMATED_IGNORED_PATHS.map((s) => s.replace(/\//g, '/')).join('|')
)

function shouldBabelReanimated(id: string, code: string) {
  if (id.includes('react-native-prebuilt')) {
    return false
  }
  if (!REANIMATED_IGNORED_PATHS_REGEX.test(id) && REANIMATED_REGEX.test(code)) {
    return true
  }
  return false
}
