import { useIconProps } from '~/interface/ui/icons/useIconProps'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import type { IconProps } from '~/interface/ui/icons/types'

export const Home = memo((props: IconProps) => {
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
      <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <Path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  )
})
