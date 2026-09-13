import type { ColorValue, ViewProps } from 'react-native'
import type {
  DirectEventHandler,
  Double,
  Int32,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

type ComposeStyleNative = Readonly<{
  backgroundColor?: ColorValue
  foregroundColor?: ColorValue
  padding?: WithDefault<Double, -1>
  paddingTop?: WithDefault<Double, -1>
  paddingRight?: WithDefault<Double, -1>
  paddingBottom?: WithDefault<Double, -1>
  paddingLeft?: WithDefault<Double, -1>
  width?: WithDefault<Double, -1>
  height?: WithDefault<Double, -1>
  fillMaxWidth?: boolean
  fillMaxHeight?: boolean
  cornerRadius?: WithDefault<Double, -1>
  opacity?: WithDefault<Double, -1>
  borderColor?: ColorValue
  borderWidth?: WithDefault<Double, -1>
}>

interface NativeProps extends ViewProps {
  nodeType: string
  text?: string
  fontSize?: WithDefault<Double, -1>
  fontWeight?: string
  textAlign?: string
  maxLines?: Int32
  label?: string
  disabled?: boolean
  variant?: string
  tone?: string
  value?: boolean
  acknowledgedEvent?: Int32
  revision?: Int32
  alignment?: string
  arrangement?: string
  composeStyle?: ComposeStyleNative
  onNativeComposeNodeButtonPress?: DirectEventHandler<Readonly<{ eventCount: Int32 }>>
  onNativeComposeNodeSwitchValueChange?: DirectEventHandler<
    Readonly<{ value: boolean; eventCount: Int32; revision: Int32 }>
  >
}

export default codegenNativeComponent<NativeProps>('OneNativeComposeNode', {
  excludedPlatforms: ['iOS'],
  interfaceOnly: false,
})
