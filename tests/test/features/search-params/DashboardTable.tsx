import { useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSearchParams } from 'one'
import { z } from 'zod'

const listOf = z.union([z.string().transform((value) => [value]), z.array(z.string())])

export const tableParams = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  tags: listOf.catch([]),
})

export function DashboardTable() {
  const [{ page, tags }, update] = useSearchParams(tableParams)
  const mountId = useRef(Math.random().toString(36).slice(2)).current

  return (
    <View testID="table">
      <Text testID="table-mount">{mountId}</Text>
      <Text testID="table-page">page {page}</Text>
      <Text testID="table-tags">tags {JSON.stringify(tags)}</Text>
      <Pressable testID="table-next" onPress={() => update({ page: page + 1 })}>
        <Text>next (push)</Text>
      </Pressable>
      <Pressable testID="table-next-replace" onPress={() => update({ page: page + 1 }, { replace: true })}>
        <Text>next (replace)</Text>
      </Pressable>
      <Pressable testID="table-tags-set" onPress={() => update({ tags: ['a', 'b c'] })}>
        <Text>tags a, b c</Text>
      </Pressable>
      <Pressable testID="table-reset" onPress={() => update({ page: null, tags: undefined })}>
        <Text>reset</Text>
      </Pressable>
    </View>
  )
}
