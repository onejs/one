import { isWeb, ScrollView, type ScrollViewProps } from 'tamagui'

export function NativeScrollView(props: ScrollViewProps) {
  if (isWeb) {
    return props.children
  }

  return <ScrollView {...props} />
}
