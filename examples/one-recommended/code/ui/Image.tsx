import { Image as Image2, type ImageProps, isWeb, View, type ViewProps } from 'tamagui'

type Props = ViewProps & Pick<ImageProps, 'src'>

export function Image({ src, ...props }: Props) {
  return isWeb ? (
    <View select="none" pointerEvents="none" overflow="hidden" {...props}>
      <img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    </View>
  ) : (
    <Image2 {...(props as ImageProps)} src={src} />
  )
}
