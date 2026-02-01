import { useEffect, useState } from 'react'
import { H1, Paragraph, YStack } from 'tamagui'

export default function NotFound() {
  const [step, setStep] = useState(0)
  const balls = 16

  useEffect(() => {
    const tm = setInterval(() => {
      setStep((prev) => (prev + 1) % balls)
    }, 80)
    return () => clearInterval(tm)
  }, [])

  return (
    <YStack flex={1} ai="center" jc="center" gap="$6" py="$10">
      <YStack pos="relative" w={200} h={200}>
        {new Array(balls).fill(0).map((_, index) => (
          <img
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 200,
              height: 200,
              opacity: step === index ? 1 : 0,
            }}
            src={`/ball-${index + 1}.svg`}
            alt="One Logo"
          />
        ))}
      </YStack>

      <YStack ai="center" gap="$3">
        <H1>404</H1>
        <Paragraph size="$5" color="$color10">
          page not found
        </Paragraph>
      </YStack>
    </YStack>
  )
}
