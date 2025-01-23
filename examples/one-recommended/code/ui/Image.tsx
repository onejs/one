import { Image as Image2, type ImageProps } from '@tamagui/image-next'
import { isWeb, View } from 'tamagui'

export function Image({ src, ...props }: ImageProps) {
  return isWeb ? (
    <View select="none" pointerEvents="none" overflow="hidden" {...props}>
      <img
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
      />
    </View>
  ) : (
    <Image2 {...props} src={src} />
  )
}
