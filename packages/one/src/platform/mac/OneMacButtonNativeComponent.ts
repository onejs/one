import type { ViewProps } from 'react-native'
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  title: string
  systemImage?: string
  disabled?: boolean
  onButtonPress?: DirectEventHandler<Readonly<{}>>
}

export default codegenNativeComponent<NativeProps>('OneMacButton')
