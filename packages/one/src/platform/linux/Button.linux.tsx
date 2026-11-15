import { useControlled } from '../controlled'
import { createButton, type DesktopButtonProps } from '../desktop/createControls'
import NativeButton from './OneLinuxButtonNativeComponent'

export type ButtonProps = Omit<DesktopButtonProps, 'systemImage' | 'bordered'>

export const Button = createButton(NativeButton, function useNativeProps({ revision = 0, onPress, ...props }: ButtonProps) {
  const binding = useControlled(() => onPress?.(), revision)
  return {
    ...props,
    revision: binding.revision,
    acknowledgedEvent: binding.acknowledgedEvent,
    onControlChange: ({ nativeEvent }) => binding.onNativeChange(nativeEvent),
  }
})
