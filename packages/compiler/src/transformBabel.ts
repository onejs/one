import babel from '@babel/core'
import { configuration } from './configure'
import { relative } from 'node:path'
import { asyncGeneratorRegex, debug } from './constants'
import type { Environment } from './types'

type BabelPlugins = babel.TransformOptions['plugins']

export type TransformBabelOptions = {
  getUserPlugins?: GetBabelConfig
}

export type GetBabelConfigProps = {
  id: string
  code: string
  development: boolean
  environment: Environment
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
      return getPlugins(props, true)
    }
    if (userPlugins === false) {
      return null
    }
    if (userPlugins.excludeDefaultPlugins) {
      return userPlugins.plugins
    }
    return [getPlugins(props), ...userPlugins.plugins]
  }
  return getPlugins(props)
}

const getPlugins = (props: Props, force = false) => {
  let plugins: BabelPlugins = []

  if (force || shouldBabelGenerators(props)) {
    plugins = getBasePlugins(props)
  }

  if (shouldBabelReanimated(props)) {
    debug?.(`Using babel reanimated on file`)
    plugins.push('react-native-reanimated/plugin')
  }

  if (shouldBabelReactCompiler(props)) {
    debug?.(`Using babel react compiler on file`)
    plugins.push(getBabelReactCompilerPlugin(props))
  }

  if (shouldBabelReactNativeCodegen(props)) {
    debug?.(`Using babel @react-native/babel-plugin-codegen on file`)
    plugins.push('@react-native/babel-plugin-codegen')
  }

  return plugins
}
/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
async function transformBabel(props: Props, pluginsIn: babel.TransformOptions['plugins']) {
  const plugins = pluginsIn || getPlugins(props)
  const compilerPlugin = plugins.find((x) => x && x[0] === 'babel-plugin-react-compiler')

  const out = await new Promise<string>((res, rej) => {
    babel.transform(
      props.code,
      {
        filename: props.id,
        compact: false,
        minified: false,
        presets: ['@babel/preset-typescript'],
        plugins,
      },
      (err: any, result) => {
        if (!result || err) {
          return rej(err || 'no res')
        }
        res(result!.code!)
      }
    )
  })

  if (
    compilerPlugin &&
    out.includes(compilerPlugin[1] === '18' ? `react-compiler-runtime` : `react/compiler-runtime`)
  ) {
    console.info(` 🪄 [compiler] ${relative(process.cwd(), props.id)}`)
  }

  return out
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
 * ----- react native codegen ----
 */

// Codegen specification files need to go through the react-native codegen babel plugin.
// See:
// * https://reactnative.dev/docs/fabric-native-components-introduction#1-define-specification-for-codegen
// * https://reactnative.dev/docs/turbo-native-modules-introduction#1-declare-typed-specification

const NATIVE_COMPONENT_RE = /NativeComponent\.[jt]sx?$/
const SPEC_FILE_RE = /[\/\\]specs?[\/\\]/

const shouldBabelReactNativeCodegen = ({ id, environment }: Props) => {
  return (
    (environment === 'ios' || environment === 'android') &&
    (NATIVE_COMPONENT_RE.test(id) || SPEC_FILE_RE.test(id))
  )
}

/**
 * ----- react compiler -----
 */

const shouldBabelReactCompiler = (props: Props) => {
  if (!configuration.enableCompiler) {
    return false
  }
  if (Array.isArray(configuration.enableCompiler)) {
    if (!configuration.enableCompiler.includes(props.environment)) {
      return false
    }
  }
  if (!/.*(.tsx?)$/.test(props.id)) return false
  if (props.code.startsWith('// disable-compiler')) return false
  // may want to disable in node modules? but rare to have tsx in node mods
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
  'react-native-prebuilt',
  'node_modules/.vxrn/react-native',
]

const REANIMATED_IGNORED_PATHS_REGEX = new RegExp(
  REANIMATED_IGNORED_PATHS.map((s) => s.replace(/\//g, '/')).join('|')
)

function shouldBabelReanimated({ code, id }: Props) {
  if (!configuration.enableReanimated) {
    return false
  }
  if (!REANIMATED_IGNORED_PATHS_REGEX.test(id) && REANIMATED_REGEX.test(code)) {
    console.info(` 🪄 [reanimated] ${relative(process.cwd(), id)}`)
    return true
  }
  return false
}
