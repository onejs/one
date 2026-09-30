import type {
  ComposeAlertDialogProps,
  ComposeAssistChipProps,
  ComposeBadgeProps,
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeCardProps,
  ComposeCheckboxProps,
  ComposeColumnProps,
  ComposeDialogProps,
  ComposeDividerProps,
  ComposeFilterChipProps,
  ComposeFlowRowProps,
  ComposeFloatingActionButtonProps,
  ComposeIconProps,
  ComposeIconButtonProps,
  ComposeInputChipProps,
  ComposeListItemProps,
  ComposeLoadingIndicatorProps,
  ComposeContainedLoadingIndicatorProps,
  ComposeProgressIndicatorProps,
  ComposeRadioButtonProps,
  ComposeRowProps,
  ComposeSliderProps,
  ComposeSuggestionChipProps,
  ComposeStyle,
  ComposeSurfaceProps,
  ComposeSwitchProps,
  ComposeTextFieldProps,
  ComposeTextProps,
  ComposeToggleButtonProps,
  ComposeSegmentedButtonProps,
} from './composeTypes'
import { composeIconCodepoints, type ComposeIconName } from './generated/composeIcons'
import { isSyncState } from './syncStore'

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
export const buttonVariants = ['filled', 'tonal', 'elevated', 'outlined', 'text'] as const
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
export const textFieldImeActions = [
  'default',
  'none',
  'go',
  'search',
  'send',
  'previous',
  'next',
  'done',
] as const
export const textFieldCapitalizations = [
  'none',
  'characters',
  'words',
  'sentences',
] as const
export const progressVariants = ['linear', 'circular', 'linearWavy', 'circularWavy'] as const
export const progressStrokeCaps = ['round', 'butt', 'square'] as const

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
  'weight',
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
const checkboxColorKeys = new Set([
  'checkedColor',
  'disabledCheckedColor',
  'uncheckedColor',
  'disabledUncheckedColor',
  'checkmarkColor',
])
const radioColorKeys = new Set([
  'selectedColor',
  'unselectedColor',
  'disabledSelectedColor',
  'disabledUnselectedColor',
])
const cardColorKeys = new Set(['containerColor', 'contentColor'])
const listItemColorKeys = new Set([
  'containerColor',
  'contentColor',
  'leadingContentColor',
  'trailingContentColor',
  'supportingContentColor',
  'overlineContentColor',
])

export function validateListItemProps(props: ComposeListItemProps) {
  if (props.colors !== undefined) assertComposeColors(props.colors, listItemColorKeys, 'ListItem')
  if (props.tonalElevation !== undefined) {
    assertFiniteNumber(props.tonalElevation, 'ListItem tonalElevation')
    if (props.tonalElevation < 0)
      throw new Error('Compose ListItem tonalElevation must be nonnegative')
  }
  if (props.shadowElevation !== undefined) {
    assertFiniteNumber(props.shadowElevation, 'ListItem shadowElevation')
    if (props.shadowElevation < 0)
      throw new Error('Compose ListItem shadowElevation must be nonnegative')
  }
}

export function validateBadgeProps(
  props: Pick<ComposeBadgeProps, 'containerColor' | 'contentColor'>
) {
  if (props.containerColor !== undefined)
    assertComposeColorValue(props.containerColor, 'Badge containerColor')
  if (props.contentColor !== undefined)
    assertComposeColorValue(props.contentColor, 'Badge contentColor')
}

const assistChipColorKeys = new Set([
  'containerColor',
  'labelColor',
  'leadingIconContentColor',
  'trailingIconContentColor',
])
const filterChipColorKeys = new Set([
  'containerColor',
  'labelColor',
  'iconColor',
  'selectedContainerColor',
  'selectedLabelColor',
  'selectedLeadingIconColor',
  'selectedTrailingIconColor',
])
const inputChipColorKeys = new Set([
  'containerColor',
  'labelColor',
  'leadingIconColor',
  'trailingIconColor',
  'selectedContainerColor',
  'selectedLabelColor',
  'selectedLeadingIconColor',
  'selectedTrailingIconColor',
])
const suggestionChipColorKeys = new Set([
  'containerColor',
  'labelColor',
  'iconContentColor',
])
const iconButtonColorKeys = new Set([
  'containerColor',
  'contentColor',
  'disabledContainerColor',
  'disabledContentColor',
])
const toggleButtonColorKeys = new Set([
  'containerColor',
  'contentColor',
  'checkedContainerColor',
  'checkedContentColor',
  'disabledContainerColor',
  'disabledContentColor',
])
const segmentedButtonColorKeys = new Set([
  'activeBorderColor',
  'activeContentColor',
  'inactiveBorderColor',
  'inactiveContentColor',
  'disabledActiveBorderColor',
  'disabledActiveContentColor',
  'disabledInactiveBorderColor',
  'disabledInactiveContentColor',
  'activeContainerColor',
  'inactiveContainerColor',
  'disabledActiveContainerColor',
  'disabledInactiveContainerColor',
])
const switchColorKeys = new Set([
  'checkedThumbColor',
  'checkedTrackColor',
  'checkedBorderColor',
  'checkedIconColor',
  'uncheckedThumbColor',
  'uncheckedTrackColor',
  'uncheckedBorderColor',
  'uncheckedIconColor',
  'disabledCheckedThumbColor',
  'disabledCheckedTrackColor',
  'disabledCheckedBorderColor',
  'disabledCheckedIconColor',
  'disabledUncheckedThumbColor',
  'disabledUncheckedTrackColor',
  'disabledUncheckedBorderColor',
  'disabledUncheckedIconColor',
])
const sliderColorKeys = new Set([
  'thumbColor',
  'activeTrackColor',
  'inactiveTrackColor',
  'activeTickColor',
  'inactiveTickColor',
])

function assertComposeColorValue(value: unknown, name: string) {
  const resourcePaths =
    value && typeof value === 'object' && 'resource_paths' in value
      ? value.resource_paths
      : undefined
  if (
    (typeof value !== 'string' || !value.trim()) &&
    (typeof value !== 'number' || !Number.isFinite(value)) &&
    (!Array.isArray(resourcePaths) ||
      resourcePaths.length === 0 ||
      resourcePaths.some((path) => typeof path !== 'string' || !path))
  )
    throw new Error(`Compose ${name} must be a color value`)
}

function assertComposeColors(
  colors: unknown,
  keys: ReadonlySet<string>,
  owner: string
) {
  if (!colors || typeof colors !== 'object' || Array.isArray(colors))
    throw new Error(`Compose ${owner} colors must be an object`)
  for (const [key, value] of Object.entries(colors)) {
    if (!keys.has(key))
      throw new Error(`Compose ${owner} colors does not support ${key}`)
    if (value !== undefined) assertComposeColorValue(value, `${owner} colors ${key}`)
  }
}

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
    if (key === 'weight') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
        throw new Error('Compose composeStyle weight must be a positive finite number')
      continue
    }
    if (composeStyleColorKeys.has(key)) {
      assertComposeColorValue(value, `composeStyle ${key}`)
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

export function validateFlowRowProps(props: ComposeFlowRowProps) {
  function arrangement(value: unknown, name: string, names: readonly string[]) {
    if (typeof value === 'string') {
      if (!names.includes(value)) throw new Error(`Compose FlowRow ${name} is unsupported`)
      return
    }
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).length !== 1 || !('spacedBy' in value) ||
        typeof value.spacedBy !== 'number' || !Number.isFinite(value.spacedBy) || value.spacedBy < 0)
      throw new Error(`Compose FlowRow ${name} spacedBy must be a nonnegative finite number`)
  }
  arrangement(props.horizontalArrangement ?? 'start', 'horizontalArrangement', horizontalArrangements)
  arrangement(props.verticalArrangement ?? 'top', 'verticalArrangement', verticalArrangements)
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

export function composeIconGlyph(owner: string, name: string) {
  if (!Object.hasOwn(composeIconCodepoints, name))
    throw new Error(
      `Compose ${owner} must be a Material Symbols name, got ${JSON.stringify(name)}`
    )
  return String.fromCodePoint(composeIconCodepoints[name as ComposeIconName])
}

export function validateIconProps(props: ComposeIconProps) {
  assertString(props.name, 'Icon name', true)
  if (props.size !== undefined && (!Number.isFinite(props.size) || props.size <= 0))
    throw new Error('Compose Icon size must be a positive finite number')
  assertOptionalBoolean(props.filled, 'Icon filled')
  composeIconGlyph('Icon name', props.name)
}

export function validateButtonProps(props: ComposeButtonProps) {
  assertString(props.label, 'Button label', true)
  assertBoolean(props.disabled ?? false, 'Button disabled')
  assertOneOf(props.variant ?? 'filled', 'Button variant', buttonVariants)
  assertOneOf(props.tone ?? 'default', 'Button tone', buttonTones)
  assertBoolean(props.iconFilled ?? false, 'Button iconFilled')
  if (props.icon !== undefined) composeIconGlyph('Button icon', props.icon)
  if (props.onPress !== undefined) assertFunction(props.onPress, 'Button onPress')
}

export function validateIconButtonProps(props: ComposeIconButtonProps) {
  assertBoolean(props.enabled ?? true, 'IconButton enabled')
  if (props.onClick !== undefined) assertFunction(props.onClick, 'IconButton onClick')
  if (props.colors !== undefined) assertComposeColors(props.colors, iconButtonColorKeys, 'IconButton')
}

export function validateFloatingActionButtonProps(props: ComposeFloatingActionButtonProps & { expanded?: boolean }, variant: string) {
  assertOneOf(variant, 'FloatingActionButton variant', ['small', 'medium', 'large', 'extended'] as const)
  assertBoolean(props.expanded ?? true, 'FloatingActionButton expanded')
  if (props.containerColor !== undefined) assertComposeColorValue(props.containerColor, 'FloatingActionButton containerColor')
  if (props.onClick !== undefined) assertFunction(props.onClick, 'FloatingActionButton onClick')
}

export function validateToggleButtonProps(props: ComposeToggleButtonProps) {
  assertBoolean(props.checked, 'ToggleButton checked')
  assertBoolean(props.enabled ?? true, 'ToggleButton enabled')
  if (props.onCheckedChange !== undefined) assertFunction(props.onCheckedChange, 'ToggleButton onCheckedChange')
  if (props.colors !== undefined) assertComposeColors(props.colors, toggleButtonColorKeys, 'ToggleButton')
}

export function validateSegmentedButtonProps(props: ComposeSegmentedButtonProps) {
  if (props.selected !== undefined) assertBoolean(props.selected, 'SegmentedButton selected')
  if (props.checked !== undefined) assertBoolean(props.checked, 'SegmentedButton checked')
  assertBoolean(props.enabled ?? true, 'SegmentedButton enabled')
  if (props.onClick !== undefined) assertFunction(props.onClick, 'SegmentedButton onClick')
  if (props.onCheckedChange !== undefined) assertFunction(props.onCheckedChange, 'SegmentedButton onCheckedChange')
  if (props.colors !== undefined) assertComposeColors(props.colors, segmentedButtonColorKeys, 'SegmentedButton')
}

export function validateSwitchProps(props: ComposeSwitchProps) {
  assertBoolean(props.isOn, 'Switch isOn')
  assertBoolean(props.disabled ?? false, 'Switch disabled')
  assertString(props.label ?? '', 'Switch label')
  assertFunction(props.onIsOnChange, 'Switch onIsOnChange')
  if (props.colors !== undefined) assertComposeColors(props.colors, switchColorKeys, 'Switch')
}

export function validateCheckboxProps(props: ComposeCheckboxProps) {
  assertBoolean(props.value, 'Checkbox value')
  assertBoolean(props.disabled ?? false, 'Checkbox disabled')
  if (props.onCheckedChange !== undefined)
    assertFunction(props.onCheckedChange, 'Checkbox onCheckedChange')
  if (props.colors !== undefined) assertComposeColors(props.colors, checkboxColorKeys, 'Checkbox')
}

export function validateRadioButtonProps(props: ComposeRadioButtonProps) {
  assertBoolean(props.selected, 'RadioButton selected')
  assertBoolean(props.disabled ?? false, 'RadioButton disabled')
  if (props.onClick !== undefined) assertFunction(props.onClick, 'RadioButton onClick')
  if (props.colors !== undefined) assertComposeColors(props.colors, radioColorKeys, 'RadioButton')
}

export function validateCardProps(
  props: ComposeCardProps,
  kind: 'Card' | 'ElevatedCard' | 'OutlinedCard'
) {
  if (props.colors !== undefined) assertComposeColors(props.colors, cardColorKeys, kind)
  if (props.elevation !== undefined) {
    assertFiniteNumber(props.elevation, `${kind} elevation`)
    if (props.elevation < 0) throw new Error(`Compose ${kind} elevation must be nonnegative`)
  }
  if (kind === 'ElevatedCard' && props.border !== undefined)
    throw new Error('Compose ElevatedCard does not support border')
  assertComposeBorder(props.border, kind)
}

export function validateSurfaceProps(props: ComposeSurfaceProps) {
  if (props.color !== undefined) assertComposeColorValue(props.color, 'Surface color')
  if (props.contentColor !== undefined) assertComposeColorValue(props.contentColor, 'Surface contentColor')
  if (props.tonalElevation !== undefined) {
    assertFiniteNumber(props.tonalElevation, 'Surface tonalElevation')
    if (props.tonalElevation < 0) throw new Error('Compose Surface tonalElevation must be nonnegative')
  }
  if (props.shadowElevation !== undefined) {
    assertFiniteNumber(props.shadowElevation, 'Surface shadowElevation')
    if (props.shadowElevation < 0) throw new Error('Compose Surface shadowElevation must be nonnegative')
  }
  assertComposeBorder(props.border, 'Surface')
  assertOptionalBoolean(props.enabled, 'Surface enabled')
  assertOptionalBoolean(props.selected, 'Surface selected')
  assertOptionalBoolean(props.checked, 'Surface checked')
  if (props.onClick !== undefined) assertFunction(props.onClick, 'Surface onClick')
  if (props.onCheckedChange !== undefined) assertFunction(props.onCheckedChange, 'Surface onCheckedChange')
}

function assertComposeBorder(border: ComposeCardProps['border'], kind: string) {
  if (border === undefined) return
  if (!border || typeof border !== 'object' || Array.isArray(border))
    throw new Error(`Compose ${kind} border must be an object`)
  for (const key of Object.keys(border))
    if (key !== 'width' && key !== 'color')
      throw new Error(`Compose ${kind} border does not support ${key}`)
  if (border.width !== undefined) {
    assertFiniteNumber(border.width, `${kind} border width`)
    if (border.width < 0)
      throw new Error(`Compose ${kind} border width must be nonnegative`)
  }
  if (border.color !== undefined) assertComposeColorValue(border.color, `${kind} border color`)
}

export function validateChipProps(
  props:
    | ComposeAssistChipProps
    | ComposeFilterChipProps
    | ComposeInputChipProps
    | ComposeSuggestionChipProps,
  kind: 'AssistChip' | 'FilterChip' | 'InputChip' | 'SuggestionChip'
) {
  const selected = 'selected' in props ? props.selected : undefined
  if (kind === 'FilterChip') assertBoolean(selected, `${kind} selected`)
  else if (kind === 'InputChip' && selected !== undefined)
    assertBoolean(selected, `${kind} selected`)
  assertBoolean(props.enabled ?? true, `${kind} enabled`)
  if (props.onClick !== undefined) assertFunction(props.onClick, `${kind} onClick`)
  if (props.colors !== undefined) {
    const keys =
      kind === 'AssistChip'
        ? assistChipColorKeys
        : kind === 'FilterChip'
          ? filterChipColorKeys
          : kind === 'InputChip'
            ? inputChipColorKeys
            : suggestionChipColorKeys
    assertComposeColors(props.colors, keys, kind)
  }
  if (props.elevation !== undefined) {
    assertFiniteNumber(props.elevation, `${kind} elevation`)
    if (props.elevation < 0) throw new Error(`Compose ${kind} elevation must be nonnegative`)
  }
  assertComposeBorder(props.border, kind)
}

export function validateDividerProps(
  props: ComposeDividerProps,
  kind: 'HorizontalDivider' | 'VerticalDivider'
) {
  if (props.thickness !== undefined) {
    assertFiniteNumber(props.thickness, `${kind} thickness`)
    if (props.thickness < 0) throw new Error(`Compose ${kind} thickness must be nonnegative`)
  }
  if (props.color !== undefined) assertComposeColorValue(props.color, `${kind} color`)
}

export function validateTextFieldProps(props: ComposeTextFieldProps) {
  if (typeof props.text !== 'string' && !isSyncState(props.text))
    throw new Error('Compose TextField text must be a string or NativeState handle')
  assertFunction(props.onTextChange, 'TextField onTextChange')
  assertOptionalString(props.label, 'TextField label')
  assertOptionalString(props.placeholder, 'TextField placeholder')
  assertOptionalBoolean(props.disabled, 'TextField disabled')
  if (props.variant !== undefined)
    assertOneOf(props.variant, 'TextField variant', textFieldVariants)
  if (props.keyboardType !== undefined)
    assertOneOf(props.keyboardType, 'TextField keyboardType', textFieldKeyboardTypes)
  assertOptionalBoolean(props.secureText, 'TextField secureText')
  assertOptionalBoolean(props.focused, 'TextField focused')
  if (props.onFocusChange !== undefined)
    assertFunction(props.onFocusChange, 'TextField onFocusChange')
  if (props.imeAction !== undefined)
    assertOneOf(props.imeAction, 'TextField imeAction', textFieldImeActions)
  if (props.onSubmit !== undefined) assertFunction(props.onSubmit, 'TextField onSubmit')
  if (
    props.maxLength !== undefined &&
    (!Number.isInteger(props.maxLength) || props.maxLength < 0)
  )
    throw new Error('Compose TextField maxLength must be a nonnegative integer')
  assertOptionalBoolean(props.multiline, 'TextField multiline')
  if (props.capitalization !== undefined)
    assertOneOf(props.capitalization, 'TextField capitalization', textFieldCapitalizations)
  assertOptionalBoolean(props.autoCorrect, 'TextField autoCorrect')
  if (props.textAlign !== undefined)
    assertOneOf(props.textAlign, 'TextField textAlign', textAlignments)
}

export function validateSliderProps(props: ComposeSliderProps) {
  const minimumValue = props.minimumValue ?? 0
  const maximumValue = props.maximumValue ?? 1
  const step = props.step ?? 0
  assertFiniteNumber(props.value, 'Slider value')
  assertFiniteNumber(minimumValue, 'Slider minimumValue')
  assertFiniteNumber(maximumValue, 'Slider maximumValue')
  assertFiniteNumber(step, 'Slider step')
  if (props.lowerLimit !== undefined) assertFiniteNumber(props.lowerLimit, 'Slider lowerLimit')
  if (props.upperLimit !== undefined) assertFiniteNumber(props.upperLimit, 'Slider upperLimit')
  if (
    (props.lowerLimit !== undefined && !Number.isFinite(Math.fround(props.lowerLimit))) ||
    (props.upperLimit !== undefined && !Number.isFinite(Math.fround(props.upperLimit)))
  )
    throw new Error('Compose Slider limits must be representable by Android Float values')
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
  if (
    Math.max(Math.fround(minimumValue), Math.fround(props.lowerLimit ?? minimumValue)) >
    Math.min(Math.fround(maximumValue), Math.fround(props.upperLimit ?? maximumValue))
  )
    throw new Error('Compose Slider limits must overlap the value range')
  assertFunction(props.onValueChange, 'Slider onValueChange')
  if (props.onValueChangeFinished !== undefined)
    assertFunction(props.onValueChangeFinished, 'Slider onValueChangeFinished')
  assertOptionalBoolean(props.disabled, 'Slider disabled')
  if (props.colors !== undefined) assertComposeColors(props.colors, sliderColorKeys, 'Slider')
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
    props.progress != null &&
    (typeof props.progress !== 'number' ||
      !Number.isFinite(props.progress) ||
      props.progress < 0 ||
      props.progress > 1)
  )
    throw new Error('Compose ProgressIndicator progress must be a number from 0 to 1')
  if (props.color !== undefined) assertComposeColorValue(props.color, 'ProgressIndicator color')
  if (props.trackColor !== undefined) assertComposeColorValue(props.trackColor, 'ProgressIndicator trackColor')
  const variant = props.variant ?? 'circular'
  if (props.strokeCap !== undefined) {
    assertOneOf(props.strokeCap, 'ProgressIndicator strokeCap', progressStrokeCaps)
    if (variant !== 'linear' && variant !== 'circular') throw new Error('Compose ProgressIndicator strokeCap requires a regular indicator')
  }
  for (const key of ['gapSize', 'strokeWidth', 'stopSize', 'amplitude', 'wavelength', 'waveSpeed'] as const) {
    const value = props[key]
    if (value === undefined) continue
    assertFiniteNumber(value, `ProgressIndicator ${key}`)
    if (value < 0 || (key === 'amplitude' && value > 1)) throw new Error(`Compose ProgressIndicator ${key} is out of range`)
  }
  if (props.gapSize !== undefined && variant !== 'linear' && variant !== 'circular') throw new Error('Compose ProgressIndicator gapSize requires a regular indicator')
  if (props.strokeWidth !== undefined && variant !== 'circular') throw new Error('Compose ProgressIndicator strokeWidth requires a circular indicator')
  if (props.stopSize !== undefined && variant !== 'linearWavy') throw new Error('Compose ProgressIndicator stopSize requires a linear wavy indicator')
  if ((props.amplitude !== undefined || props.wavelength !== undefined || props.waveSpeed !== undefined) && variant !== 'linearWavy' && variant !== 'circularWavy')
    throw new Error('Compose ProgressIndicator wave settings require a wavy indicator')
  if (props.drawStopIndicator !== undefined) {
    if (variant !== 'linear' || props.progress == null) throw new Error('Compose ProgressIndicator drawStopIndicator requires determinate linear progress')
    const stop = props.drawStopIndicator
    if (typeof stop !== 'object' || stop === null || Array.isArray(stop)) throw new Error('Compose ProgressIndicator drawStopIndicator must be an object')
    for (const key of Object.keys(stop)) if (key !== 'color' && key !== 'strokeCap' && key !== 'stopSize') throw new Error(`Compose ProgressIndicator drawStopIndicator has unknown key ${key}`)
    if (stop.color !== undefined) assertComposeColorValue(stop.color, 'ProgressIndicator drawStopIndicator color')
    if (stop.strokeCap !== undefined) assertOneOf(stop.strokeCap, 'ProgressIndicator drawStopIndicator strokeCap', progressStrokeCaps)
    if (stop.stopSize !== undefined) {
      assertFiniteNumber(stop.stopSize, 'ProgressIndicator drawStopIndicator stopSize')
      if (stop.stopSize < 0) throw new Error('Compose ProgressIndicator drawStopIndicator stopSize must be nonnegative')
    }
  }
}

export function validateLoadingIndicatorProps(props: ComposeLoadingIndicatorProps | ComposeContainedLoadingIndicatorProps) {
  if (props.progress != null && (typeof props.progress !== 'number' || !Number.isFinite(props.progress) || props.progress < 0 || props.progress > 1))
    throw new Error('Compose LoadingIndicator progress must be a number from 0 to 1')
  if (props.color !== undefined) assertComposeColorValue(props.color, 'LoadingIndicator color')
  if ('containerColor' in props && props.containerColor !== undefined)
    assertComposeColorValue(props.containerColor, 'ContainedLoadingIndicator containerColor')
}
