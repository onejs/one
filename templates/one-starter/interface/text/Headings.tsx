import { Separator, SizableText, XStack, styled, type FontSizeTokens } from 'tamagui'
import type { ReactNode } from 'react'

export const H1 = styled(SizableText, {
  render: 'h1',
  role: 'heading',
  size: '10',
  fontWeight: '800',
})

export const H2 = styled(SizableText, {
  render: 'h2',
  role: 'heading',
  size: '9',
  fontWeight: '800',
})

export const H3 = styled(SizableText, {
  render: 'h3',
  role: 'heading',
  size: '7',
  fontWeight: '700',
})

export const SepHeading = ({
  children,
  size = '3',
}: {
  children: ReactNode
  size?: FontSizeTokens
}) => (
  <XStack ml={18} my={13} items="center" gap={18}>
    <SizableText size={size} color="color-10" fontWeight="700">
      {children}
    </SizableText>
    <Separator opacity={0.5} />
  </XStack>
)
