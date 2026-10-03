import { YStack } from 'tamagui'

// a component's composited device captures, made by tests/native-features/scripts/docs-composite.ts.
export function NativeHero({ src, alt }: { src: string; alt: string }) {
  return (
    <YStack
      mt="$4"
      mb="$6"
      br="$6"
      ov="hidden"
      borderWidth={0.5}
      borderColor="$borderColor"
      mx="$-4"
      $sm={{ mx: 0, br: '$4' }}
    >
      <img
        src={src}
        alt={alt}
        style={{ display: 'block', width: '100%', aspectRatio: '16 / 10' }}
      />
    </YStack>
  )
}
