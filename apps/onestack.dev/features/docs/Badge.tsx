import { Paragraph, styled } from 'tamagui'

export const Badge = styled(Paragraph, {
  userSelect: 'none',
  cur: 'default',
  size: '$1',
  px: '$2.5',
  py: '$1.5',
  br: '$10',
  lineHeight: '$1',
  variants: {
    variant: {
      red: {
        bg: '$red7',
        color: '$red9',
      },

      blue: {
        bg: '$blue7',
        color: '$blue9',
      },

      green: {
        bg: '$green7',
        color: '$green9',
      },

      purple: {
        bg: '$purple7',
        color: '$purple9',
      },

      pink: {
        bg: '$gray3',
        color: '$yellow11',
      },
    },
  } as const,
})
