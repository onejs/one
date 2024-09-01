import { styled, XStack } from 'tamagui'

export const Card = styled(XStack, {
  f: 1,
  ov: 'hidden',
  p: '$4',
  gap: '$5',
  bbw: 1,
  bbc: '$borderColor',

  hoverStyle: {
    bg: '$color2',
  },
})
