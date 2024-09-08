import * as babel from '@babel/core'
import type { Plugin } from 'vite'

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

export function getBabelReanimatedPlugin(): Plugin {
  return {
    name: 'babel-reanimated',
    async transform(code, id) {
      if (id.includes('react-native-prebuilt')) {
        return
      }

      if (REANIMATED_REGEX.test(code)) {
        const out = await babelReanimated(code, id)
        return out
      }
    },
  }
}
