import { Image as TamaguiImage, styled, type GetProps } from 'tamagui'

// tamagui's Image already accepts BOTH a string url and a `{ uri }` object as
// `src` and normalizes them internally (see tamagui's createImage), so a
// bundled asset import works whether the bundler resolves it to `{ uri }` (dev
// (`src={heroImage}`), never `heroImage.uri` (undefined in prod).
const StyledImage = styled(TamaguiImage, {
  select: 'none',
})

type StyledImageProps = GetProps<typeof StyledImage>

export type ImageProps = Omit<StyledImageProps, 'accessibilityLabel'> & {
  accessibilityLabel?: string
}

export function Image({ accessibilityLabel, ...props }: ImageProps) {
  const ariaLabel = props['aria-label'] ?? accessibilityLabel
  return <StyledImage {...props} aria-label={ariaLabel} />
}
