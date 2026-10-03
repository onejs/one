import {
  getVariableValue,
  resolveSizing,
  resolveTextMetrics,
  type ComponentSize,
} from '@tamagui/core'
import { TextArea as TamaguiTextArea, styled } from 'tamagui'
import { fieldBaseStyle } from './Input'
import type { GetProps } from 'tamagui'

// textarea floors are textarea-specific, not ladder geometry: the ladder has
// no multi-line height, so each rung keeps its own floor here. the map stays
// open to rung names the ladder does not know, which fall back to md.
const textAreaMinH: Record<string, number> = {
  xs: 64,
  sm: 80,
  md: 100,
  lg: 120,
  xl: 144,
}

const getTextAreaSize = styled.dynamic<ComponentSize | boolean>((val, env) => {
  const sizing = resolveSizing(val, env)
  if (!sizing) return
  return {
    rounded: sizing.radius,
    fontSize: sizing.fontSize,
    minH: textAreaMinH[sizing.name] ?? 100,
    px: sizing.paddingInline,
    py: sizing.paddingBlock,
  }
})

export type TextAreaProps = GetProps<typeof TextArea>

// one explicit height, owned here. the base input resolves rows into its own
// explicit height while the size variant above only floors with minH, so a
// parent that measures the field without yoga's max (a native form fitting
// its rows) can reserve the rows height while the field paints the floor, and
// the next row lands inside it. recompute the same rows height the base owns
// and emit the max of the two, so yoga and every other measurer agree; yoga
// already takes this max today, so its layout does not move.
function textAreaHeight(
  props: {
    size?: unknown
    fontFamily?: unknown
    fontSize?: unknown
    lineHeight?: unknown
    rows?: unknown
    numberOfLines?: unknown
  },
  env: {
    fonts: Record<
      string,
      { size: Record<string, unknown>; lineHeight: Record<string, unknown> } | undefined
    >
    font?: { size: Record<string, unknown>; lineHeight: Record<string, unknown> }
  },
) {
  const size = props.size
  const floor =
    (typeof size === 'string' ? textAreaMinH[size] : undefined) ??
    (size == null || typeof size === 'boolean' ? textAreaMinH['md'] : undefined)
  if (floor === undefined) return
  const fontFamily = props.fontFamily
  const font =
    typeof fontFamily === 'string' ? (env.fonts[fontFamily] ?? env.font) : env.font
  const sizeRecord = font?.size
  const defaultKey = sizeRecord && 'sm' in sizeRecord ? 'sm' : '4'
  const fontSize = props.fontSize ?? defaultKey
  const lineHeight = props.lineHeight ?? font?.lineHeight?.[defaultKey]
  const configuredSize = typeof fontSize === 'string' ? sizeRecord?.[fontSize] : undefined
  const configuredLeading =
    typeof lineHeight === 'string' ? font?.lineHeight?.[lineHeight] : undefined
  const metrics: { fontSize: number; lineHeight?: number } = {
    fontSize: Number.parseFloat(String(getVariableValue(configuredSize ?? fontSize))),
  }
  const leading = configuredLeading ?? lineHeight
  resolveTextMetrics(
    metrics,
    (props.lineHeight == null || configuredLeading !== undefined) &&
      typeof leading === 'number'
      ? `${leading}px`
      : (leading as string),
  )
  const rows = props.rows ?? props.numberOfLines
  const rowsHeight =
    typeof rows === 'number' && typeof metrics.lineHeight === 'number'
      ? rows * metrics.lineHeight
      : undefined
  return { height: rowsHeight === undefined ? floor : Math.max(floor, rowsHeight) }
}

export const TextArea = styled(TamaguiTextArea, {
  name: 'TextArea',
  ...fieldBaseStyle,
  variants: {
    size: getTextAreaSize,
  } as const,
  defaultVariants: {
    size: 'md',
  },
}).resolve(textAreaHeight)
