import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeButton, { type ChangeEvent } from './OneLinuxButtonNativeComponent'

export type ButtonProps = Omit<ViewProps, 'children'> & {
  title: string
  disabled?: boolean
  revision?: number
  onPress?: () => void
}

export function Button({ revision = 0, onPress, style, ...props }: ButtonProps) {
  const controlled = useControlled((_event: ChangeEvent) => onPress?.(), revision)
  return (
    <NativeButton
      {...props}
      style={[{ width: 160, height: 34 }, style]}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
