import type { ViewProps } from 'react-native'
import type { DirectEventHandler, WithDefault } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  title: string
  systemImage?: string
  disabled?: boolean
  bordered?: WithDefault<boolean, true>
  onButtonPress?: DirectEventHandler<Readonly<{}>>
}

export default codegenNativeComponent<NativeProps>('OneMacButton')
