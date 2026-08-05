import type { StyleProp, TextStyle } from 'react-native'

/**
 * Merge a style prop into a single object. Replaces `StyleSheet.flatten` so the
 * web graph doesn't import react-native just to read a style value.
 */
export function flattenStyle<T extends object>(style: StyleProp<T>): T | undefined {
  if (!style) {
    return undefined
  }
  if (!Array.isArray(style)) {
    return style as T
  }
  let result: T | undefined
  for (const item of style) {
    const flat = flattenStyle(item as StyleProp<T>)
    if (flat) {
      result = { ...(result as object), ...(flat as object) } as T
    }
  }
  return result
}

/**
 * Convert numeric font weights to string format for React Navigation compatibility.
 * React Navigation only accepts string font weights, not numbers.
 */
export function convertFontWeightToStringFontWeight(
  fontWeight: TextStyle['fontWeight']
): Exclude<TextStyle['fontWeight'], number> | undefined {
  if (fontWeight === undefined) {
    return undefined
  }
  if (typeof fontWeight === 'number') {
    return String(fontWeight) as Exclude<TextStyle['fontWeight'], number>
  }
  return fontWeight
}
