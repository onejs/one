import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

export type ChangeEvent = Readonly<{ text: string; revision: Int32; eventCount: Int32 }>
interface NativeProps extends ViewProps {
  title: string
  prompt: string
  text: string
  disabled?: boolean
  revision: Int32
  acknowledgedEvent: Int32
  onTextChange?: DirectEventHandler<ChangeEvent>
  onSubmit?: DirectEventHandler<Readonly<{ revision: Int32 }>>
}
export default codegenNativeComponent<NativeProps>('OneLinuxTextField')
