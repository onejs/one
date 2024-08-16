import { useActiveParams, useLoader } from 'vxs'
import { Text, View } from '@tamagui/core'

export async function generateStaticParams() {
  return [{ fallback: 'one' }, { fallback: 'two' }]
}

export async function loader(props) {
  return {
    hello: `${props.params.fallback}`,
  }
}

export default function Fallback() {
  const params = useActiveParams()
  const data = useLoader(loader)
  return (
    <View bg="red" w={100} h={100}>
      <Text color="white">{JSON.stringify({ data, params }, null, 2)}</Text>
    </View>
  )
}
