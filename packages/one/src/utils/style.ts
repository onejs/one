import type { TextStyle } from 'react-native'

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
