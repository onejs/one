import { Paragraph, styled } from 'tamagui'

export const Badge = styled(Paragraph, {
  userSelect: 'none',
  cur: 'default',
  size: '$2',
  px: '$3',
  py: '$2',
  br: '$10',
  lineHeight: '$1',
  variants: {
    variant: {
      red: {
        bg: '$red7',
        color: '$red12',
      },

      blue: {
        bg: '$blue7',
        color: '$blue12',
      },

      green: {
        bg: '$green7',
        color: '$green12',
      },

      purple: {
        bg: '$purple7',
        color: '$purple12',
      },

      pink: {
        bg: '$pink7',
        color: '$pink12',
      },
    },
  } as const,
})
