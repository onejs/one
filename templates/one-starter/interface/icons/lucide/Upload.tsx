import { useIconProps } from '~/interface/ui/icons/useIconProps'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import type { IconProps } from '~/interface/ui/icons/types'

export const Upload = memo((props: IconProps) => {
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
      <Path d="M12 3v12" />
      <Path d="m17 8-5-5-5 5" />
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </Svg>
  )
})
