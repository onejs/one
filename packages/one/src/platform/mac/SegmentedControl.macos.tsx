import { createSegmentedControl, type DesktopSegmentedControlProps } from '../desktop/createControls'
import NativeSegmentedControl, { type ChangeEvent } from './OneMacSegmentedControlNativeComponent'

export type SegmentedControlProps = DesktopSegmentedControlProps

export const SegmentedControl = createSegmentedControl<ChangeEvent>(
  (props, binding) => <NativeSegmentedControl {...props} revision={binding.revision}
    acknowledgedEvent={binding.acknowledgedEvent}
    onSelectedIndexChange={({ nativeEvent }) => binding.onNativeChange(nativeEvent)} />,
  (event) => event.selectedIndex,
)
