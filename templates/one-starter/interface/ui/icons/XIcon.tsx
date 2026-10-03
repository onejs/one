import { memo } from 'react'
import { Path, Svg } from 'react-native-svg'
import { useIconProps } from './useIconProps'
import type { IconProps } from './types'

// the bare close glyph: two strokes on the 24 grid, the same geometry the
// template's lucide X draws, so the package default close and the app close
// are the same mark. stroke-based, unlike the fill-based phosphor set, which
// is why it sits beside that directory instead of in it.
export const XIcon = memo((props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fill}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...svgProps}
    >
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </Svg>
  )
})
