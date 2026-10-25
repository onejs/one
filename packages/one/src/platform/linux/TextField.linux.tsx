import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeTextField from './OneLinuxTextFieldNativeComponent'
import NativeSecureField, { type ChangeEvent } from './OneLinuxSecureFieldNativeComponent'

export type TextFieldProps = Omit<ViewProps, 'children'> & {
  text: string
  label?: string
  prompt?: string
  disabled?: boolean
  revision?: number
  onTextChange?: (text: string) => void
  onSubmit?: () => void
}

export function TextField(props: TextFieldProps) {
  return <Field {...props} secure={false} />
}

export function Field({ text, label = '', prompt = '', revision = 0, onTextChange,
  onSubmit, style, secure, ...props }: TextFieldProps & { secure: boolean }) {
  const controlled = useControlled((event: ChangeEvent) => onTextChange?.(event.text), revision)
  const NativeField = secure ? NativeSecureField : NativeTextField
  return <NativeField {...props} text={text} title={label} prompt={prompt}
    style={[{ width: 240, height: 34 }, style]}
    revision={controlled.revision} acknowledgedEvent={controlled.acknowledgedEvent}
    onTextChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)}
    onSubmit={({ nativeEvent }) => { if (nativeEvent.revision === revision) onSubmit?.() }} />
}
