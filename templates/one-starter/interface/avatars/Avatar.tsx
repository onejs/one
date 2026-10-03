import { Image } from '~/interface/ui/image/Image'
import { useState } from 'react'
import { View, Paragraph, type ColorTokens } from 'tamagui'

interface AvatarProps {
  image?: string | null
  name?: string | null
  size?: number
  testID?: string
}

// deterministic per-name tint from the theme color families.
const BACKGROUNDS: ColorTokens[] = [
  'purple-800',
  'red-800',
  'blue-800',
  'pink-800',
  'green-800',
  'orange-800',
]

function backgroundFromName(name: string): ColorTokens {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return BACKGROUNDS[Math.abs(hash) % BACKGROUNDS.length]
}

export function Avatar({ image, name, size = 36, testID }: AvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const initials = (name || '?').slice(0, 2).toUpperCase()
  const bg = backgroundFromName(name || '?')
  const showImage = !!image && image !== failedImage
  return (
    <View
      width={size}
      height={size}
      rounded={size}
      bg={bg}
      items="center"
      justify="center"
      overflow="hidden"
      data-avatar-image={image || ''}
      testID={testID}
    >
      <Paragraph
        select="none"
        color="white"
        fontWeight="700"
        fontSize={Math.round(size * 0.4)}
        // 1.2x the scaled glyphs; the paragraph size's fixed line height clips
        // large initials on native. px, since tamagui reads a bare number as
        // a ratio.
        lineHeight={`${Math.round(size * 0.48)}px`}
      >
        {initials}
      </Paragraph>
      {showImage ? (
        <Image
          src={image}
          position="absolute"
          t={0}
          l={0}
          width={size}
          height={size}
          objectFit="cover"
          onError={() => setFailedImage(image)}
        />
      ) : null}
    </View>
  )
}
