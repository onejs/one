// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx } from 'react/jsx-runtime'
const Moon = themed(
  memo(function Moon2(props: IconProps) {
    const { color = 'black', size = 24, ...otherProps } = props
    return /* @__PURE__ */ jsx(Svg, {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ...otherProps,
      children: /* @__PURE__ */ jsx(Path, {
        d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
        stroke: color,
      }),
    })
  })
)
export { Moon }
