import { YStack } from 'tamagui'

// a component's composited device captures, made by tests/native-features/scripts/docs-composite.ts.
export function NativeHero({ src, alt }: { src: string; alt: string }) {
  return (
    <YStack
      marginTop="4"
      marginBottom="6"
      borderWidth={0.5}
      borderColor="borderColor"
      marginHorizontal="-4 sm:0px"
      borderRadius="6 sm:4"
      overflow="hidden"
    >
      <img
        src={src}
        alt={alt}
        style={{ display: 'block', width: '100%', aspectRatio: '16 / 10' }}
      />
    </YStack>
  )
}
