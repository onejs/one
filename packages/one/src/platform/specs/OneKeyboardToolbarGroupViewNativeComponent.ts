import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

import type { HostComponent } from 'react-native'
import type { ViewProps } from 'react-native/Libraries/Components/View/ViewPropTypes'

export interface NativeProps extends ViewProps {}

export default codegenNativeComponent<NativeProps>(
  'OneKeyboardToolbarGroupView'
) as HostComponent<NativeProps>
