import type { ViewProps } from 'react-native'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  tabId: string
  title: string
  systemImage: string
  badge: string
}

export default codegenNativeComponent<NativeProps>('OneNativeTab', {
  interfaceOnly: true,
})
