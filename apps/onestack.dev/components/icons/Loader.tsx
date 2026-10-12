import { memo, type JSX } from 'react'
import { Svg, Path, type SvgProps } from 'react-native-svg'
import { themed, type IconProps } from '@tamagui/helpers-icon'

export const Loader: (props: IconProps) => JSX.Element = themed(
  memo(function Loader(props: IconProps) {
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
        <Path d="M12 2v4" stroke={color} />
        <Path d="m16.2 7.8 2.9-2.9" stroke={color} />
        <Path d="M18 12h4" stroke={color} />
        <Path d="m16.2 16.2 2.9 2.9" stroke={color} />
        <Path d="M12 18v4" stroke={color} />
        <Path d="m4.9 19.1 2.9-2.9" stroke={color} />
        <Path d="M2 12h4" stroke={color} />
        <Path d="m4.9 4.9 2.9 2.9" stroke={color} />
      </Svg>
    )
  })
)
