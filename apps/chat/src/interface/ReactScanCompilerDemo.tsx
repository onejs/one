// disable-compiler
import { useState } from 'react'
import { Button, Circle, SizableText, XStack, YStack } from 'tamagui'

const getItems = () => {
  return new Array(20).fill(0).map(() => (Math.random() > 0.5 ? 'green' : 'red'))
}

export const ReactScanCompilerDemo = () => {
  const [items, setItems] = useState(getItems())

  return (
    <YStack p="$4" gap="$4">
      <Button
        onPress={() => {
          setItems(getItems())
        }}
      >
        Blink
      </Button>

      <XStack>
        <Tree />
        <Tree />
        <Tree />
        <Tree />
      </XStack>

      <XStack gap="$4" flexWrap="wrap">
        {items.map((color, i) => {
          return <Item key={i} color={color} />
        })}
      </XStack>
    </YStack>
  )
}

const Tree = () => {
  return <SizableText size="$12">🎄</SizableText>
}

const Item = ({ color }: { color: string }) => {
  return <Circle size={65} bg={color as any} />
}
