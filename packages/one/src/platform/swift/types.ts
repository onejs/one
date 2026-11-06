import type { StyleProp, ViewStyle } from 'react-native'
import type { NativeSourceViewWires } from '../native-source/wire.native'

export interface SwiftPackageViewProps {
  // the package the bundler named from the imported file's swift package
  packageName: string
  // a typed view's struct name, or empty for the package's @main view
  view: string
  // the package contract a typed view was generated from, else empty
  contractHash: string
  // the importing element's props: a typed view's stored properties, or the
  // json the @main view's view(props:) reads
  props: Record<string, unknown> & { style?: StyleProp<ViewStyle> }
  // the imported file's @main is an App: the root fills its parent. a typed
  // view also fills when its element style sets flex or flexGrow
  fill: boolean
  // wire formats for props and callback arguments carrying Date, Data or
  // struct payloads; absent when every prop crosses as plain json
  wires?: NativeSourceViewWires
}
