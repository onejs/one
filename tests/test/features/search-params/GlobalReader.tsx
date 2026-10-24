import { Pressable, Text, View } from 'react-native'
import { useActiveParams, usePathname, useSearchParams } from 'one'
import { z } from 'zod'

// loose, so the output lists every key the schema received
export const globalParams = z.looseObject({
  page: z.coerce.number().int().min(1).catch(1),
})

// reads the active route's query from a layout, which does not own the child's path params
export function GlobalReader({ id }: { id: string }) {
  const [{ page, ...received }, update] = useSearchParams(globalParams, { global: true })
  const active = useActiveParams()

  return (
    <View testID={`${id}-global`}>
      <Text testID={`${id}-pathname`}>{usePathname()}</Text>
      <Text testID={`${id}-page`}>page {page}</Text>
      <Text testID={`${id}-received`}>received {JSON.stringify(Object.keys(received))}</Text>
      <Text testID={`${id}-active`}>active {JSON.stringify(active)}</Text>
      <Pressable testID={`${id}-next`} onPress={() => update({ page: page + 1 })}>
        <Text>next (global)</Text>
      </Pressable>
    </View>
  )
}
