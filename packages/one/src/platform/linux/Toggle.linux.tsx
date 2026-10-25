import type { ControlledControlProps, ControlChange, NumericControlChange } from '../controlTypes'
import { useControlled } from '../controlled'
import NativeToggle from './OneLinuxToggleNativeComponent'

export type ToggleProps = ControlledControlProps & {
  label: string
  isOn: boolean
  onIsOnChange?: (event: ControlChange<{ isOn: boolean }>) => void
}

export function Toggle({ label, isOn, revision = 0, onIsOnChange, style, ...props }: ToggleProps) {
  const controlled = useControlled((event: NumericControlChange) => {
    onIsOnChange?.({ isOn: event.value !== 0, revision: event.revision })
  }, revision)
  return <NativeToggle {...props} title={label} value={isOn ? 1 : 0}
    style={style}
    revision={controlled.revision} acknowledgedEvent={controlled.acknowledgedEvent}
    onControlChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)} />
}
