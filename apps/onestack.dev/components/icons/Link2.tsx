import { memo, type JSX } from 'react'
import { Svg, Line, Path, type SvgProps } from 'react-native-svg'
import { themed, type IconProps } from '@tamagui/helpers-icon'

export const Link2: (props: IconProps) => JSX.Element = themed(
  memo(function Link2(props: IconProps) {
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
        <Path d="M9 17H7A5 5 0 0 1 7 7h2" stroke={color} />
        <Path d="M15 7h2a5 5 0 1 1 0 10h-2" stroke={color} />
        <Line x1="8" x2="16" y1="12" y2="12" stroke={color} />
      </Svg>
    )
  })
)
