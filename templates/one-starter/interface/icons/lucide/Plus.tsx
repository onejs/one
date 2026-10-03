import { useIconProps } from '~/interface/ui/icons/useIconProps'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import type { IconProps } from '~/interface/ui/icons/types'

export const Plus = memo((props: IconProps) => {
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
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </Svg>
  )
})
