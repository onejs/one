import type { ViewProps } from 'react-native'
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  active: boolean
  facing: string
  codeTypes: ReadonlyArray<string>
  onNativeCameraState?: DirectEventHandler<Readonly<{ state: string }>>
  onNativeCameraCode?: DirectEventHandler<Readonly<{ type: string; data: string }>>
}

export default codegenNativeComponent<NativeProps>('OneNativeCamera', {
  excludedPlatforms: ['android'],
})
