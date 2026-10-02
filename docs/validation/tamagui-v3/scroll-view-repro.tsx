import { Paragraph, ScrollView, View, XStack, YStack } from 'tamagui'

// render with the site's unchanged fonts and tokens, then compare v2 and v3.
export function HorizontalScrollViewRepro() {
  return (
    <View width={338}>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}>
        <YStack flex={1}>
          <XStack px={7}>
            <XStack width="30%" minWidth={130} padding={10} gap={13} overflow="hidden">
              <View width={12} />
              <Paragraph fontFamily="mono" size="1" flex={1} overflow="hidden">
                _layout.tsx
              </Paragraph>
            </XStack>
            <YStack padding={10}>
              <Paragraph size="4">Wraps all files in this directory and below</Paragraph>
            </YStack>
          </XStack>
        </YStack>
      </ScrollView>
    </View>
  )
}
