import { Svg, Path } from 'react-native-svg'
import { useIconProps } from '~/interface/icons/useIconProps'
import type { IconProps } from '~/interface/icons/types'
export const PasswordIcon = (props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)
  return (
    <Svg w={width} h={height} viewBox="0 0 256 256" fill="none" {...svgProps}>
      <Path
        d="M48,56V200a12,12,0,0,1-24,0V56a12,12,0,0,1,24,0Zm86.73,50.7L120,111.48V96a12,12,0,0,0-24,0v15.48L81.27,106.7a12,12,0,1,0-7.41,22.82l14.72,4.79-9.1,12.52A12,12,0,1,0,98.9,160.94l9.1-12.52,9.1,12.52a12,12,0,1,0,19.42-14.11l-9.1-12.52,14.72-4.79a12,12,0,1,0-7.41-22.82Zm115.12,7.7a12,12,0,0,0-15.12-7.7L220,111.48V96a12,12,0,0,0-24,0v15.48l-14.73-4.78a12,12,0,1,0-7.41,22.82l14.72,4.79-9.1,12.52a12,12,0,1,0,19.42,14.11l9.1-12.52,9.1,12.52a12,12,0,1,0,19.42-14.11l-9.1-12.52,14.72-4.79A12,12,0,0,0,249.85,114.4Z"
        fill={fill}
      />
    </Svg>
  )
}
