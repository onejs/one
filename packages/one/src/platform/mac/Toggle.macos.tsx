import { useControlled } from '../controlled'
import NativeToggle, { type ChangeEvent } from './OneMacToggleNativeComponent'

export function Toggle({
  label,
  isOn,
  revision = 0,
  onIsOnChange,
}: {
  label: string
  isOn: boolean
  revision?: number
  onIsOnChange?: (event: { isOn: boolean; revision: number }) => void
}) {
  const controlled = useControlled((event: ChangeEvent) => {
    onIsOnChange?.({ isOn: event.isOn, revision: event.revision })
  }, revision)
  return (
    <NativeToggle
      label={label}
      isOn={isOn}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onIsOnChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
