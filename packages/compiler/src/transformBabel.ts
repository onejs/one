import babel from '@babel/core'
import { configuration } from './configure'
import { asyncGeneratorRegex, debug } from './constants'

type BabelPlugins = babel.TransformOptions['plugins']

export type TransformBabelOptions = {
  getUserPlugins?: GetBabelConfig
}

export type GetBabelConfigProps = {
  id: string
  code: string
  development: boolean
  environment: string
  reactForRNVersion: '18' | '19'
}

type Props = TransformBabelOptions & GetBabelConfigProps

export type GetBabelConfig = (props: Props) =>
  | boolean
  | {
      plugins: Exclude<BabelPlugins, null | undefined>
      excludeDefaultPlugins?: boolean
    }

export async function transformWithBabelIfNeeded(props: Props) {
  const babelPlugins = getBabelPlugins(props)
  if (babelPlugins?.length) {
    debug?.(`transformBabel: ${props.id}`)
    return await transformBabel(props, babelPlugins)
  }
}

function getBabelPlugins(props: Props): BabelPlugins {
  const userPlugins = props.getUserPlugins?.(props)
  if (typeof userPlugins !== 'undefined') {
    if (userPlugins === true) {
      return getDefaultBabelPlugins(props, true)
    }
    if (userPlugins === false) {
      return null
    }
    if (userPlugins.excludeDefaultPlugins) {
      return userPlugins.plugins
    }
    return [getDefaultBabelPlugins(props), ...userPlugins.plugins]
  }
  return getDefaultBabelPlugins(props)
}

/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
async function transformBabel(props: Props, plugins: babel.TransformOptions['plugins']) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      props.code,
      {
        filename: props.id,
        compact: false,
        minified: false,
        presets: ['@babel/preset-typescript'],
        plugins: plugins || getDefaultBabelPlugins(props),
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

const getDefaultBabelPlugins = (props: Props, force = false) => {
  let plugins: BabelPlugins = []

  if (force || shouldBabelGenerators(props)) {
    plugins = getBasePlugins(props)
  }

  if (configuration.enableReanimated && shouldBabelReanimated(props)) {
    plugins.push('react-native-reanimated/plugin')
  }

  if (configuration.enableCompiler && shouldBabelReactCompiler(props)) {
    plugins.push(getBabelReactCompilerPlugin(props))
  }

  return plugins
}

const getBasePlugins = ({ development }: Props) =>
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

const shouldBabelReactCompiler = (props: Props) => {
  if (!/.*(.tsx?)$/.test(props.id)) return false
  if (props.code.startsWith('// disable-compiler')) return false
  console.log('enable compiler')
  return true
}

const getBabelReactCompilerPlugin = (props: Props) => {
  const target =
    props.reactForRNVersion === '18' &&
    (props.environment === 'ios' || props.environment === 'android')
      ? '18'
      : '19'

  return ['babel-plugin-react-compiler', { target }]
}

/**
 * ----- generators ------
 */

function shouldBabelGenerators({ code }: Props) {
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

function shouldBabelReanimated({ code, id }: Props) {
  if (id.includes('react-native-prebuilt')) {
    return false
  }
  if (!REANIMATED_IGNORED_PATHS_REGEX.test(id) && REANIMATED_REGEX.test(code)) {
    return true
  }
  return false
}
