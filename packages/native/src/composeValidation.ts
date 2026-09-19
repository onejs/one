import type {
  ComposeAlertDialogProps,
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeColumnProps,
  ComposeDialogProps,
  ComposeProgressIndicatorProps,
  ComposeRowProps,
  ComposeSliderProps,
  ComposeStyle,
  ComposeSwitchProps,
  ComposeTextFieldProps,
  ComposeTextProps,
} from './composeTypes'

export const horizontalAlignments = ['start', 'centerHorizontally', 'end'] as const
export const verticalAlignments = ['top', 'centerVertically', 'bottom'] as const
export const contentAlignments = [
  'topStart',
  'topCenter',
  'topEnd',
  'centerStart',
  'center',
  'centerEnd',
  'bottomStart',
  'bottomCenter',
  'bottomEnd',
  'top',
  'bottom',
  'start',
  'end',
] as const
export const verticalArrangements = [
  'top',
  'center',
  'bottom',
  'spaceBetween',
  'spaceAround',
  'spaceEvenly',
] as const
export const horizontalArrangements = [
  'start',
  'center',
  'end',
  'spaceBetween',
  'spaceAround',
  'spaceEvenly',
] as const
export const textAlignments = [
  'unspecified',
  'left',
  'right',
  'center',
  'justify',
  'start',
  'end',
] as const
export const fontWeights = [
  'thin',
  'extraLight',
  'light',
  'normal',
  'medium',
  'semiBold',
  'bold',
  'extraBold',
  'black',
] as const
export const buttonVariants = ['filled', 'outlined', 'text'] as const
export const buttonTones = ['default', 'danger'] as const
export const textFieldVariants = ['filled', 'outlined'] as const
export const textFieldKeyboardTypes = [
  'default',
  'number',
  'decimal',
  'email',
  'password',
  'phone',
  'url',
] as const
export const progressVariants = ['linear', 'circular'] as const

const composeStyleKeys = new Set([
  'backgroundColor',
  'foregroundColor',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'width',
  'height',
  'fillMaxWidth',
  'fillMaxHeight',
  'cornerRadius',
  'opacity',
  'borderColor',
  'borderWidth',
])

const composeStyleNumberKeys = new Set([
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'width',
  'height',
  'cornerRadius',
  'borderWidth',
])

const composeStyleColorKeys = new Set([
  'backgroundColor',
  'foregroundColor',
  'borderColor',
])

export function assertComposeStyle(style: ComposeStyle | undefined) {
  if (style === undefined) return
  if (!style || typeof style !== 'object' || Array.isArray(style))
    throw new Error('Compose composeStyle must be an object')
  for (const key of Object.keys(style)) {
    if (!composeStyleKeys.has(key))
      throw new Error(`Compose composeStyle does not support ${key}`)
    const value = style[key as keyof ComposeStyle]
    if (value === undefined) continue
    if (composeStyleNumberKeys.has(key)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
        throw new Error(`Compose composeStyle ${key} must be a nonnegative finite number`)
      continue
    }
    if (key === 'opacity') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
        throw new Error('Compose composeStyle opacity must be a number from 0 to 1')
      continue
    }
    if (composeStyleColorKeys.has(key)) {
      const colorValue = value as unknown
      const resourcePaths =
        colorValue &&
        typeof colorValue === 'object' &&
        'resource_paths' in colorValue
          ? colorValue.resource_paths
          : undefined
      if (
        (typeof value !== 'string' || !value.trim()) &&
        (typeof value !== 'number' || !Number.isFinite(value)) &&
        (!Array.isArray(resourcePaths) ||
          resourcePaths.length === 0 ||
          resourcePaths.some((path) => typeof path !== 'string' || !path))
      )
        throw new Error(`Compose composeStyle ${key} must be a color value`)
      continue
    }
    if (typeof value !== 'boolean')
      throw new Error(`Compose composeStyle ${key} must be a boolean`)
  }
}

export function assertString(
  value: unknown,
  name: string,
  nonEmpty = false
): asserts value is string {
  if (typeof value !== 'string' || (nonEmpty && !value.trim()))
    throw new Error(`Compose ${name} must be${nonEmpty ? ' a non-empty' : ''} string`)
}

export function assertOptionalString(value: unknown, name: string) {
  if (value !== undefined) assertString(value, name)
}

export function assertBoolean(value: unknown, name: string) {
  if (typeof value !== 'boolean') throw new Error(`Compose ${name} must be a boolean`)
}

export function assertOptionalBoolean(value: unknown, name: string) {
  if (value !== undefined) assertBoolean(value, name)
}

export function assertOneOf<T extends string>(
  value: unknown,
  name: string,
  values: readonly T[]
) {
  if (!values.includes(value as T))
    throw new Error(`Compose ${name} must be one of ${values.join(', ')}`)
}

export function assertFiniteNumber(value: unknown, name: string) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Compose ${name} must be a finite number`)
}

export function assertFunction(value: unknown, name: string) {
  if (typeof value !== 'function') throw new Error(`Compose ${name} must be a function`)
}

export function validateColumnProps(props: ComposeColumnProps) {
  const horizontalAlignment = props.horizontalAlignment ?? 'start'
  const verticalArrangement = props.verticalArrangement ?? 'top'
  assertOneOf(horizontalAlignment, 'Column horizontalAlignment', horizontalAlignments)
  assertOneOf(verticalArrangement, 'Column verticalArrangement', verticalArrangements)
  if (props.spacing !== undefined && (!Number.isFinite(props.spacing) || props.spacing < 0))
    throw new Error('Compose Column spacing must be a nonnegative finite number')
  if (props.spacing !== undefined && verticalArrangement.startsWith('space'))
    throw new Error(
      'Compose Column spacing cannot be combined with a space-distribution arrangement'
    )
}

export function validateRowProps(props: ComposeRowProps) {
  const verticalAlignment = props.verticalAlignment ?? 'top'
  const horizontalArrangement = props.horizontalArrangement ?? 'start'
  assertOneOf(verticalAlignment, 'Row verticalAlignment', verticalAlignments)
  assertOneOf(horizontalArrangement, 'Row horizontalArrangement', horizontalArrangements)
  if (props.spacing !== undefined && (!Number.isFinite(props.spacing) || props.spacing < 0))
    throw new Error('Compose Row spacing must be a nonnegative finite number')
  if (props.spacing !== undefined && horizontalArrangement.startsWith('space'))
    throw new Error(
      'Compose Row spacing cannot be combined with a space-distribution arrangement'
    )
}

export function validateBoxProps(props: ComposeBoxProps) {
  assertOneOf(
    props.contentAlignment ?? 'topStart',
    'Box contentAlignment',
    contentAlignments
  )
}

export function validateTextProps(props: ComposeTextProps) {
  assertString(props.text, 'Text text')
  if (props.fontSize !== undefined && (!Number.isFinite(props.fontSize) || props.fontSize <= 0))
    throw new Error('Compose Text fontSize must be a positive finite number')
  if (props.fontWeight !== undefined)
    assertOneOf(props.fontWeight, 'Text fontWeight', fontWeights)
  if (props.textAlign !== undefined) assertOneOf(props.textAlign, 'Text textAlign', textAlignments)
  if (props.maxLines !== undefined && (!Number.isInteger(props.maxLines) || props.maxLines <= 0))
    throw new Error('Compose Text maxLines must be a positive integer')
}

export function validateButtonProps(props: ComposeButtonProps) {
  assertString(props.label, 'Button label', true)
  assertBoolean(props.disabled ?? false, 'Button disabled')
  assertOneOf(props.variant ?? 'filled', 'Button variant', buttonVariants)
  assertOneOf(props.tone ?? 'default', 'Button tone', buttonTones)
  if (props.onPress !== undefined) assertFunction(props.onPress, 'Button onPress')
}

export function validateSwitchProps(props: ComposeSwitchProps) {
  assertBoolean(props.isOn, 'Switch isOn')
  assertBoolean(props.disabled ?? false, 'Switch disabled')
  assertString(props.label ?? '', 'Switch label')
  assertFunction(props.onIsOnChange, 'Switch onIsOnChange')
}

export function validateTextFieldProps(props: ComposeTextFieldProps) {
  assertString(props.text, 'TextField text')
  assertFunction(props.onTextChange, 'TextField onTextChange')
  assertOptionalString(props.label, 'TextField label')
  assertOptionalString(props.placeholder, 'TextField placeholder')
  assertOptionalBoolean(props.disabled, 'TextField disabled')
  if (props.variant !== undefined)
    assertOneOf(props.variant, 'TextField variant', textFieldVariants)
  if (props.keyboardType !== undefined)
    assertOneOf(props.keyboardType, 'TextField keyboardType', textFieldKeyboardTypes)
  assertOptionalBoolean(props.secureText, 'TextField secureText')
}

export function validateSliderProps(props: ComposeSliderProps) {
  const minimumValue = props.minimumValue ?? 0
  const maximumValue = props.maximumValue ?? 1
  const step = props.step ?? 0
  assertFiniteNumber(props.value, 'Slider value')
  assertFiniteNumber(minimumValue, 'Slider minimumValue')
  assertFiniteNumber(maximumValue, 'Slider maximumValue')
  assertFiniteNumber(step, 'Slider step')
  if (minimumValue >= maximumValue)
    throw new Error('Compose Slider minimumValue must be less than maximumValue')
  if (
    !Number.isFinite(Math.fround(minimumValue)) ||
    !Number.isFinite(Math.fround(maximumValue)) ||
    Math.fround(minimumValue) >= Math.fround(maximumValue)
  )
    throw new Error('Compose Slider range must be representable by Android Float values')
  if (step < 0) throw new Error('Compose Slider step must be a nonnegative finite number')
  if (step > 0) {
    const intervals = (maximumValue - minimumValue) / step
    const roundedIntervals = Math.round(intervals)
    if (
      Math.abs(intervals - roundedIntervals) >
      Number.EPSILON * Math.max(1, Math.abs(intervals)) * 8
    )
      throw new Error('Compose Slider step must evenly divide its range')
    if (roundedIntervals > 1001)
      throw new Error('Compose Slider step must produce at most 1001 intervals')
  }
  if (props.value < minimumValue || props.value > maximumValue)
    throw new Error('Compose Slider value must be between minimumValue and maximumValue')
  assertFunction(props.onValueChange, 'Slider onValueChange')
  assertOptionalBoolean(props.disabled, 'Slider disabled')
}

export function validateAlertDialogProps(props: ComposeAlertDialogProps) {
  assertBoolean(props.visible, 'AlertDialog visible')
  assertOptionalString(props.title, 'AlertDialog title')
  assertOptionalString(props.message, 'AlertDialog message')
  assertString(props.confirmLabel, 'AlertDialog confirmLabel', true)
  assertOptionalString(props.dismissLabel, 'AlertDialog dismissLabel')
  assertFunction(props.onConfirm, 'AlertDialog onConfirm')
  assertFunction(props.onDismiss, 'AlertDialog onDismiss')
}

export function validateDialogProps(props: ComposeDialogProps) {
  assertBoolean(props.visible, 'Dialog visible')
  assertFunction(props.onDismiss, 'Dialog onDismiss')
}

export function validateProgressIndicatorProps(props: ComposeProgressIndicatorProps) {
  if (props.variant !== undefined)
    assertOneOf(props.variant, 'ProgressIndicator variant', progressVariants)
  if (
    props.progress !== undefined &&
    (typeof props.progress !== 'number' ||
      !Number.isFinite(props.progress) ||
      props.progress < 0 ||
      props.progress > 1)
  )
    throw new Error('Compose ProgressIndicator progress must be a number from 0 to 1')
}
