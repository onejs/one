import type { ControlledControlProps, TextControlChange } from '../controlTypes'
import { useControlled } from '../controlled'
import NativeTextField from './OneLinuxTextFieldNativeComponent'
import NativeSecureField from './OneLinuxSecureFieldNativeComponent'

export type TextFieldProps = ControlledControlProps & {
  text: string
  label?: string
  prompt?: string
  onTextChange?: (text: string) => void
  onSubmit?: () => void
}

export function TextField(props: TextFieldProps) {
  return <Field {...props} secure={false} />
}

export function Field({ text, label = '', prompt = '', revision = 0, onTextChange,
  onSubmit, style, secure, ...props }: TextFieldProps & { secure: boolean }) {
  const controlled = useControlled((event: TextControlChange) => onTextChange?.(event.text), revision)
  const NativeField = secure ? NativeSecureField : NativeTextField
  return <NativeField {...props} text={text} title={label} prompt={prompt}
    style={style}
    revision={controlled.revision} acknowledgedEvent={controlled.acknowledgedEvent}
    onTextChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)}
    onSubmit={({ nativeEvent }) => { if (nativeEvent.revision === revision) onSubmit?.() }} />
}
