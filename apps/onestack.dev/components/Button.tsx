import { getTokenValue, styled, XStack, type SizeTokens } from 'tamagui'

export const Button = styled(XStack, {
  cursor: 'pointer',
  render: 'a',
  className: 'text-underline-none',
  backgroundColor: 'color2 hover:color3 press:color1',
  variants: {
    size: styled.dynamic<SizeTokens>((size = '4') => {
      const sizeVal = +getTokenValue(size as any, 'size') / 3

      return {
        paddingHorizontal: sizeVal,
        paddingVertical: sizeVal * 1.5,
      }
    }),
  },
})
