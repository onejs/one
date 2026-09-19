import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

// flex:1 fills the remaining space by default, but its zero basis wins over an
// explicit height and its shrink stomps a user shrink, so the default applies only
// when the flattened style sizes nothing itself. StyleSheet.flatten resolves
// registered styles, so a StyleSheet.create height counts as explicit too.
export function fillViewportStyle(
  style: StyleProp<ViewStyle> | undefined
): StyleProp<ViewStyle> {
  const flat = StyleSheet.flatten(style) ?? {}
  if (
    flat.height !== undefined ||
    flat.flex !== undefined ||
    flat.flexGrow !== undefined ||
    flat.flexShrink !== undefined ||
    flat.flexBasis !== undefined
  )
    return [style]
  return [{ flex: 1 }, style]
}
