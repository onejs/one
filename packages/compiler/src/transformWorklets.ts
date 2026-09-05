import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { configuration, isNativeWorkletsEnabled } from './configure'

export const REANIMATED_AUTOWORKLETIZATION_KEYWORDS = [
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

const REANIMATED_REGEX = new RegExp(REANIMATED_AUTOWORKLETIZATION_KEYWORDS.join('|'))

const REANIMATED_IGNORED_PATHS = [
  'react-native-prebuilt',
  'node_modules/.vxrn/react-native',
  'node_modules/react/',
  'node_modules/react-dom/',
  'node_modules/react-native/',
  'node_modules/react-native-web/',
]

const REANIMATED_IGNORED_PATHS_REGEX = new RegExp(REANIMATED_IGNORED_PATHS.join('|'))

export function shouldTransformWorklets({ id, code }: { id: string; code: string }) {
  if (!isNativeWorkletsEnabled() || !configuration.enableReanimated) {
    return false
  }

  const normalizedId = id.replace(/\\/g, '/')
  if (REANIMATED_IGNORED_PATHS_REGEX.test(normalizedId)) {
    return false
  }

  return REANIMATED_REGEX.test(code)
}

export function getWorkletsVersion(projectRoot?: string, filename?: string): string {
  if (projectRoot) {
    try {
      const req = createRequire(path.resolve(projectRoot, 'package.json'))
      // Look for react-native-worklets first (preferred in modern Worklets / Reanimated 4)
      try {
        const ver = req('react-native-worklets/package.json')?.version
        if (ver) return ver
      } catch {}
      // Fall back to react-native-reanimated (Reanimated 3 where worklets is bundled inside)
      try {
        const ver = req('react-native-reanimated/package.json')?.version
        if (ver) return ver
      } catch {}
    } catch {}

    throw new Error(
      `[@vxrn/compiler] Unable to resolve "react-native-worklets" or "react-native-reanimated" version from project root "${projectRoot}". ` +
        `Please ensure react-native-worklets is installed in your project.`
    )
  }

  // If no projectRoot, try resolving from filename if it exists on disk
  if (filename && !filename.startsWith('\0') && fs.existsSync(filename)) {
    try {
      const req = createRequire(filename)
      try {
        const ver = req('react-native-worklets/package.json')?.version
        if (ver) return ver
      } catch {}
      try {
        const ver = req('react-native-reanimated/package.json')?.version
        if (ver) return ver
      } catch {}
    } catch {}
  }

  // Fall back to process.cwd() or import.meta.url for synthetic / dev environments
  const fallbacks = [
    () => createRequire(path.resolve(process.cwd(), 'package.json')),
    () => createRequire(import.meta.url),
  ]

  for (const getReq of fallbacks) {
    try {
      const req = getReq()
      try {
        const ver = req('react-native-worklets/package.json')?.version
        if (ver) return ver
      } catch {}
      try {
        const ver = req('react-native-reanimated/package.json')?.version
        if (ver) return ver
      } catch {}
    } catch {}
  }

  const target = filename || process.cwd()
  throw new Error(
    `[@vxrn/compiler] Unable to resolve "react-native-worklets" or "react-native-reanimated" version from "${target}". ` +
      `Please ensure react-native-worklets is installed in your project.`
  )
}

export type TransformWorkletsOptions = {
  projectRoot?: string
  bundleMode?: boolean
  disableInlineStylesWarning?: boolean
  disableSourceMaps?: boolean
  disableWorkletClasses?: boolean
  globals?: string[]
  relativeSourceLocation?: boolean
  strictGlobal?: boolean
  pluginVersion?: string
}

import { executeWorkletTransform } from './worklets/transform'

export async function transformWorklets(
  id: string,
  code: string,
  sourceMaps = false,
  options?: TransformWorkletsOptions
): Promise<{ code: string; map?: any }> {
  return executeWorkletTransform(id, code, sourceMaps, options, getWorkletsVersion)
}

