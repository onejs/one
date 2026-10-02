// generated lucide geometry frozen from the v2 site for pixel parity
import type { IconProps } from '@tamagui/helpers-icon'
import { memo } from 'react'
import { Svg, Path } from 'react-native-svg'
import { themed } from '@tamagui/helpers-icon'
import { jsx } from 'react/jsx-runtime'
const Folder = themed(
  memo(function Folder2(props: IconProps) {
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
        d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
        stroke: color,
      }),
    })
  })
)
export { Folder }
