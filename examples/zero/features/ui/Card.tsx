import { type GetProps, styled, XStack } from 'tamagui'

export type CardProps = GetProps<typeof Card>

export const Card = styled(XStack, {
  ov: 'hidden',
  minWidth: '100%',
  p: '$4',
  gap: '$4',
  bbw: 1,
  bbc: '$borderColor',
  cur: 'pointer',

  hoverStyle: {
    bg: '$color2',
  },

  pressStyle: {
    bg: '$color2',
  },

  variants: {
    disableLink: {
      true: {
        cur: 'inherit',

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
