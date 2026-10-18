import type { ViewProps } from 'react-native'
import type { Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  // the registry id OneNativeViews returned for a UIView or UIViewController handle
  viewId: Double
}

export default codegenNativeComponent<NativeProps>('OneNativeUIKitHost')
