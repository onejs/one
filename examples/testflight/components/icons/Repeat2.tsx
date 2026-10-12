import { memo, type JSX } from 'react'
import { Svg, Path, type SvgProps } from 'react-native-svg'
import { themed, type IconProps } from '@tamagui/helpers-icon'

export const Repeat2: (props: IconProps) => JSX.Element = themed(
  memo(function Repeat2(props: IconProps) {
    const {
      color = 'black',
      size = 24,
      ...otherProps
    } = props as SvgProps & {
      color?: string
      size?: number
    }
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...otherProps}
      >
        <Path d="m2 9 3-3 3 3" stroke={color} />
        <Path d="M13 18H7a2 2 0 0 1-2-2V6" stroke={color} />
        <Path d="m22 15-3 3-3-3" stroke={color} />
        <Path d="M11 6h6a2 2 0 0 1 2 2v10" stroke={color} />
      </Svg>
    )
  })
)
