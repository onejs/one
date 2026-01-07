import { router, useParams } from 'one'
import { useId } from 'react'
import { Button, H1, H3, YStack } from 'tamagui'

export default () => {
  const params = useParams()
  return (
    <YStack>
      <H1 id="stable-id">id: {useId()}</H1>
      <H3 id="params">{JSON.stringify(params, null, 2)}</H3>

      <Button
        onPress={() => {
          router.back()
        }}
      >
        Go back
      </Button>

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
