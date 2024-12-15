import type { TableSchema } from '@rocicorp/zero'
import { Button, H4, ScrollView, XStack, YStack } from 'tamagui'
import { type Schema, schema } from '~/config/zero/schema'
import { mutate, resolve, useQuery, zero } from '~/features/state/zero'
import { proxy, useSnapshot } from 'valtio'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { Table } from '~/interface/devtools/Table'

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
