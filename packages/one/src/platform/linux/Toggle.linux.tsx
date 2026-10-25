import type { NumericControlChange } from '../controlTypes'
import { createToggle, type DesktopToggleProps } from '../desktop/createControls'
import NativeToggle from './OneLinuxToggleNativeComponent'

export type ToggleProps = DesktopToggleProps

export const Toggle = createToggle<NumericControlChange>(
  ({ label, isOn, ...props }, binding) => <NativeToggle {...props} title={label} value={isOn ? 1 : 0}
    revision={binding.revision} acknowledgedEvent={binding.acknowledgedEvent}
    onControlChange={({ nativeEvent }) => binding.onNativeChange(nativeEvent)} />,
  (event) => event.value !== 0,
)
