// the tamagui animation driver an app's createTamagui config takes: css on
// web; animationsRoot.native.ts is the reanimated driver.
import { createAnimations } from '@tamagui/animations-css/extras'
import { animationsCSS } from '@tamagui/config/animations-css'

export const animationsRoot = createAnimations({
  ...animationsCSS.animations,
})
