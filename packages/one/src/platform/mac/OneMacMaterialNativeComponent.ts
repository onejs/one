import type { ViewProps } from 'react-native'
import type { Float, WithDefault } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  material?: WithDefault<string, 'sidebar'>
  blending?: WithDefault<string, 'behindWindow'>
  cornerRadius?: WithDefault<Float, 0>
}

export default codegenNativeComponent<NativeProps>('OneMacMaterial')
