// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Ellipse, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const Database = themed(
  memo(function Database2(props: IconProps) {
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
        /* @__PURE__ */ jsx(Ellipse, {
          cx: '12',
          cy: '5',
          rx: '9',
          ry: '3',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M3 5V19A9 3 0 0 0 21 19V5',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M3 12A9 3 0 0 0 21 12',
          stroke: color,
        }),
      ],
    })
  })
)
export { Database }
