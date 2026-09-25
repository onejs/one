// the published module build resolves nitrogen from lib/module instead of the package root.
// use the shipped source entry so vite and metro resolve the generated view config.
import { NitroImage } from 'react-native-nitro-image/src/NitroImage'
import type { ImageProps as RNImageProps } from 'react-native'

export type ImageProps = Omit<RNImageProps, 'source' | 'resizeMode'> & {
  source: string | number | { uri: string }
  resizeMode?: 'cover' | 'contain' | 'center' | 'stretch'
  recyclingKey?: string
}

export function Image({ source, ...props }: ImageProps) {
  const image =
    typeof source === 'number'
      ? source
      : { url: typeof source === 'string' ? source : source.uri }

  return <NitroImage image={image} {...props} />
}
