import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

export function viewportStyle(style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  const flat = StyleSheet.flatten(style)
  // a viewport fills its parent's remaining main-axis space unless the caller
  // supplied sizing of their own. height:100% overflows beside siblings.
  const hasSize =
    flat?.height != null ||
    flat?.aspectRatio != null ||
    flat?.flex != null ||
    flat?.flexBasis != null ||
    flat?.flexGrow != null

  return [hasSize ? { alignSelf: 'stretch' } : { flex: 1, alignSelf: 'stretch' }, style]
}
