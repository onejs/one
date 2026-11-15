import { createButton, type DesktopButtonProps } from '../desktop/createControls'
import NativeButton from './OneMacButtonNativeComponent'

export type ButtonProps = Omit<DesktopButtonProps, 'revision'> & {
  /** fills the bezel with the accent color, for the button that confirms a dialog. */
  prominent?: boolean
}

export const Button = createButton(NativeButton, ({ onPress, ...props }: ButtonProps) => ({
  ...props,
  onButtonPress: onPress,
}))
