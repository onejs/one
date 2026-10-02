import { Svg, Path } from 'react-native-svg'
import { useIconProps } from '~/interface/icons/useIconProps'
import type { IconProps } from '~/interface/icons/types'
export const CaretLeftIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)
  return (
    <Svg width={width} height={height} viewBox="0 0 256 256" fill="none" {...svgProps}>
      <Path
        d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"
        fill={fill}
      />
    </Svg>
  )
}
