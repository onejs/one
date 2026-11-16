import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

import type { HostComponent } from 'react-native'
import type { ViewProps } from 'react-native/Libraries/Components/View/ViewPropTypes'

export interface NativeProps extends ViewProps {
  visible?: boolean
}

export default codegenNativeComponent<NativeProps>('OneOverKeyboardView', {
  interfaceOnly: true,
}) as HostComponent<NativeProps>
