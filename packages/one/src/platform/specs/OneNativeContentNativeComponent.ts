import type { ViewProps } from 'react-native'
import type { Double } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

interface NativeProps extends ViewProps {
  // the id OneNativeViews reserved for this mount's content view
  contentId: Double
  // the registry id OneNativeViews returned for a cell source, zero for none, and the
  // item whose cell shows the content
  sourceId: Double
  item: Double
  // a fixed height that skips measurement, zero to measure
  height: Double
  // the height before the first measurement
  estimatedHeight: Double
}

export default codegenNativeComponent<NativeProps>('OneNativeContent', {
  interfaceOnly: true,
})
