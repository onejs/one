import { styled, XStack } from 'tamagui'

export const Card = styled(XStack, {
  ov: 'hidden',
  minWidth: '100%',
  p: '$4',
  gap: '$5',
  bbw: 1,
  bbc: '$borderColor',

  hoverStyle: {
    bg: '$color2',
  },

  pressStyle: {
    bg: '$color2',
  },
})
