import { useControlled } from '../controlled'
import NativeSwitch, { type ChangeEvent } from './OneLinuxSwitchNativeComponent'

export type SwitchProps = {
  isOn: boolean
  revision?: number
  onIsOnChange?: (event: { isOn: boolean; revision: number }) => void
}

export function Switch({ isOn, revision = 0, onIsOnChange }: SwitchProps) {
  const controlled = useControlled((event: ChangeEvent) => {
    onIsOnChange?.({ isOn: event.isOn, revision: event.revision })
  }, revision)
  return (
    <NativeSwitch
      isOn={isOn}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onIsOnChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
