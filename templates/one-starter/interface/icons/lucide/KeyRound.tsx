import { useIconProps } from '~/interface/ui/icons/useIconProps'
import { memo } from 'react'
import { Svg, Circle, Path } from 'react-native-svg'
import type { IconProps } from '~/interface/ui/icons/types'

export const KeyRound = memo((props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fill}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...svgProps}
    >
      <Path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
      <Circle cx="16.5" cy="7.5" r=".5" fill={fill} />
    </Svg>
  )
})
