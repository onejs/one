import { createAnimations } from '@tamagui/animations-css'

// use CSS animations for web (SSR compatible)
export const animations = createAnimations({
  '75ms': 'ease-out 75ms',
  '100ms': 'ease-out 100ms',
  '200ms': 'ease-out 200ms',
  superBouncy: 'ease-in-out 300ms',
  bouncy: 'ease-in-out 250ms',
  kindaBouncy: 'ease-in-out 200ms',
  superLazy: 'ease-out 500ms',
  lazy: 'ease-out 400ms',
  medium: 'ease-out 200ms',
  slowest: 'ease-out 600ms',
  slow: 'ease-out 300ms',
  quick: 'ease-out 100ms',
  tooltip: 'ease-in-out 150ms',
  quicker: 'ease-out 80ms',
  quickest: 'ease-out 50ms',
})
