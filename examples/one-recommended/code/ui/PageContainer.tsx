import { styled, View } from 'tamagui'

export const PageContainer = styled(View, {
  width: '100%',
  maxW: 600,
  mx: 'auto',
  bg: '$color1',

  '$platform-web': {
    py: '$4',
  },
})
