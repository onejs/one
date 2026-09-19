import type { ColorValue, StyleProp, ViewProps, ViewStyle } from 'react-native'

export type CurvePreset = 'smooth' | 'smoother' | 'sharp' | 'gentle' | 'soft' | 'linear'

export interface CubicBezierCurve {
  type: 'cubicBezier'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface StopsCurve {
  type: 'stops'
  /** alpha values in [0,1], inner edge to outer edge. minimum 2 entries. */
  values: [number, number, ...number[]]
}

export type EdgeFadeCurve = CurvePreset | CubicBezierCurve | StopsCurve

export type EdgeFadeMode = 'mask' | 'overlay'

export interface EdgeConfig {
  /** fade depth in dp. overrides the component-level `size`. */
  size?: number
  /** gradient curve. overrides the component-level `curve`. */
  curve?: EdgeFadeCurve
  /** per-edge overlay color (overlay mode only). overrides `color`. */
  color?: ColorValue
}

export interface EdgeFadeProps extends ViewProps {
  top?: boolean | number | EdgeConfig
  bottom?: boolean | number | EdgeConfig
  left?: boolean | number | EdgeConfig
  right?: boolean | number | EdgeConfig
  /** logical leading edge. maps to `left` in LTR, `right` in RTL. overrides the physical prop. */
  start?: boolean | number | EdgeConfig
  /** logical trailing edge. maps to `right` in LTR, `left` in RTL. overrides the physical prop. */
  end?: boolean | number | EdgeConfig
  /** default fade depth in dp for all enabled edges. */
  size?: number
  /** default gradient curve for all enabled edges. */
  curve?: EdgeFadeCurve
  /**
   * 'mask' paints no color: children alpha-fade to transparent (native
   * primitive, the only way to alpha-mask on native). 'overlay' paints a
   * color gradient over the children (RN core backgroundImage gradients,
   * no native code). inferred from `color` when omitted.
   */
  mode?: EdgeFadeMode
  /**
   * overlay mode: gradient target color, opaque at the outer edge fading to
   * transparent at the inner edge. per-edge `EdgeConfig.color` overrides it.
   * ignored in mask mode.
   */
  color?: ColorValue
  /**
   * corner radius in dp, applied with the fade (mask mode) or as a clipped
   * container (overlay mode). use this instead of `style.borderRadius`,
   * which is ignored with a dev warning.
   */
  radius?: number
  style?: StyleProp<ViewStyle>
}
