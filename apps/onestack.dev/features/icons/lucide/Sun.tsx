// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Circle as _Circle, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const Sun = themed(
  memo(function Sun2(props: IconProps) {
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
        /* @__PURE__ */ jsx(_Circle, {
          cx: '12',
          cy: '12',
          r: '4',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M12 2v2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M12 20v2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'm4.93 4.93 1.41 1.41',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'm17.66 17.66 1.41 1.41',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M2 12h2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M20 12h2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'm6.34 17.66-1.41 1.41',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'm19.07 4.93-1.41 1.41',
          stroke: color,
        }),
      ],
    })
  })
)
export { Sun }
