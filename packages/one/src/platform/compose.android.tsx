import { runOnUISync, isWorkletFunction } from 'react-native-worklets'
import { composeRangeDay, validateComposeFamily } from './composeFamilyValidation'
import { Children, createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react'
import { Image as ReactNativeImage, StyleSheet, type ColorValue } from 'react-native'
import NativeComposeNode from './specs/OneNativeComposeNodeNativeComponent'
import { iconColorRoles } from './ui/iconRoles'
import { useControlled } from './controlled'
import { getSyncStateId } from './syncStore'
import { syncHandleOf, useSyncValue } from './syncNativeState'
import type {
  ComposeBasicAlertDialogProps,
  ComposeHorizontalCenteredHeroCarouselProps,
  ComposeHorizontalMultiBrowseCarouselProps,
  ComposeHorizontalUncontainedCarouselProps,
  ComposeDateRangePickerProps,
  ComposeDateRangePickerDialogProps,
  ComposeHorizontalFloatingToolbarProps,
  ComposeToolbarFabProps,
  ComposeShapeProps,
  ComposeShapeType,
  ComposeSyncSwitchProps,
  ComposeAlertDialogProps,
  ComposeAnimatedVisibilityProps,
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
  ComposeContainedLoadingIndicatorProps,
  ComposeContentAlignment,
  ComposeDatePickerColors,
  ComposeDatePickerDialogProps,
  ComposeDatePickerProps,
  ComposeDialogProps,
  ComposeDividerProps,
  ComposeDropdownMenuItemProps,
  ComposeDropdownMenuProps,
  ComposeElevatedCardProps,
  ComposeExposedDropdownMenuBoxProps,
  ComposeExtendedFloatingActionButtonProps,
  ComposeFilterChipProps,
  ComposeFlowRowProps,
  ComposeFloatingActionButtonProps,
  ComposeFontWeight,
  ComposeHorizontalAlignment,
  ComposeHorizontalArrangement,
  ComposeIconProps,
  ComposeIconButtonProps,
  ComposeImageProps,
  ComposeInputChipProps,
  ComposeLazyColumnProps,
  ComposeLazyContentPadding,
  ComposeLazyRowProps,
  ComposeListItemProps,
  ComposeLoadingIndicatorProps,
  ComposeModalBottomSheetProperties,
  ComposeModalBottomSheetProps,
  ComposeModalBottomSheetRef,
  ComposeNavigationBarItemProps,
  ComposeNavigationBarProps,
  ComposeNodeProps,
  ComposeOutlinedCardProps,
  ComposeProgressIndicatorProps,
  ComposeProgressVariant,
  ComposePullToRefreshBoxProps,
  ComposeRadioButtonProps,
  ComposeRowProps,
  ComposeSpacerProps,
  ComposeSearchBarProps,
  ComposeSegmentedButtonProps,
  ComposeSegmentedButtonRowProps,
  ComposeSliderProps,
  ComposeSnackbarHostProps,
  ComposeSnackbarHostRef,
  ComposeSnackbarProps,
  ComposeSnackbarResult,
  ComposeSnackbarShowOptions,
  ComposeSuggestionChipProps,
  ComposeSurfaceProps,
  ComposeSwitchProps,
  ComposeTextAlign,
  ComposeTextFieldCapitalization,
  ComposeTextFieldImeAction,
  ComposeTextFieldKeyboardType,
  ComposeTextFieldProps,
  ComposeTextFieldVariant,
  ComposeTextProps,
  ComposeTimePickerColors,
  ComposeTooltipBoxProps,
  ComposeTimePickerDialogProps,
  ComposeTimePickerProps,
  ComposeToggleButtonProps,
  ComposeVerticalAlignment,
  ComposeVerticalArrangement,
} from './composeTypes'
import {
  assertComposeStyle,
  assertFunction,
  composeIconGlyph,
  composeUtcDay,
  validateDatePickerProps,
  validatePickerDialogProps,
  validateTimePickerProps,
  validateAlertDialogProps,
  validateAnimatedVisibilityProps,
  validateBadgeProps,
  validateBoxProps,
  validateButtonProps,
  validateCardProps,
  validateCheckboxProps,
  validateColumnProps,
  validateDialogProps,
  validateDividerProps,
  validateDropdownMenuItemProps,
  validateDropdownMenuProps,
  validateExposedDropdownMenuBoxProps,
  validateFlowRowProps,
  validateFloatingActionButtonProps,
  validateChipProps,
  validateIconProps,
  validateIconButtonProps,
  validateImageProps,
  validateLazyColumnProps,
  validateLazyRowProps,
  validateListItemProps,
  validateModalBottomSheetProps,
  validateNavigationBarItemProps,
  validateNavigationBarProps,
  validateLoadingIndicatorProps,
  validateProgressIndicatorProps,
  validatePullToRefreshBoxProps,
  validateRadioButtonProps,
  validateRowProps,
  validateSearchBarProps,
  validateSliderProps,
  validateSnackbarProps,
  validateSnackbarShowOptions,
  validateSurfaceProps,
  validateSwitchProps,
  validateTextFieldProps,
  validateTextProps,
  validateToggleButtonProps,
  validateTooltipBoxProps,
  validateSegmentedButtonProps,
} from './composeValidation'

type ComposeNodeType =
  | 'basicalertdialog' | 'centeredherocarousel' | 'multibrowsecarousel' | 'uncontainedcarousel' | 'daterangepicker' | 'daterangepickerdialog' | 'horizontalfloatingtoolbar' | 'toolbarfabslot' | 'shape'
  | 'column'
  | 'row'
  | 'spacer'
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
  | 'loadingindicator'
  | 'containedloadingindicator'
  | 'surface'
  | 'togglebutton'
  | 'icontogglebutton'
  | 'filledicontogglebutton'
  | 'outlinedicontogglebutton'
  | 'singlechoicesegmentedbuttonrow'
  | 'multichoicesegmentedbuttonrow'
  | 'segmentedbutton'
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'textfield'
  | 'slider'
  | 'alertdialog'
  | 'dialog'
  | 'lazycolumn'
  | 'lazyrow'
  | 'image'
  | 'snackbar'
  | 'snackbarhost'
  | 'modalbottomsheet'
  | 'sheetslot'
  | 'navigationbar'
  | 'navigationbaritem'
  | 'searchbar'
  | 'dockedsearchbar'
  | 'searchbarslot'
  | 'dropdownmenu'
  | 'dropdownmenuitem'
  | 'exposeddropdownmenubox'
  | 'pulltorefreshbox'
  | 'tooltipbox'
  | 'animatedvisibility'
  | 'progressindicator'
  | 'datepicker'
  | 'timepicker'
  | 'datepickerdialog'
  | 'timepickerdialog'

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
  variant?: ComposeButtonVariant | ComposeTextFieldVariant | 'small' | 'medium' | 'large' | 'extended' | 'picker' | 'input'
  tone?: ComposeButtonTone
  icon?: string
  iconFilled?: boolean
  colorRole?: string
  value?: boolean
  nativeClickable?: boolean
  checkboxColors?: ComposeCheckboxProps['colors']
  selected?: boolean
  radioColors?: ComposeRadioButtonProps['colors']
  switchColors?: ComposeSwitchProps['colors']
  sliderOptions?: Readonly<{
    lowerLimit?: number
    upperLimit?: number
    colors?: ComposeSliderProps['colors']
  }>
  cardColors?: ComposeCardProps['colors']
  surfaceMode?: 'plain' | 'clickable' | 'selectable' | 'toggleable'
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
  toggleButtonColors?: ComposeToggleButtonProps['colors']
  segmentedButtonColors?: ComposeSegmentedButtonProps['colors']
  loadingColors?: Readonly<{ color?: ComposeLoadingIndicatorProps['color']; containerColor?: ComposeContainedLoadingIndicatorProps['containerColor'] }>
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
  pickerOptions?: Readonly<{
    showModeToggle?: boolean
    is24Hour?: boolean
    minimumDay?: number
    maximumDay?: number
    color?: ColorValue
    colors?: ComposeDatePickerColors | ComposeTimePickerColors
  }>
  progressOptions?: Pick<ComposeProgressIndicatorProps, 'color' | 'trackColor' | 'strokeCap' | 'gapSize' | 'strokeWidth' | 'drawStopIndicator' | 'stopSize' | 'amplitude' | 'wavelength' | 'waveSpeed'>
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
  onNativeComposeNodeTextFieldSubmit?: (event: {
    nativeEvent: { text: string; eventCount: number }
  }) => void
  onNativeComposeNodeNumberValueChange?: (event: {
    nativeEvent: { value: number; eventCount: number; revision: number }
  }) => void
  onNativeComposeNodeDialogConfirm?: (event: {
    nativeEvent: { value: number; eventCount: number }
  }) => void
  onNativeComposeNodeDialogDismiss?: (event: unknown) => void
  lazyContentPadding?: ComposeLazyContentPadding
  imageSource?: Readonly<{ uri?: string }>
  imageOptions?: Readonly<{
    contentScale?: string
    alignment?: string
    tint?: ColorValue
    alpha?: number
  }>
  snackbarColors?: Readonly<{
    containerColor?: ColorValue
    contentColor?: ColorValue
    actionColor?: ColorValue
    actionContentColor?: ColorValue
    dismissActionContentColor?: ColorValue
    actionOnNewLine?: boolean
  }>
  snackbarRequest?: Readonly<{
    requestId?: number
    message?: string
    actionLabel?: string
    withDismissAction?: boolean
    duration?: string
    revision?: number
  }>
  sheetOptions?: Readonly<{
    skipPartiallyExpanded?: boolean
    initialFullyExpanded?: boolean
    showDragHandle?: boolean
    sheetGesturesEnabled?: boolean
    scrimColor?: ColorValue
  }>
  sheetProperties?: ComposeModalBottomSheetProperties
  sheetCommand?: Readonly<{
    requestId?: number
    revision?: number
  }>
  navigationBarColors?: Pick<ComposeNavigationBarProps, 'containerColor' | 'contentColor'>
  navigationBarItemColors?: ComposeNavigationBarItemProps['colors']
  alwaysShowLabel?: boolean
  expandedValue?: boolean
  expandedRevision?: number
  acknowledgedExpandedEvent?: number
  searchBarColors?: Pick<ComposeSearchBarProps, 'containerColor'>
  dropdownMenuColors?: Pick<ComposeDropdownMenuProps, 'containerColor'>
  dropdownMenuItemColors?: ComposeDropdownMenuItemProps['colors']
  dropdownMenuItemOptions?: Readonly<{
    leadingIcon?: string
    trailingIcon?: string
    filled?: boolean
  }>
  familyOptions?: import('./specs/OneNativeComposeNodeNativeComponent').NativeProps['familyOptions']
  onNativeComposeNodeDateRangeSelected?: (event: {
    nativeEvent: { start: number; end: number; hasStart: boolean; hasEnd: boolean }
  }) => void
  isRefreshing?: boolean
  enterTransition?: string
  exitTransition?: string
  onNativeComposeNodeImageLoad?: (event: { nativeEvent: { eventCount: number } }) => void
  onNativeComposeNodeImageError?: (event: {
    nativeEvent: { message: string; eventCount: number }
  }) => void
  onNativeComposeNodeSnackbarResult?: (event: {
    nativeEvent: { requestId: number; result: string; eventCount: number }
  }) => void
  onNativeComposeNodeSheetHidden?: (event: {
    nativeEvent: { requestId: number; eventCount: number }
  }) => void
}

const ComposeContext = createContext(false)

const leafNodeTypes: ReadonlySet<ComposeNodeType> = new Set([
  'shape',
  'daterangepicker',
  'daterangepickerdialog',
  'text',
  'spacer',
  'icon',
  'button',
  'switch',
  'checkbox',
  'radio',
  'image',
  'snackbar',
  'navigationbaritem',
  'dropdownmenuitem',
  'textfield',
  'slider',
  'alertdialog',
  'progressindicator',
  'datepicker',
  'timepicker',
  'datepickerdialog',
  'timepickerdialog',
  'loadingindicator',
  'containedloadingindicator',
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
  const [contentHeight, setContentHeight] = useState<number>()
  const rootStyle = StyleSheet.flatten(style)
  const intrinsicHeight =
    !nested &&
    rootStyle?.height == null &&
    !(rootStyle?.flex && rootStyle.flex > 0) &&
    !(rootStyle?.flexGrow && rootStyle.flexGrow > 0) &&
    composeStyle?.height == null &&
    !composeStyle?.fillMaxHeight
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
      intrinsicHeight={intrinsicHeight}
      onNativeComposeNodeContentSizeChange={
        intrinsicHeight
          ? (event) => setContentHeight(event.nativeEvent.height)
          : undefined
      }
      style={
        nested
          ? undefined
          : [
              intrinsicHeight && contentHeight !== undefined
                ? { height: contentHeight }
                : undefined,
              style,
            ]
      }
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

function Spacer(props: ComposeSpacerProps) {
  return <ComposeNode {...props} nodeType="spacer" />
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

function LazyColumn({
  children,
  horizontalAlignment = 'start',
  verticalArrangement = 'top',
  contentPadding,
  ...props
}: ComposeLazyColumnProps) {
  validateLazyColumnProps({ horizontalAlignment, verticalArrangement, contentPadding })
  return (
    <ComposeNode
      {...props}
      nodeType="lazycolumn"
      alignment={horizontalAlignment}
      arrangement={typeof verticalArrangement === 'string' ? verticalArrangement : 'top'}
      spacing={typeof verticalArrangement === 'string' ? undefined : verticalArrangement.spacedBy}
      lazyContentPadding={contentPadding}
    >
      {children}
    </ComposeNode>
  )
}

function LazyRow({
  children,
  verticalAlignment = 'top',
  horizontalArrangement = 'start',
  contentPadding,
  ...props
}: ComposeLazyRowProps) {
  validateLazyRowProps({ verticalAlignment, horizontalArrangement, contentPadding })
  return (
    <ComposeNode
      {...props}
      nodeType="lazyrow"
      alignment={verticalAlignment}
      arrangement={typeof horizontalArrangement === 'string' ? horizontalArrangement : 'start'}
      spacing={typeof horizontalArrangement === 'string' ? undefined : horizontalArrangement.spacedBy}
      lazyContentPadding={contentPadding}
    >
      {children}
    </ComposeNode>
  )
}

function Image({
  source,
  contentScale = 'fit',
  alignment = 'center',
  contentDescription,
  tint,
  alpha = 1,
  onLoad,
  onError,
  accessibilityLabel,
  ...props
}: ComposeImageProps) {
  validateImageProps({ source, contentScale, alignment, contentDescription, tint, alpha, onLoad, onError })
  const resolved = typeof source === 'number' ? ReactNativeImage.resolveAssetSource(source) : source
  const uri = typeof resolved?.uri === 'string' ? resolved.uri : undefined
  return (
    <ComposeNode
      {...props}
      nodeType="image"
      accessibilityLabel={accessibilityLabel ?? contentDescription ?? undefined}
      imageSource={uri === undefined ? undefined : { uri }}
      imageOptions={{ contentScale, alignment, tint, alpha }}
      onNativeComposeNodeImageLoad={onLoad ? () => onLoad() : undefined}
      onNativeComposeNodeImageError={onError ? (event) => onError(event.nativeEvent.message) : undefined}
    />
  )
}

function Snackbar({
  containerColor,
  contentColor,
  actionColor,
  actionContentColor,
  dismissActionContentColor,
  actionOnNewLine,
  ...props
}: ComposeSnackbarProps) {
  validateSnackbarProps({ containerColor, contentColor, actionColor, actionContentColor, dismissActionContentColor, actionOnNewLine })
  return (
    <ComposeNode
      {...props}
      nodeType="snackbar"
      snackbarColors={{ containerColor, contentColor, actionColor, actionContentColor, dismissActionContentColor, actionOnNewLine }}
    />
  )
}

type SnackbarQueuedRequest = {
  id: number
  options: ComposeSnackbarShowOptions
  resolve: (result: ComposeSnackbarResult) => void
}

type SheetQueuedCommand = {
  id: number
  resolve: () => void
}

const SnackbarHostRoot = forwardRef<ComposeSnackbarHostRef, ComposeSnackbarHostProps>(
  function SnackbarHost({ children, ...props }, ref) {
    const requestId = useRef(0)
    const revision = useRef(0)
    const active = useRef<SnackbarQueuedRequest | undefined>(undefined)
    const queue = useRef<SnackbarQueuedRequest[]>([])
    const [request, setRequest] = useState<ComposeNativeNodeProps['snackbarRequest']>(undefined)
    const pump = () => {
      if (active.current) return
      const next = queue.current.shift()
      if (!next) return
      active.current = next
      revision.current += 1
      setRequest({ ...next.options, requestId: next.id, revision: revision.current })
    }
    useImperativeHandle(
      ref,
      () => ({
        showSnackbar: (options: ComposeSnackbarShowOptions) =>
          new Promise<ComposeSnackbarResult>((resolve) => {
            validateSnackbarShowOptions(options)
            requestId.current += 1
            queue.current.push({ id: requestId.current, options, resolve })
            pump()
          }),
      }),
      []
    )
    return (
      <ComposeNode
        {...props}
        nodeType="snackbarhost"
        snackbarRequest={request}
        onNativeComposeNodeSnackbarResult={(event) => {
          if (active.current && active.current.id === event.nativeEvent.requestId) {
            const resolve = active.current.resolve
            active.current = undefined
            resolve(event.nativeEvent.result === 'actionPerformed' ? 'actionPerformed' : 'dismissed')
          }
          pump()
        }}
      >
        {children}
      </ComposeNode>
    )
  }
)

const SnackbarHost = SnackbarHostRoot

const ModalBottomSheetRoot = forwardRef<ComposeModalBottomSheetRef, ComposeModalBottomSheetProps>(
  function ModalBottomSheet(
    {
      children,
      onDismissRequest,
      properties,
      scrimColor,
      skipPartiallyExpanded = false,
      initialFullyExpanded = false,
      showDragHandle = true,
      sheetGesturesEnabled = true,
      ...props
    },
    ref
  ) {
    validateModalBottomSheetProps({
      onDismissRequest,
      properties,
      scrimColor,
      skipPartiallyExpanded,
      initialFullyExpanded,
      showDragHandle,
      sheetGesturesEnabled,
    })
    const commandId = useRef(0)
    const commandRevision = useRef(0)
    const active = useRef<SheetQueuedCommand | undefined>(undefined)
    const queue = useRef<SheetQueuedCommand[]>([])
    const [hideCommand, setHideCommand] = useState<ComposeNativeNodeProps['sheetCommand']>(undefined)
    const pump = () => {
      if (active.current) return
      const next = queue.current.shift()
      if (!next) return
      active.current = next
      commandRevision.current += 1
      setHideCommand({ requestId: next.id, revision: commandRevision.current })
    }
    useImperativeHandle(
      ref,
      () => ({
        hide: () =>
          new Promise<void>((resolve) => {
            commandId.current += 1
            queue.current.push({ id: commandId.current, resolve })
            pump()
          }),
      }),
      []
    )
    return (
      <ComposeNode
        {...props}
        nodeType="modalbottomsheet"
        sheetOptions={{ skipPartiallyExpanded, initialFullyExpanded, showDragHandle, sheetGesturesEnabled, scrimColor }}
        sheetProperties={properties}
        sheetCommand={hideCommand}
        onNativeComposeNodeDialogDismiss={() => onDismissRequest()}
        onNativeComposeNodeSheetHidden={(event) => {
          if (active.current && active.current.id === event.nativeEvent.requestId) {
            const resolve = active.current.resolve
            active.current = undefined
            resolve()
          }
          pump()
        }}
      >
        {children}
      </ComposeNode>
    )
  }
)

const ModalBottomSheet = Object.assign(ModalBottomSheetRoot, {
  DragHandle: ({ children }: { children: ReactNode }) => (
    <ComposeNode nodeType="sheetslot" slotName="dragHandle">
      {children}
    </ComposeNode>
  ),
})

function DropdownMenu({
  children,
  expanded,
  onDismissRequest,
  containerColor,
  ...props
}: ComposeDropdownMenuProps) {
  validateDropdownMenuProps({ expanded, onDismissRequest, containerColor })
  return (
    <ComposeNode
      {...props}
      nodeType="dropdownmenu"
      visible={expanded}
      dropdownMenuColors={{ containerColor }}
      onNativeComposeNodeDialogDismiss={() => onDismissRequest()}
    >
      {children}
    </ComposeNode>
  )
}

function DropdownMenuItem({
  text,
  onClick,
  enabled = true,
  leadingIcon,
  trailingIcon,
  iconFilled = false,
  colors,
  ...props
}: ComposeDropdownMenuItemProps) {
  validateDropdownMenuItemProps({
    text,
    onClick,
    enabled,
    leadingIcon,
    trailingIcon,
    iconFilled,
    colors,
  })
  return (
    <ComposeNode
      {...props}
      nodeType="dropdownmenuitem"
      text={text}
      disabled={!enabled}
      dropdownMenuItemOptions={{
        leadingIcon:
          leadingIcon === undefined
            ? undefined
            : composeIconGlyph('DropdownMenuItem leadingIcon', leadingIcon),
        trailingIcon:
          trailingIcon === undefined
            ? undefined
            : composeIconGlyph('DropdownMenuItem trailingIcon', trailingIcon),
        filled: iconFilled,
      }}
      dropdownMenuItemColors={colors}
      onNativeComposeNodeButtonPress={() => onClick()}
    />
  )
}

function ExposedDropdownMenuBox({
  children,
  expanded,
  onExpandedChange,
  expandedRevision = 0,
  value,
  placeholder,
  enabled = true,
  ...props
}: ComposeExposedDropdownMenuBoxProps) {
  validateExposedDropdownMenuBoxProps({
    expanded,
    onExpandedChange,
    expandedRevision,
    value,
    placeholder,
    enabled,
  })
  const controlledExpanded = useControlled<{
    value: boolean
    eventCount: number
    revision: number
  }>((event) => onExpandedChange(event.value), expandedRevision)
  return (
    <ComposeNode
      {...props}
      nodeType="exposeddropdownmenubox"
      textValue={value}
      expandedValue={expanded}
      expandedRevision={expandedRevision}
      acknowledgedExpandedEvent={controlledExpanded.acknowledgedEvent}
      placeholder={placeholder}
      disabled={!enabled}
      onNativeComposeNodeBooleanValueChange={(event) =>
        controlledExpanded.onNativeChange(event.nativeEvent)
      }
    >
      {children}
    </ComposeNode>
  )
}

function TooltipBox({
  children,
  text,
  title,
  enabled = true,
  ...props
}: ComposeTooltipBoxProps) {
  validateTooltipBoxProps({ text, title, enabled })
  return (
    <ComposeNode
      {...props}
      nodeType="tooltipbox"
      text={text}
      title={title}
      disabled={!enabled}
    >
      {children}
    </ComposeNode>
  )
}

function AnimatedVisibility({
  children,
  visible,
  enter,
  exit,
  ...props
}: ComposeAnimatedVisibilityProps) {
  validateAnimatedVisibilityProps({ visible, enter, exit })
  return (
    <ComposeNode
      {...props}
      nodeType="animatedvisibility"
      visible={visible}
      enterTransition={enter}
      exitTransition={exit}
    >
      {children}
    </ComposeNode>
  )
}

function PullToRefreshBox({
  children,
  isRefreshing,
  onRefresh,
  enabled = true,
  ...props
}: ComposePullToRefreshBoxProps) {
  validatePullToRefreshBoxProps({ isRefreshing, onRefresh, enabled })
  return (
    <ComposeNode
      {...props}
      nodeType="pulltorefreshbox"
      isRefreshing={isRefreshing}
      disabled={!enabled}
      onNativeComposeNodeButtonPress={() => onRefresh()}
    >
      {children}
    </ComposeNode>
  )
}

function NavigationBar({
  children,
  containerColor,
  contentColor,
  tonalElevation,
  ...props
}: ComposeNavigationBarProps) {
  validateNavigationBarProps({ containerColor, contentColor, tonalElevation })
  return (
    <ComposeNode
      {...props}
      nodeType="navigationbar"
      navigationBarColors={{ containerColor, contentColor }}
      tonalElevation={tonalElevation}
    >
      {children}
    </ComposeNode>
  )
}

function SearchBarNode({
  nodeType,
  owner,
  children,
  query,
  onQueryChange,
  revision = 0,
  expanded,
  onExpandedChange,
  expandedRevision = 0,
  placeholder,
  enabled = true,
  onSearch,
  containerColor,
  ...props
}: ComposeSearchBarProps & {
  nodeType: 'searchbar' | 'dockedsearchbar'
  owner: 'SearchBar' | 'DockedSearchBar'
}) {
  validateSearchBarProps(
    {
      query,
      onQueryChange,
      revision,
      expanded,
      onExpandedChange,
      expandedRevision,
      placeholder,
      enabled,
      onSearch,
      containerColor,
    },
    owner
  )
  const controlled = useControlled<{
    text: string
    eventCount: number
    revision: number
  }>((event) => onQueryChange(event.text), revision)
  const controlledExpanded = useControlled<{
    value: boolean
    eventCount: number
    revision: number
  }>((event) => onExpandedChange(event.value), expandedRevision)
  return (
    <ComposeNode
      {...props}
      nodeType={nodeType}
      textValue={query}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      expandedValue={expanded}
      expandedRevision={expandedRevision}
      acknowledgedExpandedEvent={controlledExpanded.acknowledgedEvent}
      placeholder={placeholder}
      disabled={!enabled}
      searchBarColors={{ containerColor }}
      onNativeComposeNodeTextValueChange={(event) =>
        controlled.onNativeChange(event.nativeEvent)
      }
      onNativeComposeNodeBooleanValueChange={(event) =>
        controlledExpanded.onNativeChange(event.nativeEvent)
      }
      onNativeComposeNodeTextFieldSubmit={
        onSearch ? (event) => onSearch(event.nativeEvent.text) : undefined
      }
    >
      {children}
    </ComposeNode>
  )
}

function SearchBarRoot(props: ComposeSearchBarProps) {
  return <SearchBarNode {...props} nodeType="searchbar" owner="SearchBar" />
}

function DockedSearchBarRoot(props: ComposeSearchBarProps) {
  return <SearchBarNode {...props} nodeType="dockedsearchbar" owner="DockedSearchBar" />
}

function SearchBarSlot({ children, name }: { children: ReactNode; name: string }) {
  return (
    <ComposeNode nodeType="searchbarslot" slotName={name}>
      {children}
    </ComposeNode>
  )
}

const SearchBarLeadingIcon = ({ children }: { children: ReactNode }) => (
  <SearchBarSlot name="leadingIcon">{children}</SearchBarSlot>
)
const SearchBarTrailingIcon = ({ children }: { children: ReactNode }) => (
  <SearchBarSlot name="trailingIcon">{children}</SearchBarSlot>
)

const SearchBar = Object.assign(SearchBarRoot, {
  LeadingIcon: SearchBarLeadingIcon,
  TrailingIcon: SearchBarTrailingIcon,
})
const DockedSearchBar = Object.assign(DockedSearchBarRoot, {
  LeadingIcon: SearchBarLeadingIcon,
  TrailingIcon: SearchBarTrailingIcon,
})

function NavigationBarItem({
  selected,
  onClick,
  label,
  icon,
  iconFilled = false,
  enabled = true,
  alwaysShowLabel = true,
  colors,
  ...props
}: ComposeNavigationBarItemProps) {
  validateNavigationBarItemProps({
    selected,
    onClick,
    label,
    icon,
    iconFilled,
    enabled,
    alwaysShowLabel,
    colors,
  })
  return (
    <ComposeNode
      {...props}
      nodeType="navigationbaritem"
      selected={selected}
      label={label}
      icon={composeIconGlyph('NavigationBarItem icon', icon)}
      iconFilled={iconFilled}
      disabled={!enabled}
      alwaysShowLabel={alwaysShowLabel}
      navigationBarItemColors={colors}
      onNativeComposeNodeButtonPress={() => onClick()}
    />
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

function Surface({
  children,
  color,
  contentColor,
  tonalElevation,
  shadowElevation,
  border,
  enabled = true,
  selected,
  checked,
  onClick,
  onCheckedChange,
  revision = 0,
  ...props
}: ComposeSurfaceProps) {
  validateSurfaceProps({ color, contentColor, tonalElevation, shadowElevation, border, enabled, selected, checked, onClick, onCheckedChange })
  const mode = checked !== undefined ? 'toggleable' : selected !== undefined ? 'selectable' : onClick ? 'clickable' : 'plain'
  const controlled = useControlled<{ value: boolean; eventCount: number; revision: number }>(
    (event) => onCheckedChange?.(event.value), revision
  )
  return (
    <ComposeNode
      {...props}
      nodeType="surface"
      surfaceMode={mode}
      cardColors={{ containerColor: color, contentColor }}
      tonalElevation={tonalElevation}
      shadowElevation={shadowElevation}
      cardBorder={border}
      disabled={!enabled}
      selected={selected}
      value={checked}
      nativeClickable={mode === 'toggleable' ? onCheckedChange !== undefined : onClick !== undefined}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      onNativeComposeNodeButtonPress={onClick ? () => onClick() : undefined}
      onNativeComposeNodeBooleanValueChange={onCheckedChange ? (event) => controlled.onNativeChange(event.nativeEvent) : undefined}
    >
      {children}
    </ComposeNode>
  )
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

function ToggleButtonNode({ children, checked, enabled = true, colors, onCheckedChange, revision = 0, nodeType, ...props }: ComposeToggleButtonProps & { nodeType: 'togglebutton' | 'icontogglebutton' | 'filledicontogglebutton' | 'outlinedicontogglebutton' }) {
  validateToggleButtonProps({ children, checked, enabled, colors, onCheckedChange, revision })
  const controlled = useControlled<{ value: boolean; eventCount: number; revision: number }>(
    (event) => onCheckedChange?.(event.value), revision
  )
  return (
    <ComposeNode
      {...props}
      nodeType={nodeType}
      value={checked}
      disabled={!enabled}
      nativeClickable={onCheckedChange !== undefined}
      toggleButtonColors={colors}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      onNativeComposeNodeBooleanValueChange={onCheckedChange ? (event) => controlled.onNativeChange(event.nativeEvent) : undefined}
    >
      {children}
    </ComposeNode>
  )
}

function ToggleButton(props: ComposeToggleButtonProps) {
  return <ToggleButtonNode {...props} nodeType="togglebutton" />
}

function IconToggleButton(props: ComposeToggleButtonProps) {
  return <ToggleButtonNode {...props} nodeType="icontogglebutton" />
}

function FilledIconToggleButton(props: ComposeToggleButtonProps) {
  return <ToggleButtonNode {...props} nodeType="filledicontogglebutton" />
}

function OutlinedIconToggleButton(props: ComposeToggleButtonProps) {
  return <ToggleButtonNode {...props} nodeType="outlinedicontogglebutton" />
}

function SingleChoiceSegmentedButtonRow({ children, ...props }: ComposeSegmentedButtonRowProps) {
  return <ComposeNode {...props} nodeType="singlechoicesegmentedbuttonrow">{children}</ComposeNode>
}

function MultiChoiceSegmentedButtonRow({ children, ...props }: ComposeSegmentedButtonRowProps) {
  return <ComposeNode {...props} nodeType="multichoicesegmentedbuttonrow">{children}</ComposeNode>
}

function SegmentedButton({ children, selected, checked, enabled = true, colors, onClick, onCheckedChange, revision = 0, ...props }: ComposeSegmentedButtonProps) {
  validateSegmentedButtonProps({ children, selected, checked, enabled, colors, onClick, onCheckedChange, revision })
  const controlled = useControlled<{ value: boolean; eventCount: number; revision: number }>(
    (event) => onCheckedChange?.(event.value), revision
  )
  return (
    <ComposeNode
      {...props}
      nodeType="segmentedbutton"
      selected={selected}
      value={checked ?? false}
      disabled={!enabled}
      nativeClickable={onClick !== undefined || onCheckedChange !== undefined}
      segmentedButtonColors={colors}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      onNativeComposeNodeButtonPress={onClick ? () => onClick() : undefined}
      onNativeComposeNodeBooleanValueChange={onCheckedChange ? (event) => controlled.onNativeChange(event.nativeEvent) : undefined}
    >
      {children}
    </ComposeNode>
  )
}

function Switch({
  isOn,
  disabled = false,
  label = '',
  colors,
  onIsOnChange,
  revision = 0,
  ...props
}: ComposeSwitchProps) {
  validateSwitchProps({ isOn, disabled, label, colors, onIsOnChange, revision })
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
      switchColors={colors}
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
    // a bound field writes its native entry before the event leaves native, and
    // the entry may already hold newer typing: publish the entry to JS
    // subscribers, never the event's older text, which would overwrite it and
    // restart the input method mid-word.
    syncHandle?.set(syncHandle.get())
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
  lowerLimit,
  upperLimit,
  step = 0,
  disabled = false,
  colors,
  ...props
}: ComposeSliderProps) {
  validateSliderProps({
    value,
    onValueChange,
    revision,
    minimumValue,
    maximumValue,
    lowerLimit,
    upperLimit,
    step,
    disabled,
    colors,
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
      sliderOptions={{ lowerLimit, upperLimit, colors }}
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
  color,
  trackColor,
  strokeCap,
  gapSize,
  strokeWidth,
  drawStopIndicator,
  stopSize,
  amplitude,
  wavelength,
  waveSpeed,
  ...props
}: ComposeProgressIndicatorProps) {
  validateProgressIndicatorProps({ variant, progress, color, trackColor, strokeCap, gapSize, strokeWidth, drawStopIndicator, stopSize, amplitude, wavelength, waveSpeed })
  return (
    <ComposeNode
      {...props}
      nodeType="progressindicator"
      progressVariant={variant}
      progress={progress ?? undefined}
      progressOptions={{ color, trackColor, strokeCap, gapSize, strokeWidth, drawStopIndicator, stopSize, amplitude, wavelength, waveSpeed }}
    />
  )
}

type ProgressVariantProps = Omit<ComposeProgressIndicatorProps, 'variant'>

function LinearProgressIndicator(props: ProgressVariantProps) {
  return <ProgressIndicator {...props} variant="linear" />
}

function CircularProgressIndicator(props: ProgressVariantProps) {
  return <ProgressIndicator {...props} variant="circular" />
}

function LinearWavyProgressIndicator(props: ProgressVariantProps) {
  return <ProgressIndicator {...props} variant="linearWavy" />
}

function CircularWavyProgressIndicator(props: ProgressVariantProps) {
  return <ProgressIndicator {...props} variant="circularWavy" />
}

function LoadingIndicator({ progress, color, ...props }: ComposeLoadingIndicatorProps) {
  validateLoadingIndicatorProps({ progress, color })
  return <ComposeNode {...props} nodeType="loadingindicator" progress={progress === undefined ? undefined : progress ?? 0} loadingColors={{ color }} />
}

function ContainedLoadingIndicator({ progress, color, containerColor, ...props }: ComposeContainedLoadingIndicatorProps) {
  validateLoadingIndicatorProps({ progress, color, containerColor })
  return <ComposeNode {...props} nodeType="containedloadingindicator" progress={progress === undefined ? undefined : progress ?? 0} loadingColors={{ color, containerColor }} />
}

// native reports the selected day as utc midnight millis; keep the local time of day
function withUtcDay(selection: Date, utcDay: number) {
  const day = new Date(utcDay)
  const next = new Date(selection)
  next.setFullYear(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
  return next
}

// native reports minutes since local midnight; keep the local calendar day
function withMinuteOfDay(selection: Date, minutes: number) {
  const next = new Date(selection)
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return next
}

const minuteOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes()

function datePickerOptions({
  minimumDate,
  maximumDate,
  showModeToggle = true,
  color,
  colors,
}: Pick<ComposeDatePickerProps, 'minimumDate' | 'maximumDate' | 'showModeToggle' | 'color' | 'colors'>) {
  return {
    showModeToggle,
    minimumDay: minimumDate && composeUtcDay(minimumDate),
    maximumDay: maximumDate && composeUtcDay(maximumDate),
    color,
    colors,
  }
}

function DatePicker({
  selection,
  onSelectionChange,
  revision = 0,
  minimumDate,
  maximumDate,
  variant = 'picker',
  showModeToggle,
  color,
  colors,
  ...props
}: ComposeDatePickerProps) {
  validateDatePickerProps({ selection, revision, minimumDate, maximumDate, variant, showModeToggle, color, colors })
  assertFunction(onSelectionChange, 'DatePicker onSelectionChange')
  const controlled = useControlled<{ value: number; eventCount: number; revision: number }>(
    (event) => onSelectionChange(withUtcDay(selection, event.value)),
    revision
  )
  return (
    <ComposeNode
      {...props}
      nodeType="datepicker"
      numberValue={composeUtcDay(selection)}
      variant={variant}
      pickerOptions={datePickerOptions({ minimumDate, maximumDate, showModeToggle, color, colors })}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      onNativeComposeNodeNumberValueChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}

function TimePicker({
  selection,
  onSelectionChange,
  revision = 0,
  is24Hour,
  variant = 'picker',
  color,
  colors,
  ...props
}: ComposeTimePickerProps) {
  validateTimePickerProps({ selection, revision, is24Hour, variant, color, colors })
  assertFunction(onSelectionChange, 'TimePicker onSelectionChange')
  const controlled = useControlled<{ value: number; eventCount: number; revision: number }>(
    (event) => onSelectionChange(withMinuteOfDay(selection, event.value)),
    revision
  )
  return (
    <ComposeNode
      {...props}
      nodeType="timepicker"
      numberValue={minuteOfDay(selection)}
      variant={variant}
      pickerOptions={{ is24Hour, color, colors }}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      onNativeComposeNodeNumberValueChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}

function DatePickerDialog({
  visible,
  selection,
  onConfirm,
  onDismiss,
  confirmLabel,
  dismissLabel,
  minimumDate,
  maximumDate,
  variant = 'picker',
  showModeToggle,
  color,
  colors,
  ...props
}: ComposeDatePickerDialogProps) {
  validatePickerDialogProps({ visible, onConfirm, onDismiss, confirmLabel, dismissLabel }, 'DatePickerDialog')
  validateDatePickerProps({ selection, minimumDate, maximumDate, variant, showModeToggle, color, colors }, 'DatePickerDialog')
  return (
    <ComposeNode
      {...props}
      nodeType="datepickerdialog"
      visible={visible}
      numberValue={composeUtcDay(selection)}
      variant={variant}
      confirmLabel={confirmLabel}
      dismissLabel={dismissLabel}
      pickerOptions={datePickerOptions({ minimumDate, maximumDate, showModeToggle, color, colors })}
      onNativeComposeNodeDialogConfirm={(event) => onConfirm(withUtcDay(selection, event.nativeEvent.value))}
      onNativeComposeNodeDialogDismiss={() => onDismiss()}
    />
  )
}

function TimePickerDialog({
  visible,
  selection,
  onConfirm,
  onDismiss,
  confirmLabel,
  dismissLabel,
  is24Hour,
  variant = 'picker',
  color,
  colors,
  ...props
}: ComposeTimePickerDialogProps) {
  validatePickerDialogProps({ visible, onConfirm, onDismiss, confirmLabel, dismissLabel }, 'TimePickerDialog')
  validateTimePickerProps({ selection, is24Hour, variant, color, colors }, 'TimePickerDialog')
  return (
    <ComposeNode
      {...props}
      nodeType="timepickerdialog"
      visible={visible}
      numberValue={minuteOfDay(selection)}
      variant={variant}
      confirmLabel={confirmLabel}
      dismissLabel={dismissLabel}
      pickerOptions={{ is24Hour, color, colors }}
      onNativeComposeNodeDialogConfirm={(event) => onConfirm(withMinuteOfDay(selection, event.nativeEvent.value))}
      onNativeComposeNodeDialogDismiss={() => onDismiss()}
    />
  )
}

function BasicAlertDialog({
  children,
  onDismissRequest,
  properties,
  ...props
}: ComposeBasicAlertDialogProps) {
  validateComposeFamily('dialog', { properties, onDismissRequest })
  return (
    <ComposeNode
      {...props}
      nodeType="basicalertdialog"
      familyOptions={properties}
      onNativeComposeNodeDialogDismiss={() => onDismissRequest?.()}
    >
      {children}
    </ComposeNode>
  )
}

function carousel(
  nodeType: 'centeredherocarousel' | 'multibrowsecarousel' | 'uncontainedcarousel'
) {
  return ({
    children,
    contentPadding,
    itemSpacing,
    flingBehavior,
    userScrollEnabled,
    maxItemWidth,
    minSmallItemWidth,
    maxSmallItemWidth,
    preferredItemWidth,
    itemWidth,
    ...props
  }: ComposeHorizontalCenteredHeroCarouselProps & {
    preferredItemWidth?: number
    itemWidth?: number
  }) => {
    const options = {
      itemSpacing,
      flingBehavior,
      userScrollEnabled,
      maxItemWidth,
      minSmallItemWidth,
      maxSmallItemWidth,
      preferredItemWidth,
      itemWidth,
    }
    validateComposeFamily(nodeType, { ...options, contentPadding })
    const padding =
      typeof contentPadding === 'number'
        ? {
            start: contentPadding,
            end: contentPadding,
            top: contentPadding,
            bottom: contentPadding,
          }
        : contentPadding
    return (
      <ComposeNode
        {...props}
        nodeType={nodeType}
        familyOptions={options}
        lazyContentPadding={padding}
      >
        {children}
      </ComposeNode>
    )
  }
}
const HorizontalCenteredHeroCarousel = carousel('centeredherocarousel') as (
  props: ComposeHorizontalCenteredHeroCarouselProps
) => ReactNode
const HorizontalMultiBrowseCarousel = carousel('multibrowsecarousel') as (
  props: ComposeHorizontalMultiBrowseCarouselProps
) => ReactNode
const HorizontalUncontainedCarousel = carousel('uncontainedcarousel') as (
  props: ComposeHorizontalUncontainedCarouselProps
) => ReactNode

function dateRangeNode(
  props: ComposeDateRangePickerProps | ComposeDateRangePickerDialogProps,
  dialog: boolean
) {
  validateComposeFamily('range', props)
  const {
    initialStartDate,
    initialEndDate,
    onDateRangeSelected,
    variant,
    showVariantToggle,
    showTitle,
    showHeadline,
    color,
    elementColors,
    selectableDates,
    ...rest
  } = props
  const { onDismissRequest, confirmButtonLabel, dismissButtonLabel, ...nodeProps } =
    rest as typeof rest & Partial<ComposeDateRangePickerDialogProps>
  return (
    <ComposeNode
      {...nodeProps}
      nodeType={dialog ? 'daterangepickerdialog' : 'daterangepicker'}
      variant={variant}
      confirmLabel={confirmButtonLabel}
      dismissLabel={dismissButtonLabel}
      familyOptions={{
        initialStart:
          initialStartDate == null
            ? undefined
            : composeRangeDay(new Date(initialStartDate)),
        initialEnd:
          initialEndDate == null ? undefined : composeRangeDay(new Date(initialEndDate)),
        showTitle,
        showHeadline,
      }}
      pickerOptions={{
        minimumDay: selectableDates?.start && composeRangeDay(selectableDates.start),
        maximumDay: selectableDates?.end && composeRangeDay(selectableDates.end),
        showModeToggle: showVariantToggle,
        color,
        colors: elementColors,
      }}
      onNativeComposeNodeDateRangeSelected={({
        nativeEvent: { start, end, hasStart, hasEnd },
      }) =>
        onDateRangeSelected?.({
          start: hasStart ? new Date(start) : null,
          end: hasEnd ? new Date(end) : null,
        })
      }
      onNativeComposeNodeDialogDismiss={() => onDismissRequest?.()}
    />
  )
}
function DateRangePicker(props: ComposeDateRangePickerProps) {
  return dateRangeNode(props, false)
}
function DateRangePickerDialog(props: ComposeDateRangePickerDialogProps) {
  assertFunction(props.onDismissRequest, 'DateRangePickerDialog onDismissRequest')
  return dateRangeNode(props, true)
}
function ToolbarRoot({
  children,
  variant,
  colors,
  ...props
}: ComposeHorizontalFloatingToolbarProps) {
  validateComposeFamily('toolbar', { variant, colors })
  return (
    <ComposeNode
      {...props}
      nodeType="horizontalfloatingtoolbar"
      text={variant}
      familyOptions={colors}
    >
      {children}
    </ComposeNode>
  )
}
function ToolbarFab({ children, onPress, ...props }: ComposeToolbarFabProps) {
  if (onPress !== undefined) assertFunction(onPress, 'Toolbar FAB onPress')
  return (
    <ComposeNode
      {...props}
      nodeType="toolbarfabslot"
      slotName="floatingActionButton"
      onNativeComposeNodeButtonPress={onPress}
    >
      {children}
    </ComposeNode>
  )
}
const HorizontalFloatingToolbar = Object.assign(ToolbarRoot, {
  FloatingActionButton: ToolbarFab,
})
function shape(type: ComposeShapeType) {
  return ({
    cornerRadii,
    color,
    cornerRounding,
    smoothing,
    verticesCount,
    innerRadius,
    radius,
    ...props
  }: ComposeShapeProps) => {
    const options = {
      shapeType: type,
      color,
      cornerRounding,
      smoothing,
      verticesCount,
      innerRadius,
      radius,
      ...cornerRadii,
    }
    validateComposeFamily('shape', options)
    return <ComposeNode {...props} nodeType="shape" familyOptions={options} />
  }
}
const Shape = {
  Star: shape('star'),
  PillStar: shape('pillStar'),
  Pill: shape('pill'),
  Circle: shape('circle'),
  Rectangle: shape('rectangle'),
  Polygon: shape('polygon'),
  RoundedCorner: shape('roundedCorner'),
}
let nextSyncCallback = 1
function SyncSwitch({
  isOn,
  enabled = true,
  onCheckedChangeSync,
  ...props
}: ComposeSyncSwitchProps) {
  validateComposeFamily('syncswitch', { isOn, enabled })
  if (onCheckedChangeSync !== undefined && !isWorkletFunction(onCheckedChangeSync))
    throw new Error('SyncSwitch onCheckedChangeSync must be a worklet')
  const [callbackId] = useState(() => nextSyncCallback++)
  useEffect(() => {
    runOnUISync(() => {
      'worklet'
      const globals = globalThis as unknown as {
        __OneComposeCallbacks?: Record<number, ((value: boolean) => void) | undefined>
      }
      const callbacks = (globals.__OneComposeCallbacks ??= {})
      callbacks[callbackId] = onCheckedChangeSync
    })
    return () =>
      runOnUISync(() => {
        'worklet'
        delete (
          globalThis as unknown as { __OneComposeCallbacks?: Record<number, unknown> }
        ).__OneComposeCallbacks?.[callbackId]
      })
  }, [callbackId, onCheckedChangeSync])
  const value = useSyncValue(isOn)
  return (
    <ComposeNode
      {...props}
      nodeType="switch"
      value={value}
      syncStateId={getSyncStateId(isOn)}
      disabled={!enabled}
      familyOptions={{ syncCallbackId: callbackId }}
      onNativeComposeNodeBooleanValueChange={() => isOn.set(isOn.value)}
    />
  )
}

export const Compose = {
  BasicAlertDialog,
  HorizontalCenteredHeroCarousel,
  HorizontalMultiBrowseCarousel,
  HorizontalUncontainedCarousel,
  DateRangePicker,
  DateRangePickerDialog,
  HorizontalFloatingToolbar,
  Shape,
  SyncSwitch,

  Column,
  Row,
  Spacer,
  FlowRow,
  Box,
  Badge,
  BadgedBox,
  ListItem,
  Card,
  ElevatedCard,
  OutlinedCard,
  Surface,
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
  ToggleButton,
  IconToggleButton,
  FilledIconToggleButton,
  OutlinedIconToggleButton,
  SingleChoiceSegmentedButtonRow,
  MultiChoiceSegmentedButtonRow,
  SegmentedButton,
  Switch,
  Checkbox,
  RadioButton,
  TextField,
  Slider,
  AlertDialog,
  Dialog,
  LazyColumn,
  LazyRow,
  Image,
  Snackbar,
  SnackbarHost,
  ModalBottomSheet,
  NavigationBar,
  NavigationBarItem,
  SearchBar,
  DockedSearchBar,
  DropdownMenu,
  DropdownMenuItem,
  ExposedDropdownMenuBox,
  PullToRefreshBox,
  TooltipBox,
  AnimatedVisibility,
  ProgressIndicator,
  LinearProgressIndicator,
  CircularProgressIndicator,
  LinearWavyProgressIndicator,
  CircularWavyProgressIndicator,
  LoadingIndicator,
  ContainedLoadingIndicator,
  DatePicker,
  TimePicker,
  DatePickerDialog,
  TimePickerDialog,
}
