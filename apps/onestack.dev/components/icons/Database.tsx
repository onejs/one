import { memo, type JSX } from 'react'
import { Svg, Ellipse, Path, type SvgProps } from 'react-native-svg'
import { themed, type IconProps } from '@tamagui/helpers-icon'

export const Database: (props: IconProps) => JSX.Element = themed(
  memo(function Database(props: IconProps) {
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
        <Ellipse cx="12" cy="5" rx="9" ry="3" stroke={color} />
        <Path d="M3 5V19A9 3 0 0 0 21 19V5" stroke={color} />
        <Path d="M3 12A9 3 0 0 0 21 12" stroke={color} />
      </Svg>
    )
  })
)
