import type { ViewProps } from 'react-native'
import type { Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  value: Double
  indeterminate: boolean
}

export default codegenNativeComponent<NativeProps>('OneLinuxProgressBar')
