import { Children, createContext, useContext, type ReactNode } from 'react'
import NativeComposeNode from './specs/OneNativeComposeNodeNativeComponent'
import { iconColorRoles } from './ui/iconRoles'
import { useControlled } from './controlled'
import { getSyncStateId } from './syncStore'
import { syncHandleOf, useSyncValue } from './syncNativeState'
import type {
  ComposeAlertDialogProps,
  ComposeAssistChipProps,
  ComposeBadgeProps,
  ComposeBadgedBoxProps,
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeButtonTone,
  ComposeButtonVariant,
  ComposeCardProps,
  ComposeCheckboxProps,
  ComposeColumnProps,
  ComposeContentAlignment,
  ComposeDialogProps,
  ComposeDividerProps,
  ComposeElevatedCardProps,
  ComposeExtendedFloatingActionButtonProps,
  ComposeFilterChipProps,
  ComposeFlowRowProps,
  ComposeFloatingActionButtonProps,
  ComposeFontWeight,
  ComposeHorizontalAlignment,
  ComposeHorizontalArrangement,
  ComposeIconProps,
  ComposeIconButtonProps,
  ComposeInputChipProps,
  ComposeListItemProps,
  ComposeNodeProps,
  ComposeOutlinedCardProps,
  ComposeProgressIndicatorProps,
  ComposeProgressVariant,
  ComposeRadioButtonProps,
  ComposeRowProps,
  ComposeSliderProps,
  ComposeSuggestionChipProps,
  ComposeSwitchProps,
  ComposeTextAlign,
  ComposeTextFieldCapitalization,
  ComposeTextFieldImeAction,
  ComposeTextFieldKeyboardType,
  ComposeTextFieldProps,
  ComposeTextFieldVariant,
  ComposeTextProps,
  ComposeVerticalAlignment,
  ComposeVerticalArrangement,
} from './composeTypes'
import {
  assertComposeStyle,
  composeIconGlyph,
  validateAlertDialogProps,
  validateBadgeProps,
  validateBoxProps,
  validateButtonProps,
  validateCardProps,
  validateCheckboxProps,
  validateColumnProps,
  validateDialogProps,
  validateDividerProps,
  validateFlowRowProps,
  validateFloatingActionButtonProps,
  validateChipProps,
  validateIconProps,
  validateIconButtonProps,
  validateListItemProps,
  validateProgressIndicatorProps,
  validateRadioButtonProps,
  validateRowProps,
  validateSliderProps,
  validateSwitchProps,
  validateTextFieldProps,
  validateTextProps,
} from './composeValidation'

type ComposeNodeType =
  | 'column'
  | 'row'
  | 'flowrow'
  | 'box'
  | 'badge'
  | 'badgedbox'
  | 'badgeslot'
  | 'listitem'
  | 'listitemslot'
  | 'card'
  | 'elevatedcard'
  | 'outlinedcard'
  | 'horizontaldivider'
  | 'verticaldivider'
  | 'filterchip'
  | 'assistchip'
  | 'inputchip'
  | 'suggestionchip'
  | 'chipslot'
  | 'text'
  | 'icon'
  | 'button'
  | 'iconbutton'
  | 'fillediconbutton'
  | 'filledtonaliconbutton'
  | 'outlinediconbutton'
  | 'floatingactionbutton'
  | 'switch'
  | 'checkbox'
  | 'radio'
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
  verticalArrangement?: ComposeVerticalArrangement
  spacing?: number
  verticalSpacing?: number
  text?: string
  fontSize?: number
  fontWeight?: ComposeFontWeight
  textAlign?: ComposeTextAlign
  maxLines?: number
  label?: string
  disabled?: boolean
  variant?: ComposeButtonVariant | ComposeTextFieldVariant | 'small' | 'medium' | 'large' | 'extended'
  tone?: ComposeButtonTone
  icon?: string
  iconFilled?: boolean
  colorRole?: string
  value?: boolean
  nativeClickable?: boolean
  checkboxColors?: ComposeCheckboxProps['colors']
  selected?: boolean
  radioColors?: ComposeRadioButtonProps['colors']
  cardColors?: ComposeCardProps['colors']
  badgeColors?: Pick<ComposeBadgeProps, 'containerColor' | 'contentColor'>
  listItemColors?: ComposeListItemProps['colors']
  tonalElevation?: number
  shadowElevation?: number
  cardElevation?: number
  cardBorder?: ComposeCardProps['border']
  dividerStyle?: Pick<ComposeDividerProps, 'thickness' | 'color'>
  slotName?: string
  chipColors?:
    | ComposeAssistChipProps['colors']
    | ComposeFilterChipProps['colors']
    | ComposeInputChipProps['colors']
    | ComposeSuggestionChipProps['colors']
  chipElevation?: number
  chipBorder?: ComposeFilterChipProps['border']
  iconButtonColors?: ComposeIconButtonProps['colors']
  fabColors?: Pick<ComposeFloatingActionButtonProps, 'containerColor'>
  fabExpanded?: boolean
  acknowledgedEvent?: number
  revision?: number
  textValue?: string
  syncStateId?: number
  placeholder?: string
  keyboardType?: ComposeTextFieldKeyboardType
  secureText?: boolean
  focused?: boolean
  focusRevision?: number
  acknowledgedFocusEvent?: number
  imeAction?: ComposeTextFieldImeAction
  maxLength?: number
  multiline?: boolean
  capitalization?: ComposeTextFieldCapitalization
  autoCorrect?: boolean
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
  onNativeComposeNodeBooleanValueChange?: (event: {
    nativeEvent: { value: boolean; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeTextValueChange?: (event: {
    nativeEvent: { text: string; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeTextFieldFocusChange?: (event: {
    nativeEvent: { value: boolean; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeTextFieldSubmit?: (event: unknown) => void
  onNativeComposeNodeNumberValueChange?: (event: {
    nativeEvent: { value: number; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeDialogConfirm?: (event: unknown) => void
  onNativeComposeNodeDialogDismiss?: (event: unknown) => void
}

const ComposeContext = createContext(false)

const leafNodeTypes: ReadonlySet<ComposeNodeType> = new Set([
  'text',
  'icon',
  'button',
  'switch',
  'checkbox',
  'radio',
  'textfield',
  'slider',
  'alertdialog',
  'progressindicator',
  'horizontaldivider',
  'verticaldivider',
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

function FlowRow({
  children,
  horizontalArrangement = 'start',
  verticalArrangement = 'top',
  ...props
}: ComposeFlowRowProps) {
  validateFlowRowProps({ horizontalArrangement, verticalArrangement })
  return (
    <ComposeNode
      {...props}
      nodeType="flowrow"
      arrangement={typeof horizontalArrangement === 'string' ? horizontalArrangement : 'start'}
      verticalArrangement={typeof verticalArrangement === 'string' ? verticalArrangement : 'top'}
      spacing={typeof horizontalArrangement === 'string' ? undefined : horizontalArrangement.spacedBy}
      verticalSpacing={typeof verticalArrangement === 'string' ? undefined : verticalArrangement.spacedBy}
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

function Badge({ children, containerColor, contentColor, ...props }: ComposeBadgeProps) {
  validateBadgeProps({ containerColor, contentColor })
  return (
    <ComposeNode {...props} nodeType="badge" badgeColors={{ containerColor, contentColor }}>
      {children}
    </ComposeNode>
  )
}

function BadgedBoxRoot({ children, ...props }: ComposeBadgedBoxProps) {
  return <ComposeNode {...props} nodeType="badgedbox">{children}</ComposeNode>
}

const BadgedBox = Object.assign(BadgedBoxRoot, {
  Badge: ({ children }: { children: ReactNode }) => (
    <ComposeNode nodeType="badgeslot" slotName="badge">{children}</ComposeNode>
  ),
})

function ListItemRoot({ children, colors, tonalElevation, shadowElevation, ...props }: ComposeListItemProps) {
  validateListItemProps({ colors, tonalElevation, shadowElevation })
  return (
    <ComposeNode
      {...props}
      nodeType="listitem"
      listItemColors={colors}
      tonalElevation={tonalElevation}
      shadowElevation={shadowElevation}
    >
      {children}
    </ComposeNode>
  )
}

function composeSlot(slotName: string) {
  return ({ children }: { children: ReactNode }) => (
    <ComposeNode nodeType="listitemslot" slotName={slotName}>{children}</ComposeNode>
  )
}

const ListItem = Object.assign(ListItemRoot, {
  HeadlineContent: composeSlot('headlineContent'),
  OverlineContent: composeSlot('overlineContent'),
  SupportingContent: composeSlot('supportingContent'),
  LeadingContent: composeSlot('leadingContent'),
  TrailingContent: composeSlot('trailingContent'),
})

function renderCard(
  nodeType: 'card' | 'elevatedcard' | 'outlinedcard',
  kind: 'Card' | 'ElevatedCard' | 'OutlinedCard',
  { children, colors, elevation, border, ...props }: ComposeCardProps
) {
  validateCardProps({ colors, elevation, border }, kind)
  return (
    <ComposeNode
      {...props}
      nodeType={nodeType}
      cardColors={colors}
      cardElevation={elevation}
      cardBorder={border}
    >
      {children}
    </ComposeNode>
  )
}

function Card(props: ComposeCardProps) {
  return renderCard('card', 'Card', props)
}

function ElevatedCard(props: ComposeElevatedCardProps) {
  return renderCard('elevatedcard', 'ElevatedCard', props)
}

function OutlinedCard(props: ComposeOutlinedCardProps) {
  return renderCard('outlinedcard', 'OutlinedCard', props)
}

function HorizontalDivider({ thickness, color, ...props }: ComposeDividerProps) {
  validateDividerProps({ thickness, color }, 'HorizontalDivider')
  return <ComposeNode {...props} nodeType="horizontaldivider" dividerStyle={{ thickness, color }} />
}

function VerticalDivider({ thickness, color, ...props }: ComposeDividerProps) {
  validateDividerProps({ thickness, color }, 'VerticalDivider')
  return <ComposeNode {...props} nodeType="verticaldivider" dividerStyle={{ thickness, color }} />
}

type ChipKind = 'AssistChip' | 'FilterChip' | 'InputChip' | 'SuggestionChip'
type ChipProps =
  | ComposeAssistChipProps
  | ComposeFilterChipProps
  | ComposeInputChipProps
  | ComposeSuggestionChipProps

function renderChip(
  nodeType: 'assistchip' | 'filterchip' | 'inputchip' | 'suggestionchip',
  kind: ChipKind,
  chipProps: ChipProps
) {
  validateChipProps(chipProps, kind)
  const { children, enabled = true, colors, elevation, border, onClick, ...props } = chipProps
  const selected = 'selected' in props ? props.selected ?? false : false
  return (
    <ComposeNode
      {...props}
      nodeType={nodeType}
      selected={selected}
      disabled={!enabled}
      chipColors={colors}
      chipElevation={elevation}
      chipBorder={border}
      onNativeComposeNodeButtonPress={onClick ? () => onClick() : undefined}
    >
      {children}
    </ComposeNode>
  )
}

function AssistChipRoot(props: ComposeAssistChipProps) {
  return renderChip('assistchip', 'AssistChip', props)
}

function FilterChipRoot(props: ComposeFilterChipProps) {
  return renderChip('filterchip', 'FilterChip', props)
}

function InputChipRoot(props: ComposeInputChipProps) {
  return renderChip('inputchip', 'InputChip', props)
}

function SuggestionChipRoot(props: ComposeSuggestionChipProps) {
  return renderChip('suggestionchip', 'SuggestionChip', props)
}

function ChipSlot({ children, name }: { children: ReactNode; name: string }) {
  return (
    <ComposeNode nodeType="chipslot" slotName={name}>
      {children}
    </ComposeNode>
  )
}

const ChipLabel = ({ children }: { children: ReactNode }) => (
  <ChipSlot name="label">{children}</ChipSlot>
)
const ChipLeadingIcon = ({ children }: { children: ReactNode }) => (
  <ChipSlot name="leadingIcon">{children}</ChipSlot>
)
const ChipTrailingIcon = ({ children }: { children: ReactNode }) => (
  <ChipSlot name="trailingIcon">{children}</ChipSlot>
)
const ChipAvatar = ({ children }: { children: ReactNode }) => (
  <ChipSlot name="avatar">{children}</ChipSlot>
)
const ChipIcon = ({ children }: { children: ReactNode }) => (
  <ChipSlot name="icon">{children}</ChipSlot>
)

const AssistChip = Object.assign(AssistChipRoot, {
  Label: ChipLabel,
  LeadingIcon: ChipLeadingIcon,
  TrailingIcon: ChipTrailingIcon,
})
const FilterChip = Object.assign(FilterChipRoot, {
  Label: ChipLabel,
  LeadingIcon: ChipLeadingIcon,
  TrailingIcon: ChipTrailingIcon,
})
const InputChip = Object.assign(InputChipRoot, {
  Label: ChipLabel,
  Avatar: ChipAvatar,
  TrailingIcon: ChipTrailingIcon,
})
const SuggestionChip = Object.assign(SuggestionChipRoot, {
  Label: ChipLabel,
  Icon: ChipIcon,
})

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

export function renderIcon(
  { name, size = 24, filled = false, ...props }: ComposeIconProps,
  colorRole?: string
) {
  validateIconProps({ name, size, filled })
  if (colorRole && !iconColorRoles.some((role) => role === colorRole))
    throw new Error('Icon colorRole must be a One.UI icon color role')
  return (
    <ComposeNode
      {...props}
      nodeType="icon"
      text={composeIconGlyph('Icon name', name)}
      fontSize={size}
      iconFilled={filled}
      colorRole={colorRole}
    />
  )
}

function Icon(props: ComposeIconProps) {
  return renderIcon(props)
}

function Button({
  label,
  disabled = false,
  variant = 'filled',
  tone = 'default',
  icon,
  iconFilled = false,
  onPress,
  ...props
}: ComposeButtonProps) {
  validateButtonProps({ label, disabled, variant, tone, icon, iconFilled, onPress })
  return (
    <ComposeNode
      {...props}
      nodeType="button"
      label={label}
      disabled={disabled}
      variant={variant}
      tone={tone}
      icon={icon === undefined ? undefined : composeIconGlyph('Button icon', icon)}
      iconFilled={iconFilled}
      onNativeComposeNodeButtonPress={onPress ? () => onPress() : undefined}
    />
  )
}

function renderIconButton(
  nodeType: 'iconbutton' | 'fillediconbutton' | 'filledtonaliconbutton' | 'outlinediconbutton',
  { children, enabled = true, colors, onClick, ...props }: ComposeIconButtonProps
) {
  validateIconButtonProps({ children, enabled, colors, onClick })
  return (
    <ComposeNode
      {...props}
      nodeType={nodeType}
      disabled={!enabled}
      iconButtonColors={colors}
      onNativeComposeNodeButtonPress={onClick ? () => onClick() : undefined}
    >
      {children}
    </ComposeNode>
  )
}

function IconButton(props: ComposeIconButtonProps) {
  return renderIconButton('iconbutton', props)
}

function FilledIconButton(props: ComposeIconButtonProps) {
  return renderIconButton('fillediconbutton', props)
}

function FilledTonalIconButton(props: ComposeIconButtonProps) {
  return renderIconButton('filledtonaliconbutton', props)
}

function OutlinedIconButton(props: ComposeIconButtonProps) {
  return renderIconButton('outlinediconbutton', props)
}

function FloatingActionButtonRoot({ children, containerColor, expanded = true, onClick, variant = 'medium', ...props }: ComposeFloatingActionButtonProps & { expanded?: boolean; variant?: 'small' | 'medium' | 'large' | 'extended' }) {
  validateFloatingActionButtonProps({ children, containerColor, expanded, onClick }, variant)
  return (
    <ComposeNode
      {...props}
      nodeType="floatingactionbutton"
      variant={variant}
      fabColors={{ containerColor }}
      fabExpanded={expanded}
      onNativeComposeNodeButtonPress={onClick ? () => onClick() : undefined}
    >
      {children}
    </ComposeNode>
  )
}

const FloatingActionButton = Object.assign((props: ComposeFloatingActionButtonProps) => <FloatingActionButtonRoot {...props} variant="medium" />, {
  Icon: composeSlot('icon'),
})
const SmallFloatingActionButton = Object.assign((props: ComposeFloatingActionButtonProps) => <FloatingActionButtonRoot {...props} variant="small" />, {
  Icon: composeSlot('icon'),
})
const LargeFloatingActionButton = Object.assign((props: ComposeFloatingActionButtonProps) => <FloatingActionButtonRoot {...props} variant="large" />, {
  Icon: composeSlot('icon'),
})
const ExtendedFloatingActionButton = Object.assign((props: ComposeExtendedFloatingActionButtonProps) => <FloatingActionButtonRoot {...props} variant="extended" />, {
  Icon: composeSlot('icon'),
  Text: composeSlot('text'),
})

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
      onNativeComposeNodeBooleanValueChange={(event) =>
        controlled.onNativeChange(event.nativeEvent)
      }
    />
  )
}

function Checkbox({
  value,
  disabled = false,
  onCheckedChange,
  revision = 0,
  colors,
  ...props
}: ComposeCheckboxProps) {
  validateCheckboxProps({ value, disabled, onCheckedChange, revision, colors })
  const controlled = useControlled<{
    value: boolean
    eventCount: number
    revision: number
  }>((event) => onCheckedChange?.(event.value), revision)
  return (
    <ComposeNode
      {...props}
      nodeType="checkbox"
      value={value}
      nativeClickable={onCheckedChange !== undefined}
      checkboxColors={colors}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      disabled={disabled}
      onNativeComposeNodeBooleanValueChange={
        onCheckedChange
          ? (event) => controlled.onNativeChange(event.nativeEvent)
          : undefined
      }
    />
  )
}

function RadioButton({
  selected,
  disabled = false,
  onClick,
  colors,
  ...props
}: ComposeRadioButtonProps) {
  validateRadioButtonProps({ selected, disabled, onClick, colors })
  return (
    <ComposeNode
      {...props}
      nodeType="radio"
      selected={selected}
      disabled={disabled}
      nativeClickable={onClick !== undefined}
      radioColors={colors}
      onNativeComposeNodeButtonPress={onClick ? () => onClick() : undefined}
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
  focused,
  focusRevision = 0,
  onFocusChange,
  imeAction,
  onSubmit,
  maxLength,
  multiline = false,
  capitalization,
  autoCorrect,
  textAlign,
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
    focused,
    focusRevision,
    onFocusChange,
    imeAction,
    onSubmit,
    maxLength,
    multiline,
    capitalization,
    autoCorrect,
    textAlign,
  })
  const syncHandle = syncHandleOf<string>(text)
  const syncedText = useSyncValue<string>(text)
  const controlled = useControlled<{
    text: string
    eventCount: number
    revision: number
  }>((event) => {
    syncHandle?.set(event.text)
    onTextChange(event.text)
  }, revision)
  const controlledFocus = useControlled<{
    value: boolean
    eventCount: number
    revision: number
  }>((event) => onFocusChange?.(event.value), focusRevision)
  return (
    <ComposeNode
      {...props}
      nodeType="textfield"
      textValue={syncedText}
      syncStateId={syncHandle ? (getSyncStateId(syncHandle) ?? 0) : 0}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      variant={variant}
      keyboardType={keyboardType}
      secureText={secureText}
      focused={focused}
      focusRevision={focusRevision}
      acknowledgedFocusEvent={
        focused !== undefined ? controlledFocus.acknowledgedEvent : 0
      }
      imeAction={imeAction}
      maxLength={maxLength}
      multiline={multiline}
      capitalization={capitalization}
      autoCorrect={autoCorrect}
      textAlign={textAlign}
      onNativeComposeNodeTextValueChange={(event) =>
        controlled.onNativeChange(event.nativeEvent)
      }
      onNativeComposeNodeTextFieldFocusChange={(event) =>
        controlledFocus.onNativeChange(event.nativeEvent)
      }
      onNativeComposeNodeTextFieldSubmit={() => onSubmit?.()}
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
  FlowRow,
  Box,
  Badge,
  BadgedBox,
  ListItem,
  Card,
  ElevatedCard,
  OutlinedCard,
  HorizontalDivider,
  VerticalDivider,
  FilterChip,
  AssistChip,
  InputChip,
  SuggestionChip,
  Text,
  Icon,
  Button,
  IconButton,
  FilledIconButton,
  FilledTonalIconButton,
  OutlinedIconButton,
  FloatingActionButton,
  SmallFloatingActionButton,
  LargeFloatingActionButton,
  ExtendedFloatingActionButton,
  Switch,
  Checkbox,
  RadioButton,
  TextField,
  Slider,
  AlertDialog,
  Dialog,
  ProgressIndicator,
}
