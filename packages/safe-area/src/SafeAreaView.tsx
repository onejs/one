import * as React from 'react'
import { useSafeAreaInsets } from './SafeAreaContext'
import type {
  Edge,
  NativeSafeAreaViewInstance,
  NativeSafeAreaViewProps,
} from './SafeArea-types'

// prettier-ignore
const TOP = 0b1000
const RIGHT = 0b0100
const BOTTOM = 0b0010
const LEFT = 0b0001
const ALL = 0b1111

/* eslint-disable no-bitwise */

const edgeBitmaskMap: Record<Edge, number> = {
  top: TOP,
  right: RIGHT,
  bottom: BOTTOM,
  left: LEFT,
}

export const SafeAreaView = React.forwardRef<
  NativeSafeAreaViewInstance,
  NativeSafeAreaViewProps
>(({ style = {}, mode, edges, ...rest }, ref) => {
  const insets = useSafeAreaInsets()

  const edgeBitmask =
    edges != null
      ? Array.isArray(edges)
        ? edges.reduce((acc: number, edge: Edge) => acc | edgeBitmaskMap[edge], 0)
        : Object.keys(edges).reduce((acc, edge) => acc | edgeBitmaskMap[edge as Edge], 0)
      : ALL

  const appliedStyle = React.useMemo(() => {
    const insetTop = edgeBitmask & TOP ? insets.top : 0
    const insetRight = edgeBitmask & RIGHT ? insets.right : 0
    const insetBottom = edgeBitmask & BOTTOM ? insets.bottom : 0
    const insetLeft = edgeBitmask & LEFT ? insets.left : 0

    // cast to unknown[] so ts doesn't recurse the StyleProp union (TS2589)
    const flatStyle = (
      Array.isArray(style) ? (style as unknown[]).flat(Number.POSITIVE_INFINITY) : [style]
    ).reduce<Record<string, any>>(
      (result, value) => (value ? Object.assign(result, value as object) : result),
      {}
    )

    if (mode === 'margin') {
      const {
        margin = 0,
        marginVertical = margin,
        marginHorizontal = margin,
        marginTop = marginVertical,
        marginRight = marginHorizontal,
        marginBottom = marginVertical,
        marginLeft = marginHorizontal,
      } = flatStyle

      const marginStyle = {
        marginTop: marginTop + insetTop,
        marginRight: marginRight + insetRight,
        marginBottom: marginBottom + insetBottom,
        marginLeft: marginLeft + insetLeft,
      }

      const {
        marginVertical: _marginVertical,
        marginHorizontal: _marginHorizontal,
        ...domStyle
      } = flatStyle
      return { ...domStyle, ...marginStyle }
    }

    const {
      padding = 0,
      paddingVertical = padding,
      paddingHorizontal = padding,
      paddingTop = paddingVertical,
      paddingRight = paddingHorizontal,
      paddingBottom = paddingVertical,
      paddingLeft = paddingHorizontal,
    } = flatStyle

    const paddingStyle = {
      paddingTop: paddingTop + insetTop,
      paddingRight: paddingRight + insetRight,
      paddingBottom: paddingBottom + insetBottom,
      paddingLeft: paddingLeft + insetLeft,
    }

    const {
      paddingVertical: _paddingVertical,
      paddingHorizontal: _paddingHorizontal,
      ...domStyle
    } = flatStyle
    return { ...domStyle, ...paddingStyle }
  }, [style, insets, mode, edgeBitmask])

  return (
    <div
      {...(rest as React.HTMLAttributes<HTMLDivElement>)}
      style={appliedStyle as React.CSSProperties}
      ref={ref}
    />
  )
})
