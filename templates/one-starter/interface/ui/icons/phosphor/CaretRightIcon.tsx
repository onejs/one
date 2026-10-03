import { memo } from 'react'
import { Path, Svg } from 'react-native-svg'
import { useIconProps } from '../useIconProps'
import type { IconProps } from '../types'

export const CaretRightIcon = memo((props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)

  return (
    <Svg width={width} height={height} viewBox="0 0 256 256" fill="none" {...svgProps}>
      <Path
        d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"
        fill={fill}
      />
    </Svg>
  )
})
