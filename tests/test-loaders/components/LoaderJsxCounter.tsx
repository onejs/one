'use client'

import { useState } from 'react'
import { Button, Text } from 'tamagui'

export function Counter({ label, start }: { label: string; start: number }) {
  const [count, setCount] = useState(start)

  return (
    <Button id={`jsx-counter-${label}`} onPress={() => setCount((c) => c + 1)}>
      <Text id={`jsx-count-${label}`}>
        {label}:{count}
      </Text>
    </Button>
  )
}
