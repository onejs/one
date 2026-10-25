import { createButton, type DesktopButtonProps } from '../desktop/createControls'
import NativeButton from './OneMacButtonNativeComponent'

export type ButtonProps = Omit<DesktopButtonProps, 'revision'>

export const Button = createButton(NativeButton, ({ onPress, ...props }: ButtonProps) => ({
  ...props,
  onButtonPress: onPress,
}))
