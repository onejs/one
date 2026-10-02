import { Svg, Path } from 'react-native-svg'
import { useIconProps } from '~/interface/icons/useIconProps'
import type { IconProps } from '~/interface/icons/types'
export const ArrowUpRightIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)
  return (
    <Svg width={width} height={height} viewBox="0 0 256 256" fill="none" {...svgProps}>
      <Path
        d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"
        fill={fill}
      />
    </Svg>
  )
}
