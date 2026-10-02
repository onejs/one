// the device host for a composable imported from a react native `.kt` file:
// the app's generated view dispatch renders it with the element's props as
// json text, and reports each callback call back as an event.
import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

type KotlinHostEvent = Readonly<{ name: string; args: string }>
type KotlinHostSizeEvent = Readonly<{ width: Double; height: Double; intrinsicWidth: boolean }>

interface NativeProps extends ViewProps {
  // the kotlin source id the bundler derived from the imported file's path
  source: string
  view: string
  contractHash: string
  props: string
  intrinsicWidth: boolean
  intrinsicHeight: boolean
  onHostEvent?: DirectEventHandler<KotlinHostEvent>
  onHostSizeChange?: DirectEventHandler<KotlinHostSizeEvent>
}

export default codegenNativeComponent<NativeProps>('OneKotlinHost', {
  interfaceOnly: true,
})
