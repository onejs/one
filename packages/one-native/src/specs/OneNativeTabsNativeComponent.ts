import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  selection: string
  acknowledgedEvent: Int32
  sidebarAdaptable: boolean
  onSelectionChange?: DirectEventHandler<
    Readonly<{
      selection: string
      eventCount: Int32
    }>
  >
}

export default codegenNativeComponent<NativeProps>('OneNativeTabs')
