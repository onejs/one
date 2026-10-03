import { styled, YStack } from 'tamagui'

export const PageContainer = styled(YStack, {
  position: 'relative',
  mx: 'auto',
  px: 18,
  width: '100%',
  minW: 320,
  maxW: 'md:920px lg:1120px',
})

export const PageMainContainer = styled(PageContainer, {
  render: 'main',
  role: 'main',
})
