import { Image as Image2, type ImageProps } from '@tamagui/image-next'
import { isWeb, styled, View } from 'tamagui'

const WebImage = styled(View, {
  name: 'Image',
  tag: 'img',
})

export function Image(props: ImageProps) {
  return isWeb ? <WebImage {...props} /> : <Image2 {...props} />
}
