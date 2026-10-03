import { getURL, One } from 'one'
import { createImage, type GetProps } from 'tamagui'

const NativeImage = createImage({ Component: One.UI.Image })

// a root-relative src (`/media/...`, the seed's own files) names a file the
// app server serves. native has no document origin to resolve it against, so
// it resolves against the server here, once, for every image.
export function Image({ src, ...props }: GetProps<typeof NativeImage>) {
  return (
    <NativeImage
      src={typeof src === 'string' && src.startsWith('/') ? `${getURL()}${src}` : src}
      {...props}
    />
  )
}
