// the device host for a react native `.swift` import: the package's registered
// view, or one of its typed views, rendered with the importing element's props
// as json text. a typed view reports each callback call back as an event.
import type { ViewProps } from 'react-native'
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

type SwiftHostEvent = Readonly<{ name: string; args: string }>

interface NativeProps extends ViewProps {
  packageName: string
  // a typed view's struct name, or empty for the package's @main view
  view: string
  contractHash: string
  props: string
  // a whole swift app: fill the space yoga gives instead of measuring content
  fill: boolean
  onHostEvent?: DirectEventHandler<SwiftHostEvent>
}

export default codegenNativeComponent<NativeProps>('OneSwiftHost', {
  interfaceOnly: true,
})
