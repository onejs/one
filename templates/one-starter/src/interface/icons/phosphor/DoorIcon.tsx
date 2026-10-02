import { Svg, Path } from 'react-native-svg'
import { useIconProps } from '~/interface/icons/useIconProps'
import type { IconProps } from '~/interface/icons/types'
export const DoorIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)
  return (
    <Svg w={width} h={height} viewBox="0 0 256 256" fill="none" {...svgProps}>
      <Path
        d="M232,212H212V40a20,20,0,0,0-20-20H64A20,20,0,0,0,44,40V212H24a12,12,0,0,0,0,24H232a12,12,0,0,0,0-24ZM68,44H188V212H68Zm104,88a16,16,0,1,1-16-16A16,16,0,0,1,172,132Z"
        fill={fill}
      />
    </Svg>
  )
}
