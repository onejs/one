import { H1, Paragraph, View, YStack } from 'tamagui'

export default function HomePage() {
  return (
    <YStack p="$4" gap="$4">
      <H1 p="$2" px="$3" bg="$color12" color="$color1" size="$1" ff="$heading" ls={5}>
        start.chat
      </H1>

      <Paragraph whiteSpace="pre" size="$4" ff="$mono">
        {`Hey!
        
Welcome to start.chat!`}
        <View dsp="inline-flex" w={16} h={20} y={2} x={10} bg="$color12" />
      </Paragraph>
    </YStack>
  )
}
