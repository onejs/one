import { Field, type TextFieldProps } from './TextField.linux'

export type SecureFieldProps = TextFieldProps

export function SecureField(props: SecureFieldProps) {
  return <Field {...props} secure />
}
