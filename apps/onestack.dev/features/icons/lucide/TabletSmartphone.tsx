// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Path, Rect } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const TabletSmartphone = themed(
  memo(function TabletSmartphone2(props: IconProps) {
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
        /* @__PURE__ */ jsx(Rect, {
          width: '10',
          height: '14',
          x: '3',
          y: '8',
          rx: '2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M5 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-2.4',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M8 18h.01',
          stroke: color,
        }),
      ],
    })
  })
)
export { TabletSmartphone }
