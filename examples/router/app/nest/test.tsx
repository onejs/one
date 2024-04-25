import { useGlobalSearchParams, useLoader } from '@vxrn/router'
import { View } from 'tamagui'

export async function generateStaticParams() {
  return [{ user: 'one' }, { user: 'two' }]
}

export async function loader({ params }) {
  return {
    hello: `${params.user}`,
  }
}

export default function Test(props) {
  const params = useGlobalSearchParams()
  const data = useLoader(loader)
  console.log('data2', data, params)
  return <View bg="red" w={100} h={100} />
}
