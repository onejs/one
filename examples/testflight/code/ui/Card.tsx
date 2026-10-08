import { styled, XStack } from 'tamagui'

export const Card = styled(XStack, {
  overflow: 'hidden',
  minWidth: '100%',
  padding: '4',
  gap: '4',
  backgroundColor: 'hover:color2 press:color2',
  borderBottomWidth: 1,
  borderBottomColor: 'borderColor',
  variants: {
    disableLink: {
      true: {
        backgroundColor: 'hover:transparent press:transparent',
      },
    },
  } as const,
})
