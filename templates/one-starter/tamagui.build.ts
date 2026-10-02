import type { TamaguiBuildOptions } from 'tamagui'

export default {
  disable: process.env.NODE_ENV !== 'production',
  components: ['tamagui'],
  config: './src/tamagui/tamagui.config.ts',
  outputCSS: './src/tamagui/tamagui.generated.css',
} satisfies TamaguiBuildOptions
