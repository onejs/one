import type { StyleProp, ViewStyle } from 'react-native'
import type { NativeSourceViewWires } from './wire.native'

export interface KotlinSourceViewProps {
  // the kotlin source id the bundler derived from the imported file's path
  source: string
  // the @Composable function's name
  view: string
  contractHash: string
  // the importing element's props, the composable's parameters
  props: Record<string, unknown> & { style?: StyleProp<ViewStyle> }
  // wire formats for props and callback arguments carrying Date, Data or
  // struct payloads; absent when every prop crosses as plain json
  wires?: NativeSourceViewWires
}
