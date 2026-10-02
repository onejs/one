import { styled, View } from 'tamagui'
export const Pressable = styled(View, {
  hitSlop: 10,
  opacity: {
    press: 0.5,
  },
})
