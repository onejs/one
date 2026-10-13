import type { TamaguiBuildOptions } from 'tamagui'

// read by both the vite plugin and the tamagui cli (`tamagui check`)
export default {
  useReactNativeWebLite: true,
  components: ['tamagui'],
  config: './config/tamagui.config.ts',
  outputCSS: './app/tamagui.css',
} satisfies TamaguiBuildOptions
