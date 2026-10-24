import type { ViewProps } from 'react-native'
import NativeButton from './OneMacButtonNativeComponent'

export type ButtonProps = Omit<ViewProps, 'children'> & {
  title: string
  /** sf symbol name, such as sidebar.left or plus. */
  systemImage?: string
  disabled?: boolean
  /** draws the rounded push button bezel; false keeps only the title and symbol. defaults to true. */
  bordered?: boolean
  /** fills the bezel with the accent color, for the button that confirms a dialog. */
  prominent?: boolean
  onPress?: () => void
}

export function Button({ onPress, ...props }: ButtonProps) {
  return <NativeButton {...props} onButtonPress={onPress} />
}
