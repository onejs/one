import { Children, createContext, useContext } from 'react'
import NativeComposeNode from './specs/OneNativeComposeNodeNativeComponent'
import { useControlled } from './controlled'
import { getSyncStateId } from './syncStore'
import { syncHandleOf, useSyncValue } from './syncNativeState'
import type {
  ComposeAlertDialogProps,
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeButtonTone,
  ComposeButtonVariant,
  ComposeColumnProps,
  ComposeContentAlignment,
  ComposeDialogProps,
  ComposeFontWeight,
  ComposeHorizontalAlignment,
  ComposeHorizontalArrangement,
  ComposeNodeProps,
  ComposeProgressIndicatorProps,
  ComposeProgressVariant,
  ComposeRowProps,
  ComposeSliderProps,
  ComposeSwitchProps,
  ComposeTextAlign,
  ComposeTextFieldKeyboardType,
  ComposeTextFieldProps,
  ComposeTextFieldVariant,
  ComposeTextProps,
  ComposeVerticalAlignment,
  ComposeVerticalArrangement,
} from './composeTypes'
import {
  assertComposeStyle,
  validateAlertDialogProps,
  validateBoxProps,
  validateButtonProps,
  validateColumnProps,
  validateDialogProps,
  validateProgressIndicatorProps,
  validateRowProps,
  validateSliderProps,
  validateSwitchProps,
  validateTextFieldProps,
  validateTextProps,
} from './composeValidation'

type ComposeNodeType =
  | 'column'
  | 'row'
  | 'box'
  | 'text'
  | 'button'
  | 'switch'
  | 'textfield'
  | 'slider'
  | 'alertdialog'
  | 'dialog'
  | 'progressindicator'

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
  variant?: ComposeButtonVariant | ComposeTextFieldVariant
  tone?: ComposeButtonTone
  value?: boolean
  acknowledgedEvent?: number
  revision?: number
  textValue?: string
  syncStateId?: number
  placeholder?: string
  keyboardType?: ComposeTextFieldKeyboardType
  secureText?: boolean
  numberValue?: number
  minimumValue?: number
  maximumValue?: number
  step?: number
  visible?: boolean
  title?: string
  message?: string
  confirmLabel?: string
  dismissLabel?: string
  progress?: number
  progressVariant?: ComposeProgressVariant
  onNativeComposeNodeButtonPress?: (event: unknown) => void
  onNativeComposeNodeSwitchValueChange?: (event: {
    nativeEvent: { value: boolean; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeTextValueChange?: (event: {
    nativeEvent: { text: string; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeNumberValueChange?: (event: {
    nativeEvent: { value: number; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeDialogConfirm?: (event: unknown) => void
  onNativeComposeNodeDialogDismiss?: (event: unknown) => void
}

const ComposeContext = createContext(false)

const leafNodeTypes: ReadonlySet<ComposeNodeType> = new Set([
  'text',
  'button',
  'switch',
  'textfield',
  'slider',
  'alertdialog',
  'progressindicator',
])

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
  if (leafNodeTypes.has(props.nodeType) && Children.count(children) > 0) {
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
  validateColumnProps({ horizontalAlignment, verticalArrangement, spacing })
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
  validateRowProps({ verticalAlignment, horizontalArrangement, spacing })
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
  validateBoxProps({ contentAlignment })
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
  validateTextProps({ text, fontSize, fontWeight, textAlign, maxLines })
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
  validateButtonProps({ label, disabled, variant, tone, onPress })
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
  validateSwitchProps({ isOn, disabled, label, onIsOnChange, revision })
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

function TextField({
  text,
  onTextChange,
  revision = 0,
  label,
  placeholder,
  disabled = false,
  variant = 'filled',
  keyboardType = 'default',
  secureText = false,
  ...props
}: ComposeTextFieldProps) {
  validateTextFieldProps({
    text,
    onTextChange,
    revision,
    label,
    placeholder,
    disabled,
    variant,
    keyboardType,
    secureText,
  })
  const syncHandle = syncHandleOf<string>(text)
  const syncedText = useSyncValue<string>(text)
  const controlled = useControlled<{
    text: string
    eventCount: number
    revision: number
  }>(
    (event) => {
      syncHandle?.set(event.text)
      onTextChange(event.text)
    },
    revision
  )
  return (
    <ComposeNode
      {...props}
      nodeType="textfield"
      textValue={syncedText}
      syncStateId={syncHandle ? getSyncStateId(syncHandle) ?? 0 : 0}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      variant={variant}
      keyboardType={keyboardType}
      secureText={secureText}
      onNativeComposeNodeTextValueChange={(event) =>
        controlled.onNativeChange(event.nativeEvent)
      }
    />
  )
}

function Slider({
  value,
  onValueChange,
  revision = 0,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  disabled = false,
  ...props
}: ComposeSliderProps) {
  validateSliderProps({
    value,
    onValueChange,
    revision,
    minimumValue,
    maximumValue,
    step,
    disabled,
  })
  const controlled = useControlled<{
    value: number
    eventCount: number
    revision: number
  }>((event) => onValueChange(event.value), revision)
  return (
    <ComposeNode
      {...props}
      nodeType="slider"
      numberValue={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      disabled={disabled}
      onNativeComposeNodeNumberValueChange={(event) =>
        controlled.onNativeChange(event.nativeEvent)
      }
    />
  )
}

function AlertDialog({
  visible,
  title,
  message,
  confirmLabel,
  dismissLabel,
  onConfirm,
  onDismiss,
  ...props
}: ComposeAlertDialogProps) {
  validateAlertDialogProps({
    visible,
    title,
    message,
    confirmLabel,
    dismissLabel,
    onConfirm,
    onDismiss,
  })
  return (
    <ComposeNode
      {...props}
      nodeType="alertdialog"
      visible={visible}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      dismissLabel={dismissLabel}
      onNativeComposeNodeDialogConfirm={() => onConfirm()}
      onNativeComposeNodeDialogDismiss={() => onDismiss()}
    />
  )
}

function Dialog({ children, visible, onDismiss, ...props }: ComposeDialogProps) {
  validateDialogProps({ visible, onDismiss })
  return (
    <ComposeNode
      {...props}
      nodeType="dialog"
      visible={visible}
      onNativeComposeNodeDialogDismiss={() => onDismiss()}
    >
      {children}
    </ComposeNode>
  )
}

function ProgressIndicator({
  variant = 'circular',
  progress,
  ...props
}: ComposeProgressIndicatorProps) {
  validateProgressIndicatorProps({ variant, progress })
  return (
    <ComposeNode
      {...props}
      nodeType="progressindicator"
      progressVariant={variant}
      progress={progress}
    />
  )
}

export const Compose = {
  Column,
  Row,
  Box,
  Text,
  Button,
  Switch,
  TextField,
  Slider,
  AlertDialog,
  Dialog,
  ProgressIndicator,
}
