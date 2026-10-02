// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const Menu = themed(
  memo(function Menu2(props: IconProps) {
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
          d: 'M4 12h16',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M4 18h16',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M4 6h16',
          stroke: color,
        }),
      ],
    })
  })
)
export { Menu }
