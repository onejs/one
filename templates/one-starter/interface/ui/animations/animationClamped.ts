import type { TransitionKeys, TransitionProp } from 'tamagui'

// you almost never want opacity or background color to "bounce past" the ends
// when doing spring animations, so this is a nice helper

const springToTime = {
  quickLessBouncy: '300ms',
  quick: '200ms',
  quicker: '100ms',
  quickerLessBouncy: '200ms',
  bouncy: '250ms',
  quickest: '75ms',
  quickestLessBouncy: '75ms',
  superBouncy: '400ms',
  medium: '400ms',
  slow: '500ms',
  slowest: '500ms',
  lazy: '500ms',
  superLazy: '500ms',
} satisfies Partial<Record<TransitionKeys, string>>

export const animationClamped = (
  animation: TransitionKeys,
  opacitySpeed = springToTime[animation] || '75ms',
) =>
  ({
    preset: animation,
    opacity: opacitySpeed,
    backgroundColor: opacitySpeed,
  }) satisfies TransitionProp
