import type { ViewProps } from 'react-native'
import type { Double, WithDefault } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  placement: string
  splitRatio?: WithDefault<Double, -1>
  splitMinHorizontal?: WithDefault<Double, -1>
  splitIdealHorizontal?: WithDefault<Double, -1>
  splitMaxHorizontal?: WithDefault<Double, -1>
  splitMinVertical?: WithDefault<Double, -1>
  splitIdealVertical?: WithDefault<Double, -1>
  splitMaxVertical?: WithDefault<Double, -1>
  splitMinWidth?: WithDefault<Double, -1>
  splitIdealWidth?: WithDefault<Double, -1>
  splitMaxWidth?: WithDefault<Double, -1>
  splitMinHeight?: WithDefault<Double, -1>
  splitIdealHeight?: WithDefault<Double, -1>
  splitMaxHeight?: WithDefault<Double, -1>
  splitFixedHorizontal?: boolean
  splitFixedVertical?: boolean
  overlayEdge?: string
}

export default codegenNativeComponent<NativeProps>('OneNativeArrangementSlot', {
  interfaceOnly: true,
})
