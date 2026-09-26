import type { ColorValue, ViewProps } from 'react-native'
import type {
  DirectEventHandler,
  Double,
  Int32,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

type ComposeStyleNative = Readonly<{
  backgroundColor?: ColorValue
  foregroundColor?: ColorValue
  padding?: WithDefault<Double, -1>
  paddingTop?: WithDefault<Double, -1>
  paddingRight?: WithDefault<Double, -1>
  paddingBottom?: WithDefault<Double, -1>
  paddingLeft?: WithDefault<Double, -1>
  width?: WithDefault<Double, -1>
  height?: WithDefault<Double, -1>
  fillMaxWidth?: boolean
  fillMaxHeight?: boolean
  cornerRadius?: WithDefault<Double, -1>
  opacity?: WithDefault<Double, -1>
  borderColor?: ColorValue
  borderWidth?: WithDefault<Double, -1>
}>

interface NativeProps extends ViewProps {
  nodeType: string
  text?: string
  fontSize?: WithDefault<Double, -1>
  fontWeight?: string
  textAlign?: string
  maxLines?: Int32
  label?: string
  disabled?: boolean
  variant?: string
  tone?: string
  icon?: string
  iconFilled?: boolean
  colorRole?: string
  value?: boolean
  nativeClickable?: boolean
  checkboxColors?: Readonly<{
    checkedColor?: ColorValue
    disabledCheckedColor?: ColorValue
    uncheckedColor?: ColorValue
    disabledUncheckedColor?: ColorValue
    checkmarkColor?: ColorValue
  }>
  selected?: boolean
  radioColors?: Readonly<{
    selectedColor?: ColorValue
    unselectedColor?: ColorValue
    disabledSelectedColor?: ColorValue
    disabledUnselectedColor?: ColorValue
  }>
  acknowledgedEvent?: Int32
  revision?: Int32
  alignment?: string
  arrangement?: string
  spacing?: WithDefault<Double, -1>
  textValue?: string
  syncStateId?: Int32
  placeholder?: string
  keyboardType?: string
  secureText?: boolean
  focused?: boolean
  focusRevision?: Int32
  acknowledgedFocusEvent?: Int32
  imeAction?: string
  maxLength?: Int32
  multiline?: boolean
  capitalization?: string
  autoCorrect?: boolean
  numberValue?: WithDefault<Double, 0>
  minimumValue?: WithDefault<Double, 0>
  maximumValue?: WithDefault<Double, 1>
  step?: WithDefault<Double, 0>
  visible?: boolean
  title?: string
  message?: string
  confirmLabel?: string
  dismissLabel?: string
  progress?: WithDefault<Double, -1>
  progressVariant?: string
  composeStyle?: ComposeStyleNative
  onNativeComposeNodeButtonPress?: DirectEventHandler<Readonly<{ eventCount: Int32 }>>
  onNativeComposeNodeBooleanValueChange?: DirectEventHandler<
    Readonly<{ value: boolean; eventCount: Int32; revision: Int32 }>
  >
  onNativeComposeNodeTextValueChange?: DirectEventHandler<
    Readonly<{ text: string; eventCount: Int32; revision: Int32 }>
  >
  onNativeComposeNodeTextFieldFocusChange?: DirectEventHandler<
    Readonly<{ value: boolean; eventCount: Int32; revision: Int32 }>
  >
  onNativeComposeNodeTextFieldSubmit?: DirectEventHandler<Readonly<{ eventCount: Int32 }>>
  onNativeComposeNodeNumberValueChange?: DirectEventHandler<
    Readonly<{ value: Double; eventCount: Int32; revision: Int32 }>
  >
  onNativeComposeNodeDialogConfirm?: DirectEventHandler<Readonly<{ eventCount: Int32 }>>
  onNativeComposeNodeDialogDismiss?: DirectEventHandler<Readonly<{ eventCount: Int32 }>>
}

export default codegenNativeComponent<NativeProps>('OneNativeComposeNode', {
  excludedPlatforms: ['iOS'],
  interfaceOnly: false,
})
