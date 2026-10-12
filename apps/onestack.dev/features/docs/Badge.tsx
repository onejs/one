import { Paragraph, styled } from 'tamagui'

export const Badge = styled(Paragraph, {
  userSelect: 'none',
  size: '1',
  paddingHorizontal: '2',
  paddingVertical: '1',
  lineHeight: '1',
  cursor: 'default',
  borderRadius: '10',
  variants: {
    variant: {
      red: {
        backgroundColor: 'red7',
        color: 'red11',
      },

      blue: {
        backgroundColor: 'blue7',
        color: 'blue11',
      },

      green: {
        backgroundColor: 'green7',
        color: 'green11',
      },

      purple: {
        backgroundColor: 'purple7',
        color: 'purple11',
      },

      pink: {
        backgroundColor: 'gray3',
        color: 'yellow11',
      },

      orange: {
        backgroundColor: 'orange7',
        color: 'orange11',
      },
    },
  } as const,
})
