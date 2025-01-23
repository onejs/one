import { styled, XStack } from 'tamagui'

export const Card = styled(XStack, {
  overflow: 'hidden',
  minW: '100%',
  p: '$4',
  gap: '$4',
  borderBottomWidth: 1,
  borderBottomColor: '$borderColor',

  hoverStyle: {
    bg: '$color2',
  },

  pressStyle: {
    bg: '$color2',
  },

  variants: {
    disableLink: {
      true: {
        hoverStyle: {
          bg: 'transparent',
        },

        pressStyle: {
          bg: 'transparent',
        },
      },
    },
  } as const,
})
