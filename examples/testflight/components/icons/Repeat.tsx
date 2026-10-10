import { memo, type JSX } from 'react'
import { Svg, Path, type SvgProps } from 'react-native-svg'
import { themed, type IconProps } from '@tamagui/helpers-icon'

export const Repeat: (props: IconProps) => JSX.Element = themed(
  memo(function Repeat(props: IconProps) {
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
        <Path d="m17 2 4 4-4 4" stroke={color} />
        <Path d="M3 11v-1a4 4 0 0 1 4-4h14" stroke={color} />
        <Path d="m7 22-4-4 4-4" stroke={color} />
        <Path d="M21 13v1a4 4 0 0 1-4 4H3" stroke={color} />
      </Svg>
    )
  })
)
