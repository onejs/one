import type { ControlledControlProps } from '../controlTypes'
import { useControlled } from '../controlled'
import NativeButton from './OneLinuxButtonNativeComponent'

export type ButtonProps = ControlledControlProps & {
  title: string
  onPress?: () => void
}

export function Button({ revision = 0, onPress, style, ...props }: ButtonProps) {
  const controlled = useControlled(() => onPress?.(), revision)
  return (
    <NativeButton
      {...props}
      style={style}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
