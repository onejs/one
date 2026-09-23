// the device host for a react native `.swift` import: the package's registered
// view, rendered with the importing element's props as json text.
import type { ViewProps } from 'react-native'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  packageName: string
  props: string
  // a whole swift app: fill the space yoga gives instead of measuring content
  fill: boolean
}

export default codegenNativeComponent<NativeProps>('OneSwiftHost', {
  interfaceOnly: true,
})
