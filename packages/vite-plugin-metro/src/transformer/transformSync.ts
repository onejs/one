/**
 * Copyright (c) 650 Industries (Expo). All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as babel from './babel-core'

// TS detection conditions copied from @react-native/babel-preset
function isTypeScriptSource(fileName: string): boolean {
  return fileName?.endsWith('.ts')
}

function isTSXSource(fileName: string): boolean {
  return fileName?.endsWith('.tsx')
}

export function transformSync(
  src: string,
  babelConfig: babel.TransformOptions,
  { hermesParser }: { hermesParser?: boolean }
) {
  const loadedBabelConfig = babel.loadOptions(
    babelConfig
  ) as babel.TransformOptions | null
  if (!loadedBabelConfig) return null

  // expo adds worklets automatically. keep the app's earlier configured pass so a
  // later preset pass cannot serialize the closure with different options.
  let hasWorkletsPlugin = false
  loadedBabelConfig.plugins = loadedBabelConfig.plugins?.filter((plugin) => {
    const workletsPlugin = plugin as {
      key?: string
      options?: Record<string, unknown>
    }
    if (workletsPlugin.key !== 'worklets') return true
    if (workletsPlugin.options && 'workletizableModules' in workletsPlugin.options) {
      throw new Error(
        '[vxrn] `workletizableModules` was removed from react-native-worklets. use `importForwarding.moduleNames`.'
      )
    }
    if (hasWorkletsPlugin) return false
    hasWorkletsPlugin = true
    return true
  })

  const isTypeScript =
    isTypeScriptSource(loadedBabelConfig.filename ?? '') ||
    isTSXSource(loadedBabelConfig.filename ?? '')

  if (isTypeScript) {
    return parseWithBabel(src, loadedBabelConfig)
  }

  if (
    !isTypeScript &&
    // The Hermes parser doesn't support comments or babel proposals such as export default from, meaning it has lower compatibility with larger parts
    // of the ecosystem.
    // However, React Native ships with flow syntax that isn't supported in Babel so we need to use Hermes for those files.
    // We can try to quickly detect if the file uses flow syntax by checking for the @flow pragma which is present in every React Native file.
    (hermesParser || src.includes(' @flow'))
  ) {
    return parseWithHermes(src, loadedBabelConfig)
  }

  return parseWithBabel(src, loadedBabelConfig)
}

function parseWithHermes(src: string, babelConfig: babel.TransformOptions) {
  const sourceAst = require('hermes-parser').parse(src, {
    babel: true,
    sourceType: babelConfig.sourceType,
  })
  return babel.transformFromAstSync(sourceAst, src, babelConfig)
}

function parseWithBabel(src: string, babelConfig: babel.TransformOptions) {
  return babel.transformSync(src, babelConfig)
}
