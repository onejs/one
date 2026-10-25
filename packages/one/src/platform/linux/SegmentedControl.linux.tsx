import type { ReactElement } from 'react'
import type { NumericControlChange } from '../controlTypes'
import { createSegmentedControl, type DesktopSegmentedControlProps } from '../desktop/createControls'
import NativeSegmentedControl from './OneLinuxSegmentedControlNativeComponent'

export type SegmentedControlProps = Omit<DesktopSegmentedControlProps, 'controlRole'>

export const SegmentedControl: (props: SegmentedControlProps) => ReactElement = createSegmentedControl<NumericControlChange>(
  ({ selectedIndex, controlRole: _controlRole, ...props }, binding) => <NativeSegmentedControl {...props}
    value={selectedIndex} revision={binding.revision} acknowledgedEvent={binding.acknowledgedEvent}
    onControlChange={({ nativeEvent }) => binding.onNativeChange(nativeEvent)} />,
  (event) => event.value,
)
