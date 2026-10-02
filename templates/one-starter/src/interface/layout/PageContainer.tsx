import { styled, YStack } from 'tamagui'
export const PageContainer = styled(YStack, {
  position: 'relative',
  mx: 'auto',
  flex: 1,
  flexBasis: 'auto',
  px: '4',
  w: '100%',
  minW: 380,
  maxW: {
    md: 760,
    lg: 860,
    xl: 1140,
  },
})
export const PageMainContainer = styled(PageContainer, {
  render: 'main',
  role: 'main',
})
