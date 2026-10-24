import { Pressable, Text, View } from 'react-native'
import { useParams, usePathname, useSearchParams } from 'one'
import { z } from 'zod'
import { GlobalReader } from './GlobalReader'

export const tabOneParams = z.object({ a: z.coerce.number().int().catch(0) })
export const tabTwoParams = z.object({ b: z.coerce.number().int().catch(0) })
export const tabThreeParams = z.object({ c: z.coerce.number().int().catch(0) })

function Panel({
  id,
  value,
  onNext,
}: {
  id: string
  value: number
  onNext: () => void
}) {
  const params = useParams<{ id?: string }>()
  const itemId = params.id
  return (
    <View testID={`${id}-panel`}>
      <Text testID={`${id}-pathname`}>{usePathname()}</Text>
      <Text testID={`${id}-params`}>params {JSON.stringify(params)}</Text>
      <Text testID={`${id}-item`}>item {itemId ?? 'none'}</Text>
      <Text testID={`${id}-value`}>value {value}</Text>
      <Pressable testID={`${id}-next`} onPress={onNext}>
        <Text>next</Text>
      </Pressable>
    </View>
  )
}

// each tab stays mounted while another tab is focused, and writes only its own query
export function TabOne() {
  const [{ a }, update] = useSearchParams(tabOneParams)
  return (
    <>
      <Panel id="tab-one" value={a} onNext={() => update({ a: a + 1 })} />
      <GlobalReader id="tab-one-global" />
    </>
  )
}

export function TabTwo() {
  const [{ b }, update] = useSearchParams(tabTwoParams)
  return <Panel id="tab-two" value={b} onNext={() => update({ b: b + 1 })} />
}

export function TabThree() {
  const [{ c }, update] = useSearchParams(tabThreeParams)
  return <Panel id="tab-three" value={c} onNext={() => update({ c: c + 1 })} />
}
