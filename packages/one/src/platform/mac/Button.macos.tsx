import type { ViewProps } from 'react-native'
import NativeButton from './OneMacButtonNativeComponent'

export type ButtonProps = Omit<ViewProps, 'children'> & {
  title: string
  /** sf symbol name, such as sidebar.left or plus. */
  systemImage?: string
  disabled?: boolean
  onPress?: () => void
}

export function Button({ onPress, ...props }: ButtonProps) {
  return <NativeButton {...props} onButtonPress={onPress} />
}
