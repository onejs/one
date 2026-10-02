import { createSystemFont, fonts as baseFonts } from '@tamagui/config/v6-base'
const mono = createSystemFont({
  sizeLineHeight: (size) => (size >= 16 ? size * 1.2 + 8 : size * 1.15 + 5),
  font: {
    family: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
    weight: {
      0: '400',
    },
  },
})
export const fonts = {
  ...baseFonts,
  mono,
}
