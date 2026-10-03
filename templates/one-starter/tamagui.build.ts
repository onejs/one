import type { TamaguiBuildOptions } from 'tamagui'

export default {
  disable: process.env.NODE_ENV !== 'production',
  components: ['tamagui'],
  config: './tamagui/tamagui.config.ts',
  outputCSS: false,
} satisfies TamaguiBuildOptions
