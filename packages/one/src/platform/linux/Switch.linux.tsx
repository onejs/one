import type { ControlledControlProps, ControlChange, NumericControlChange } from '../controlTypes'
import { useControlled } from '../controlled'
import NativeSwitch from './OneLinuxSwitchNativeComponent'

export type SwitchProps = ControlledControlProps & {
  isOn: boolean
  onIsOnChange?: (event: ControlChange<{ isOn: boolean }>) => void
}

export function Switch({ isOn, revision = 0, onIsOnChange, ...props }: SwitchProps) {
  const controlled = useControlled((event: NumericControlChange) => {
    onIsOnChange?.({ isOn: event.value !== 0, revision: event.revision })
  }, revision)
  return (
    <NativeSwitch
      {...props}
      value={isOn ? 1 : 0}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
