import babel from '@babel/core'

type BabelPlugins = babel.TransformOptions['plugins']

export type GetBabelConfig = (id: string, code: string) => boolean | BabelPlugins

type BabelPluginGlobalOptions = {
  disableReanimated: boolean
}

const userOptions: BabelPluginGlobalOptions = {
  disableReanimated: true,
}

export async function transformWithBabelIfNeeded(
  getUserPlugins: GetBabelConfig | undefined,
  id: string,
  code: string,
  development: boolean
) {
  const babelPlugins = getBabelPlugins(getUserPlugins, id, code, development)
  if (babelPlugins) {
    return await transformBabel(babelPlugins, code, id, development)
  }
}

export function configureBabelPlugin(opts: Partial<BabelPluginGlobalOptions>) {
  Object.assign(userOptions, opts)
}

function getBabelPlugins(
  getUserPlugins: GetBabelConfig | undefined,
  id: string,
  code: string,
  development: boolean
): BabelPlugins {
  const userPlugins = getUserPlugins?.(id, code)
  if (userPlugins) {
    if (userPlugins === true) {
      return getDefaultBabelPlugins(id, code, development, true)
    }
    return userPlugins
  }
  return getDefaultBabelPlugins(id, code, development)
}

/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
async function transformBabel(
  plugins: babel.TransformOptions['plugins'],
  id: string,
  code: string,
  development: boolean
) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      code,
      {
        filename: 'code.js',
        compact: false,
        minified: false,
        plugins: plugins || getDefaultBabelPlugins(id, code, development),
      },
      (err: any, result) => {
        if (!result || err) rej(err || 'no res')

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

  if (!userOptions.disableReanimated && shouldBabelReanimated(id, code)) {
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
 * ----- generators ------
 */

const asyncGeneratorRegex = /(async \*|async function\*|for await)/

function shouldBabelGenerators(id: string, code: string) {
  return asyncGeneratorRegex.test(code)
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
