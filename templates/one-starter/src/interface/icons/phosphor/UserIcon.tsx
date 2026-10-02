import { Svg, Path } from 'react-native-svg'
import { useIconProps } from '~/interface/icons/useIconProps'
import type { IconProps } from '~/interface/icons/types'
export const UserIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)
  return (
    <Svg width={width} height={height} viewBox="0 0 256 256" fill="none" {...svgProps}>
      <Path
        d="M234.38,210a123.36,123.36,0,0,0-60.78-53.23,76,76,0,1,0-91.2,0A123.36,123.36,0,0,0,21.62,210a12,12,0,1,0,20.77,12c18.12-31.32,50.12-50,85.61-50s67.49,18.69,85.61,50a12,12,0,0,0,20.77-12ZM76,96a52,52,0,1,1,52,52A52.06,52.06,0,0,1,76,96Z"
        fill={fill}
      />
    </Svg>
  )
}
