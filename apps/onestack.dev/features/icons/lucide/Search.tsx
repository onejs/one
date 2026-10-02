// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Circle as _Circle, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const Search = themed(
  memo(function Search2(props: IconProps) {
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
          d: 'm21 21-4.34-4.34',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(_Circle, {
          cx: '11',
          cy: '11',
          r: '8',
          stroke: color,
        }),
      ],
    })
  })
)
export { Search }
