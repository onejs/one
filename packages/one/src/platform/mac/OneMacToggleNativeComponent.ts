// macOS SwiftUI toggle spec. staticSpecs.ts rewrites its dist mirror into a
// static view config; it is not in codegenConfig, so ios and android skip it.
import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

export type ChangeEvent = Readonly<{
  isOn: boolean
  revision: Int32
  eventCount: Int32
}>

interface NativeProps extends ViewProps {
  label: string
  isOn: boolean
  revision: Int32
  acknowledgedEvent: Int32
  onIsOnChange?: DirectEventHandler<ChangeEvent>
}

export default codegenNativeComponent<NativeProps>('OneMacToggle')
