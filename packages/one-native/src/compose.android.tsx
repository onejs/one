import { Children, createContext, useContext } from 'react'
import NativeComposeNode from './specs/OneNativeComposeNodeNativeComponent'
import { useControlled } from './controlled'
import type {
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeButtonTone,
  ComposeButtonVariant,
  ComposeColumnProps,
  ComposeContentAlignment,
  ComposeFontWeight,
  ComposeHorizontalAlignment,
  ComposeHorizontalArrangement,
  ComposeNodeProps,
  ComposeRowProps,
  ComposeStyle,
  ComposeSwitchProps,
  ComposeTextAlign,
  ComposeTextProps,
  ComposeVerticalAlignment,
  ComposeVerticalArrangement,
} from './composeTypes'

type ComposeNodeType = 'column' | 'row' | 'box' | 'text' | 'button' | 'switch'

type ComposeNativeNodeProps = ComposeNodeProps & {
  nodeType: ComposeNodeType
  alignment?:
    | ComposeHorizontalAlignment
    | ComposeVerticalAlignment
    | ComposeContentAlignment
  arrangement?: ComposeHorizontalArrangement | ComposeVerticalArrangement
  spacing?: number
  text?: string
  fontSize?: number
  fontWeight?: ComposeFontWeight
  textAlign?: ComposeTextAlign
  maxLines?: number
  label?: string
  disabled?: boolean
  variant?: ComposeButtonVariant
  tone?: ComposeButtonTone
  value?: boolean
  acknowledgedEvent?: number
  revision?: number
  onNativeComposeNodeButtonPress?: (event: unknown) => void
  onNativeComposeNodeSwitchValueChange?: (event: {
    nativeEvent: { value: boolean; eventCount: number; revision: number }
  }) => void
}

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

function assertComposeStyle(style: ComposeStyle | undefined) {
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

function assertString(
  value: unknown,
  name: string,
  nonEmpty = false
): asserts value is string {
  if (typeof value !== 'string' || (nonEmpty && !value.trim()))
    throw new Error(`Compose ${name} must be${nonEmpty ? ' a non-empty' : ''} string`)
}

function assertBoolean(value: unknown, name: string) {
  if (typeof value !== 'boolean') throw new Error(`Compose ${name} must be a boolean`)
}

function assertOneOf<T extends string>(
  value: unknown,
  name: string,
  values: readonly T[]
) {
  if (!values.includes(value as T))
    throw new Error(`Compose ${name} must be one of ${values.join(', ')}`)
}

const horizontalAlignments = ['start', 'centerHorizontally', 'end'] as const
const verticalAlignments = ['top', 'centerVertically', 'bottom'] as const
const contentAlignments = [
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
const verticalArrangements = [
  'top',
  'center',
  'bottom',
  'spaceBetween',
  'spaceAround',
  'spaceEvenly',
] as const
const horizontalArrangements = [
  'start',
  'center',
  'end',
  'spaceBetween',
  'spaceAround',
  'spaceEvenly',
] as const
const textAlignments = [
  'unspecified',
  'left',
  'right',
  'center',
  'justify',
  'start',
  'end',
] as const
const fontWeights = [
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
const buttonVariants = ['filled', 'outlined', 'text'] as const
const buttonTones = ['default', 'danger'] as const

const ComposeContext = createContext(false)

function ComposeNode({
  children,
  style,
  composeStyle,
  ...props
}: ComposeNativeNodeProps) {
  const nested = useContext(ComposeContext)
  if (nested && style != null)
    throw new Error(
      'Compose nodes nested in a Compose tree must use composeStyle instead of style'
    )
  assertComposeStyle(composeStyle)
  if (
    (props.nodeType === 'text' ||
      props.nodeType === 'button' ||
      props.nodeType === 'switch') &&
    Children.count(children) > 0
  ) {
    throw new Error(`Compose ${props.nodeType} does not accept children`)
  }
  return (
    <NativeComposeNode
      {...props}
      composeStyle={composeStyle}
      style={nested ? undefined : style}
      collapsable={false}
    >
      <ComposeContext.Provider value={true}>{children}</ComposeContext.Provider>
    </NativeComposeNode>
  )
}

function Column({
  children,
  horizontalAlignment = 'start',
  verticalArrangement = 'top',
  spacing,
  ...props
}: ComposeColumnProps) {
  assertOneOf(horizontalAlignment, 'Column horizontalAlignment', horizontalAlignments)
  assertOneOf(verticalArrangement, 'Column verticalArrangement', verticalArrangements)
  if (spacing !== undefined && (!Number.isFinite(spacing) || spacing < 0))
    throw new Error('Compose Column spacing must be a nonnegative finite number')
  if (spacing !== undefined && verticalArrangement.startsWith('space'))
    throw new Error(
      'Compose Column spacing cannot be combined with a space-distribution arrangement'
    )
  return (
    <ComposeNode
      {...props}
      nodeType="column"
      alignment={horizontalAlignment}
      arrangement={verticalArrangement}
      spacing={spacing}
    >
      {children}
    </ComposeNode>
  )
}

function Row({
  children,
  verticalAlignment = 'top',
  horizontalArrangement = 'start',
  spacing,
  ...props
}: ComposeRowProps) {
  assertOneOf(verticalAlignment, 'Row verticalAlignment', verticalAlignments)
  assertOneOf(horizontalArrangement, 'Row horizontalArrangement', horizontalArrangements)
  if (spacing !== undefined && (!Number.isFinite(spacing) || spacing < 0))
    throw new Error('Compose Row spacing must be a nonnegative finite number')
  if (spacing !== undefined && horizontalArrangement.startsWith('space'))
    throw new Error(
      'Compose Row spacing cannot be combined with a space-distribution arrangement'
    )
  return (
    <ComposeNode
      {...props}
      nodeType="row"
      alignment={verticalAlignment}
      arrangement={horizontalArrangement}
      spacing={spacing}
    >
      {children}
    </ComposeNode>
  )
}

function Box({ children, contentAlignment = 'topStart', ...props }: ComposeBoxProps) {
  assertOneOf(contentAlignment, 'Box contentAlignment', contentAlignments)
  return (
    <ComposeNode {...props} nodeType="box" alignment={contentAlignment}>
      {children}
    </ComposeNode>
  )
}

function Text({
  text,
  fontSize,
  fontWeight,
  textAlign,
  maxLines,
  ...props
}: ComposeTextProps) {
  assertString(text, 'Text text')
  if (fontSize !== undefined && (!Number.isFinite(fontSize) || fontSize <= 0))
    throw new Error('Compose Text fontSize must be a positive finite number')
  if (fontWeight !== undefined) assertOneOf(fontWeight, 'Text fontWeight', fontWeights)
  if (textAlign !== undefined) assertOneOf(textAlign, 'Text textAlign', textAlignments)
  if (maxLines !== undefined && (!Number.isInteger(maxLines) || maxLines <= 0))
    throw new Error('Compose Text maxLines must be a positive integer')
  return (
    <ComposeNode
      {...props}
      nodeType="text"
      text={text}
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAlign={textAlign}
      maxLines={maxLines}
    />
  )
}

function Button({
  label,
  disabled = false,
  variant = 'filled',
  tone = 'default',
  onPress,
  ...props
}: ComposeButtonProps) {
  assertString(label, 'Button label', true)
  assertBoolean(disabled, 'Button disabled')
  assertOneOf(variant, 'Button variant', buttonVariants)
  assertOneOf(tone, 'Button tone', buttonTones)
  if (onPress !== undefined && typeof onPress !== 'function')
    throw new Error('Compose Button onPress must be a function')
  return (
    <ComposeNode
      {...props}
      nodeType="button"
      label={label}
      disabled={disabled}
      variant={variant}
      tone={tone}
      onNativeComposeNodeButtonPress={onPress ? () => onPress() : undefined}
    />
  )
}

function Switch({
  isOn,
  disabled = false,
  label = '',
  onIsOnChange,
  revision = 0,
  ...props
}: ComposeSwitchProps) {
  assertBoolean(isOn, 'Switch isOn')
  assertBoolean(disabled, 'Switch disabled')
  assertString(label, 'Switch label')
  if (typeof onIsOnChange !== 'function')
    throw new Error('Compose Switch onIsOnChange must be a function')
  const controlled = useControlled<{
    value: boolean
    eventCount: number
    revision: number
  }>((event) => onIsOnChange(event.value), revision)
  return (
    <ComposeNode
      {...props}
      nodeType="switch"
      value={isOn}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      label={label}
      disabled={disabled}
      onNativeComposeNodeSwitchValueChange={(event) =>
        controlled.onNativeChange(event.nativeEvent)
      }
    />
  )
}

export const Compose = { Column, Row, Box, Text, Button, Switch }
