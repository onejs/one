import { useGlobalSearchParams, useLoader } from '@vxrn/vxs/types'
import { Text, View } from 'tamagui'

export async function generateStaticParams() {
  return [{ user: 'one' }, { user: 'two' }]
}

export async function loader({ params }) {
  return {
    hello: `${params.user}`,
  }
}

export default function Test() {
  const params = useGlobalSearchParams()
  const data = useLoader(loader)
  return (
    <View bg="red" w={100} h={100}>
      <Text color="white">{JSON.stringify(data)}</Text>
    </View>
  )
}
