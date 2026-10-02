// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Line, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const Link2 = themed(
  memo(function Link22(props: IconProps) {
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
          d: 'M9 17H7A5 5 0 0 1 7 7h2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M15 7h2a5 5 0 1 1 0 10h-2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Line, {
          x1: '8',
          x2: '16',
          y1: '12',
          y2: '12',
          stroke: color,
        }),
      ],
    })
  })
)
export { Link2 }
