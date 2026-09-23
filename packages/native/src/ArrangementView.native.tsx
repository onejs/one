import { Children, isValidElement, useEffect, type ReactNode } from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'
import { dispatchSDKEvent, swiftStyleNative } from './generated/swiftStyleNative'
import type { OneNativeStyle } from './generated/controlTypes'
import NativeArrangementView from './specs/OneNativeArrangementViewNativeComponent'
import NativeArrangementSlot from './specs/OneNativeArrangementSlotNativeComponent'
import { onHingeChange, type HingeState } from './adaptive/index.native'

const PANE_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
} as const

export type ArrangementViewStyle =
  | 'automatic'
  | 'split'
  | 'overlay'
  | { kind: 'automatic' }
  | { kind: 'split'; axes?: ('horizontal' | 'vertical')[] | 'horizontal' | 'vertical' | 'both' }
  | { kind: 'overlay'; axes?: ('horizontal' | 'vertical')[] | 'horizontal' | 'vertical' | 'both' }

export type SplitLayoutRatio =
  | number
  | {
      minHorizontal?: number
      idealHorizontal?: number
      maxHorizontal?: number
      minVertical?: number
      idealVertical?: number
      maxVertical?: number
    }

export interface SplitLayoutSize {
  minWidth?: number
  idealWidth?: number
  maxWidth?: number
  minHeight?: number
  idealHeight?: number
  maxHeight?: number
}

export type SplitFixedLayoutSize = boolean | { horizontal?: boolean; vertical?: boolean }

export type OverlayArrangementEdge = 'top' | 'bottom'

export interface ArrangementPaneProps {
  children?: ReactNode
  splitArrangementLayoutRatio?: SplitLayoutRatio
  splitArrangementLayoutSize?: SplitLayoutSize
  splitArrangementFixedLayoutSize?: SplitFixedLayoutSize
  overlayArrangementEdge?: OverlayArrangementEdge
  testID?: string
}

export function ArrangementPrimary(_props: ArrangementPaneProps): never {
  throw new Error('Swift.ArrangementView.Primary must be a direct child of Swift.ArrangementView')
}

export function ArrangementSecondary(_props: ArrangementPaneProps): never {
  throw new Error('Swift.ArrangementView.Secondary must be a direct child of Swift.ArrangementView')
}

export interface ArrangementViewProps {
  children?: ReactNode
  primary?: ReactNode
  secondary?: ReactNode
  leading?: ReactNode
  detail?: ReactNode
  arrangementViewStyle?: ArrangementViewStyle
  splitArrangementLayoutRatio?: SplitLayoutRatio
  splitArrangementLayoutSize?: SplitLayoutSize
  splitArrangementFixedLayoutSize?: SplitFixedLayoutSize
  overlayArrangementEdge?: OverlayArrangementEdge
  swiftStyle?: OneNativeStyle
  style?: StyleProp<ViewStyle>
  testID?: string
  onHingeChange?: (hinge: HingeState | null) => void
}

function parseStyle(styleProp?: ArrangementViewStyle) {
  if (!styleProp) return { style: 'automatic', splitAxes: 'both', overlayAxes: 'both' }
  if (typeof styleProp === 'string') {
    return { style: styleProp, splitAxes: 'both', overlayAxes: 'both' }
  }
  const kind = styleProp.kind
  const axesVal = (axes?: ('horizontal' | 'vertical')[] | 'horizontal' | 'vertical' | 'both') => {
    if (!axes) return 'both'
    if (Array.isArray(axes)) {
      if (axes.includes('horizontal') && axes.includes('vertical')) return 'both'
      if (axes.includes('horizontal')) return 'horizontal'
      if (axes.includes('vertical')) return 'vertical'
      return 'both'
    }
    return axes
  }
  if (kind === 'split') {
    return { style: 'split', splitAxes: axesVal(styleProp.axes), overlayAxes: 'both' }
  }
  if (kind === 'overlay') {
    return { style: 'overlay', splitAxes: 'both', overlayAxes: axesVal(styleProp.axes) }
  }
  return { style: 'automatic', splitAxes: 'both', overlayAxes: 'both' }
}

function parseRatio(ratio?: SplitLayoutRatio) {
  if (ratio === undefined) return { ratio: -1 }
  if (typeof ratio === 'number') return { ratio }
  return {
    ratio: -1,
    minHorizontal: ratio.minHorizontal ?? -1,
    idealHorizontal: ratio.idealHorizontal ?? -1,
    maxHorizontal: ratio.maxHorizontal ?? -1,
    minVertical: ratio.minVertical ?? -1,
    idealVertical: ratio.idealVertical ?? -1,
    maxVertical: ratio.maxVertical ?? -1,
  }
}

function parseSize(size?: SplitLayoutSize) {
  if (!size) return {}
  return {
    minWidth: size.minWidth ?? -1,
    idealWidth: size.idealWidth ?? -1,
    maxWidth: size.maxWidth ?? -1,
    minHeight: size.minHeight ?? -1,
    idealHeight: size.idealHeight ?? -1,
    maxHeight: size.maxHeight ?? -1,
  }
}

function parseFixed(fixed?: SplitFixedLayoutSize) {
  if (fixed === undefined) return { horizontal: false, vertical: false }
  if (typeof fixed === 'boolean') return { horizontal: fixed, vertical: fixed }
  return {
    horizontal: Boolean(fixed.horizontal),
    vertical: Boolean(fixed.vertical),
  }
}

export function ArrangementViewComponent({
  children,
  primary,
  secondary,
  leading,
  detail,
  arrangementViewStyle = 'automatic',
  splitArrangementLayoutRatio,
  splitArrangementLayoutSize,
  splitArrangementFixedLayoutSize,
  overlayArrangementEdge,
  swiftStyle,
  style,
  testID,
  onHingeChange: onHingeChangeProp,
  ...props
}: ArrangementViewProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (Platform.OS === 'ios' && iosVersion < 27.1) {
    throw new Error('Swift.ArrangementView requires iOS 27.1 or later')
  }

  useEffect(() => {
    if (onHingeChangeProp) {
      return onHingeChange(onHingeChangeProp)
    }
  }, [onHingeChangeProp])

  let primaryNode: ReactNode = primary ?? leading
  let secondaryNode: ReactNode = secondary ?? detail
  let primaryProps: ArrangementPaneProps = {}
  let secondaryProps: ArrangementPaneProps = {}

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === ArrangementPrimary) {
      primaryNode = (child.props as ArrangementPaneProps).children
      primaryProps = child.props as ArrangementPaneProps
    } else if (child.type === ArrangementSecondary) {
      secondaryNode = (child.props as ArrangementPaneProps).children
      secondaryProps = child.props as ArrangementPaneProps
    }
  })

  const styleConfig = parseStyle(arrangementViewStyle)
  const ratioConfig = parseRatio(splitArrangementLayoutRatio)
  const sizeConfig = parseSize(splitArrangementLayoutSize)
  const fixedConfig = parseFixed(splitArrangementFixedLayoutSize)

  const primaryRatio = parseRatio(primaryProps.splitArrangementLayoutRatio)
  const primarySize = parseSize(primaryProps.splitArrangementLayoutSize)
  const primaryFixed = parseFixed(primaryProps.splitArrangementFixedLayoutSize)

  const secondaryRatio = parseRatio(secondaryProps.splitArrangementLayoutRatio)
  const secondarySize = parseSize(secondaryProps.splitArrangementLayoutSize)
  const secondaryFixed = parseFixed(secondaryProps.splitArrangementFixedLayoutSize)

  return (
    <NativeArrangementView
      {...props}
      testID={testID}
      style={[{ flex: 1 }, style]}
      swiftStyle={swiftStyleNative(swiftStyle)}
      onNativeSDKEvent={({ nativeEvent }) =>
        dispatchSDKEvent(swiftStyle, nativeEvent.name, nativeEvent.value)
      }
      arrangementViewStyle={styleConfig.style}
      splitAxes={styleConfig.splitAxes}
      overlayAxes={styleConfig.overlayAxes}
      splitRatio={ratioConfig.ratio}
      splitMinHorizontal={ratioConfig.minHorizontal ?? -1}
      splitIdealHorizontal={ratioConfig.idealHorizontal ?? -1}
      splitMaxHorizontal={ratioConfig.maxHorizontal ?? -1}
      splitMinVertical={ratioConfig.minVertical ?? -1}
      splitIdealVertical={ratioConfig.idealVertical ?? -1}
      splitMaxVertical={ratioConfig.maxVertical ?? -1}
      splitMinWidth={sizeConfig.minWidth ?? -1}
      splitIdealWidth={sizeConfig.idealWidth ?? -1}
      splitMaxWidth={sizeConfig.maxWidth ?? -1}
      splitMinHeight={sizeConfig.minHeight ?? -1}
      splitIdealHeight={sizeConfig.idealHeight ?? -1}
      splitMaxHeight={sizeConfig.maxHeight ?? -1}
      splitFixedHorizontal={fixedConfig.horizontal}
      splitFixedVertical={fixedConfig.vertical}
      overlayEdge={overlayArrangementEdge ?? ''}
    >
      <NativeArrangementSlot
        placement="primary"
        style={PANE_STYLE}
        collapsable={false}
        testID={primaryProps.testID}
        splitRatio={primaryRatio.ratio}
        splitMinHorizontal={primaryRatio.minHorizontal ?? -1}
        splitIdealHorizontal={primaryRatio.idealHorizontal ?? -1}
        splitMaxHorizontal={primaryRatio.maxHorizontal ?? -1}
        splitMinVertical={primaryRatio.minVertical ?? -1}
        splitIdealVertical={primaryRatio.idealVertical ?? -1}
        splitMaxVertical={primaryRatio.maxVertical ?? -1}
        splitMinWidth={primarySize.minWidth ?? -1}
        splitIdealWidth={primarySize.idealWidth ?? -1}
        splitMaxWidth={primarySize.maxWidth ?? -1}
        splitMinHeight={primarySize.minHeight ?? -1}
        splitIdealHeight={primarySize.idealHeight ?? -1}
        splitMaxHeight={primarySize.maxHeight ?? -1}
        splitFixedHorizontal={primaryFixed.horizontal}
        splitFixedVertical={primaryFixed.vertical}
        overlayEdge={primaryProps.overlayArrangementEdge ?? ''}
      >
        {primaryNode}
      </NativeArrangementSlot>
      <NativeArrangementSlot
        placement="secondary"
        style={PANE_STYLE}
        collapsable={false}
        testID={secondaryProps.testID}
        splitRatio={secondaryRatio.ratio}
        splitMinHorizontal={secondaryRatio.minHorizontal ?? -1}
        splitIdealHorizontal={secondaryRatio.idealHorizontal ?? -1}
        splitMaxHorizontal={secondaryRatio.maxHorizontal ?? -1}
        splitMinVertical={secondaryRatio.minVertical ?? -1}
        splitIdealVertical={secondaryRatio.idealVertical ?? -1}
        splitMaxVertical={secondaryRatio.maxVertical ?? -1}
        splitMinWidth={secondarySize.minWidth ?? -1}
        splitIdealWidth={secondarySize.idealWidth ?? -1}
        splitMaxWidth={secondarySize.maxWidth ?? -1}
        splitMinHeight={secondarySize.minHeight ?? -1}
        splitIdealHeight={secondarySize.idealHeight ?? -1}
        splitMaxHeight={secondarySize.maxHeight ?? -1}
        splitFixedHorizontal={secondaryFixed.horizontal}
        splitFixedVertical={secondaryFixed.vertical}
        overlayEdge={secondaryProps.overlayArrangementEdge ?? ''}
      >
        {secondaryNode}
      </NativeArrangementSlot>
    </NativeArrangementView>
  )
}

export const ArrangementView = Object.assign(ArrangementViewComponent, {
  Primary: ArrangementPrimary,
  Secondary: ArrangementSecondary,
  Leading: ArrangementPrimary,
  Detail: ArrangementSecondary,
})
