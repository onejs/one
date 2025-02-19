import { router } from 'one'
import { useId } from 'react'
import { Button, H1, YStack } from 'tamagui'

export default () => {
  return (
    <YStack>
      <H1 id="stable-id">id: {useId()}</H1>

      <Button
        onPress={() => {
          router.navigate(`/segments-stable-ids/a/b`)
        }}
      >
        Go to /a/b
      </Button>

      <Button
        onPress={() => {
          router.navigate(`/segments-stable-ids/a/b/c`)
        }}
      >
        Go to /a/b/c
      </Button>

      <Button
        onPress={() => {
          router.navigate(`/segments-stable-ids/c/d`)
        }}
      >
        Go to /c/d
      </Button>
    </YStack>
  )
}
