import { Slot, useParams } from 'one'
import { Text } from 'tamagui'

export default function LayoutWithParam() {
  const params = useParams()

  return (
    <>
      <Text testID="layout-params-json">{JSON.stringify(params)}</Text>
      <Slot />
    </>
  )
}
