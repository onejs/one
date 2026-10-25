import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeSwitch, { type ChangeEvent } from './OneLinuxSwitchNativeComponent'

export type SwitchProps = Omit<ViewProps, 'children'> & {
  isOn: boolean
  revision?: number
  onIsOnChange?: (event: { isOn: boolean; revision: number }) => void
}

export function Switch({ isOn, revision = 0, onIsOnChange, ...props }: SwitchProps) {
  const controlled = useControlled((event: ChangeEvent) => {
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
