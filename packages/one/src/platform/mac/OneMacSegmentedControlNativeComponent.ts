import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

export type ChangeEvent = Readonly<{
  selectedIndex: Int32
  revision: Int32
  eventCount: Int32
}>

interface NativeProps extends ViewProps {
  labels: ReadonlyArray<string>
  selectedIndex: Int32
  disabled?: boolean
  revision: Int32
  acknowledgedEvent: Int32
  onSelectedIndexChange?: DirectEventHandler<ChangeEvent>
}

export default codegenNativeComponent<NativeProps>('OneMacSegmentedControl')
