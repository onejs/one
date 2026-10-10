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
  weight?: WithDefault<Double, -1>
  cornerRadius?: WithDefault<Double, -1>
  opacity?: WithDefault<Double, -1>
  borderColor?: ColorValue
  borderWidth?: WithDefault<Double, -1>
}>

interface NativeProps extends ViewProps {
  nodeType: string
  intrinsicHeight?: boolean
  onNativeComposeNodeContentSizeChange?: DirectEventHandler<Readonly<{ height: Double }>>
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
  switchColors?: Readonly<{
    checkedThumbColor?: ColorValue
    checkedTrackColor?: ColorValue
    checkedBorderColor?: ColorValue
    checkedIconColor?: ColorValue
    uncheckedThumbColor?: ColorValue
    uncheckedTrackColor?: ColorValue
    uncheckedBorderColor?: ColorValue
    uncheckedIconColor?: ColorValue
    disabledCheckedThumbColor?: ColorValue
    disabledCheckedTrackColor?: ColorValue
    disabledCheckedBorderColor?: ColorValue
    disabledCheckedIconColor?: ColorValue
    disabledUncheckedThumbColor?: ColorValue
    disabledUncheckedTrackColor?: ColorValue
    disabledUncheckedBorderColor?: ColorValue
    disabledUncheckedIconColor?: ColorValue
  }>
  cardColors?: Readonly<{
    containerColor?: ColorValue
    contentColor?: ColorValue
  }>
  surfaceMode?: string
  badgeColors?: Readonly<{
    containerColor?: ColorValue
    contentColor?: ColorValue
  }>
  listItemColors?: Readonly<{
    containerColor?: ColorValue
    contentColor?: ColorValue
    leadingContentColor?: ColorValue
    trailingContentColor?: ColorValue
    supportingContentColor?: ColorValue
    overlineContentColor?: ColorValue
  }>
  tonalElevation?: WithDefault<Double, -1>
  shadowElevation?: WithDefault<Double, -1>
  cardElevation?: WithDefault<Double, -1>
  cardBorder?: Readonly<{
    width?: WithDefault<Double, 1>
    color?: ColorValue
  }>
  dividerStyle?: Readonly<{
    thickness?: WithDefault<Double, -1>
    color?: ColorValue
  }>
  slotName?: string
  chipColors?: Readonly<{
    containerColor?: ColorValue
    labelColor?: ColorValue
    iconColor?: ColorValue
    iconContentColor?: ColorValue
    leadingIconContentColor?: ColorValue
    trailingIconContentColor?: ColorValue
    leadingIconColor?: ColorValue
    trailingIconColor?: ColorValue
    selectedContainerColor?: ColorValue
    selectedLabelColor?: ColorValue
    selectedLeadingIconColor?: ColorValue
    selectedTrailingIconColor?: ColorValue
  }>
  chipElevation?: WithDefault<Double, -1>
  chipBorder?: Readonly<{
    width?: WithDefault<Double, 1>
    color?: ColorValue
  }>
  iconButtonColors?: Readonly<{
    containerColor?: ColorValue
    contentColor?: ColorValue
    disabledContainerColor?: ColorValue
    disabledContentColor?: ColorValue
  }>
  fabColors?: Readonly<{
    containerColor?: ColorValue
  }>
  fabExpanded?: boolean
  toggleButtonColors?: Readonly<{
    containerColor?: ColorValue
    contentColor?: ColorValue
    checkedContainerColor?: ColorValue
    checkedContentColor?: ColorValue
    disabledContainerColor?: ColorValue
    disabledContentColor?: ColorValue
  }>
  segmentedButtonColors?: Readonly<{
    activeBorderColor?: ColorValue
    activeContentColor?: ColorValue
    inactiveBorderColor?: ColorValue
    inactiveContentColor?: ColorValue
    disabledActiveBorderColor?: ColorValue
    disabledActiveContentColor?: ColorValue
    disabledInactiveBorderColor?: ColorValue
    disabledInactiveContentColor?: ColorValue
    activeContainerColor?: ColorValue
    inactiveContainerColor?: ColorValue
    disabledActiveContainerColor?: ColorValue
    disabledInactiveContainerColor?: ColorValue
  }>
  loadingColors?: Readonly<{
    color?: ColorValue
    containerColor?: ColorValue
  }>
  acknowledgedEvent?: Int32
  revision?: Int32
  alignment?: string
  arrangement?: string
  verticalArrangement?: string
  spacing?: WithDefault<Double, -1>
  verticalSpacing?: WithDefault<Double, -1>
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
  sliderOptions?: Readonly<{
    lowerLimit?: Double
    upperLimit?: Double
    colors?: Readonly<{
      thumbColor?: ColorValue
      activeTrackColor?: ColorValue
      inactiveTrackColor?: ColorValue
      activeTickColor?: ColorValue
      inactiveTickColor?: ColorValue
    }>
  }>
  pickerOptions?: Readonly<{
    showModeToggle?: WithDefault<boolean, true>
    is24Hour?: boolean
    minimumDay?: Double
    maximumDay?: Double
    color?: ColorValue
    colors?: Readonly<{
      containerColor?: ColorValue
      titleContentColor?: ColorValue
      headlineContentColor?: ColorValue
      weekdayContentColor?: ColorValue
      subheadContentColor?: ColorValue
      navigationContentColor?: ColorValue
      yearContentColor?: ColorValue
      disabledYearContentColor?: ColorValue
      currentYearContentColor?: ColorValue
      selectedYearContentColor?: ColorValue
      disabledSelectedYearContentColor?: ColorValue
      selectedYearContainerColor?: ColorValue
      disabledSelectedYearContainerColor?: ColorValue
      dayContentColor?: ColorValue
      disabledDayContentColor?: ColorValue
      selectedDayContentColor?: ColorValue
      disabledSelectedDayContentColor?: ColorValue
      selectedDayContainerColor?: ColorValue
      disabledSelectedDayContainerColor?: ColorValue
      todayContentColor?: ColorValue
      todayDateBorderColor?: ColorValue
      dayInSelectionRangeContentColor?: ColorValue
      dayInSelectionRangeContainerColor?: ColorValue
      dividerColor?: ColorValue
      clockDialColor?: ColorValue
      clockDialSelectedContentColor?: ColorValue
      clockDialUnselectedContentColor?: ColorValue
      selectorColor?: ColorValue
      periodSelectorBorderColor?: ColorValue
      periodSelectorSelectedContainerColor?: ColorValue
      periodSelectorUnselectedContainerColor?: ColorValue
      periodSelectorSelectedContentColor?: ColorValue
      periodSelectorUnselectedContentColor?: ColorValue
      timeSelectorSelectedContainerColor?: ColorValue
      timeSelectorUnselectedContainerColor?: ColorValue
      timeSelectorSelectedContentColor?: ColorValue
      timeSelectorUnselectedContentColor?: ColorValue
    }>
  }>
  step?: WithDefault<Double, 0>
  visible?: boolean
  title?: string
  message?: string
  confirmLabel?: string
  dismissLabel?: string
  progress?: WithDefault<Double, -1>
  progressVariant?: string
  progressOptions?: Readonly<{
    color?: ColorValue
    trackColor?: ColorValue
    strokeCap?: string
    gapSize?: Double
    strokeWidth?: Double
    drawStopIndicator?: Readonly<{
      color?: ColorValue
      strokeCap?: string
      stopSize?: Double
    }>
    stopSize?: Double
    amplitude?: Double
    wavelength?: Double
    waveSpeed?: Double
  }>
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
  onNativeComposeNodeDialogConfirm?: DirectEventHandler<
    Readonly<{ eventCount: Int32; value: Double }>
  >
  onNativeComposeNodeDialogDismiss?: DirectEventHandler<Readonly<{ eventCount: Int32 }>>
}

export default codegenNativeComponent<NativeProps>('OneNativeComposeNode', {
  excludedPlatforms: ['iOS'],
  interfaceOnly: false,
})
