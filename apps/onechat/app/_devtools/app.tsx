import { Button, YStack } from 'tamagui'
import { mutate, resolve, zero } from '~/features/state/zero'

// const globalState = proxy({
//   activeTable: '',
//   schema: schema as Schema,
// })

// const useState = () => useSnapshot(globalState)

export default () => {
  return (
    <YStack f={1}>
      <Button
        onPress={async () => {
          const friendships = await resolve(zero.query.friendship)
          for (const friendship of friendships) {
            await mutate.friendship.update({
              ...friendship,
              accepted: true,
            })
          }
          alert('done')
        }}
      >
        All Friendships: Accept
      </Button>
    </YStack>
  )
}
