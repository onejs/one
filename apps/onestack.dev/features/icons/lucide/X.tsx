// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const X = themed(
  memo(function X2(props: IconProps) {
    const { color = 'black', size = 24, ...otherProps } = props
    return /* @__PURE__ */ jsxs(Svg, {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ...otherProps,
      children: [
        /* @__PURE__ */ jsx(Path, {
          d: 'M18 6 6 18',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'm6 6 12 12',
          stroke: color,
        }),
      ],
    })
  })
)
export { X }
