import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type {
  ImageStyle,
  LayoutChangeEvent,
  StyleProp,
  TextStyle,
  ViewProps,
  ViewStyle,
} from 'react-native'
import { flattenStyle } from '../effects/normalize'

// one's web components render plain divs so no web bundle needs
// react-native-web. this is the box a react native View lays out as, so a
// View style means the same thing on every platform.
export const VIEW_BASE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  position: 'relative',
  boxSizing: 'border-box',
  minWidth: 0,
  minHeight: 0,
}

type AxisShorthands = {
  paddingHorizontal?: CSSProperties['paddingLeft']
  paddingVertical?: CSSProperties['paddingTop']
  marginHorizontal?: CSSProperties['marginLeft']
  marginVertical?: CSSProperties['marginTop']
}

// a View style is layout css: react-dom adds px to its bare numbers. only the
// axis shorthands react native adds on top of css need expanding.
export function domStyle(style: StyleProp<ViewStyle | TextStyle | ImageStyle>): CSSProperties {
  const {
    paddingHorizontal,
    paddingVertical,
    marginHorizontal,
    marginVertical,
    ...rest
  } = flattenStyle(style) as CSSProperties & AxisShorthands
  return {
    ...(paddingHorizontal != null && { paddingLeft: paddingHorizontal, paddingRight: paddingHorizontal }),
    ...(paddingVertical != null && { paddingTop: paddingVertical, paddingBottom: paddingVertical }),
    ...(marginHorizontal != null && { marginLeft: marginHorizontal, marginRight: marginHorizontal }),
    ...(marginVertical != null && { marginTop: marginVertical, marginBottom: marginVertical }),
    ...rest,
  }
}

export type DomViewProps = Pick<
  ViewProps,
  'testID' | 'nativeID' | 'onLayout' | 'accessibilityLabel' | 'style'
> & {
  children?: ReactNode
  baseStyle?: CSSProperties
}

// a View for one's own web components: style, test id, native id, label and
// onLayout, the props they pass through.
export function DomView({
  testID,
  nativeID,
  onLayout,
  accessibilityLabel,
  style,
  baseStyle,
  children,
}: DomViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onLayoutRef = useRef(onLayout)
  onLayoutRef.current = onLayout
  const observesLayout = onLayout != null

  useEffect(() => {
    const node = ref.current
    if (!observesLayout || !node) return
    const observer = new ResizeObserver(() => {
      const layout = {
        x: node.offsetLeft,
        y: node.offsetTop,
        width: node.offsetWidth,
        height: node.offsetHeight,
      }
      // react-native-web hands onLayout the same partial event.
      const event = { nativeEvent: { layout }, timeStamp: Date.now() }
      onLayoutRef.current?.(event as unknown as LayoutChangeEvent)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [observesLayout])

  return (
    <div
      ref={ref}
      data-testid={testID}
      id={nativeID}
      aria-label={accessibilityLabel}
      style={{
        ...VIEW_BASE,
        ...baseStyle,
        ...domStyle(style),
      }}
    >
      {children}
    </div>
  )
}
