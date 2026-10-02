// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx, jsxs } from 'react/jsx-runtime'
const FileStack = themed(
  memo(function FileStack2(props: IconProps) {
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
          d: 'M21 7h-3a2 2 0 0 1-2-2V2',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15',
          stroke: color,
        }),
        /* @__PURE__ */ jsx(Path, {
          d: 'M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11',
          stroke: color,
        }),
      ],
    })
  })
)
export { FileStack }
