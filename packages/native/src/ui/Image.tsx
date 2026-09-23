import { Image as RNImage } from 'react-native'
import type { ImageProps } from './Image.native'

export function Image({ source, ...props }: ImageProps) {
  const resolvedSource =
    typeof source === 'number'
      ? source
      : { uri: typeof source === 'string' ? source : source.uri }

  return <RNImage source={resolvedSource} {...props} />
}
