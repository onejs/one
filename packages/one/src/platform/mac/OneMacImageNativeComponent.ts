import type { ColorValue, ViewProps } from 'react-native'
import type { Float } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  systemName: string
  size?: Float
  tintColor?: ColorValue
}

export default codegenNativeComponent<NativeProps>('OneMacImage')
