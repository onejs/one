import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeToggle, { type ChangeEvent } from './OneLinuxToggleNativeComponent'

export type ToggleProps = Omit<ViewProps, 'children'> & {
  label: string
  isOn: boolean
  disabled?: boolean
  revision?: number
  onIsOnChange?: (event: { isOn: boolean; revision: number }) => void
}

export function Toggle({ label, isOn, revision = 0, onIsOnChange, style, ...props }: ToggleProps) {
  const controlled = useControlled((event: ChangeEvent) => {
    onIsOnChange?.({ isOn: event.value !== 0, revision: event.revision })
  }, revision)
  return <NativeToggle {...props} title={label} value={isOn ? 1 : 0}
    style={[{ width: 240, height: 34 }, style]}
    revision={controlled.revision} acknowledgedEvent={controlled.acknowledgedEvent}
    onControlChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)} />
}
