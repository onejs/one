import { useParams } from 'one'
import { Text } from 'react-native'

export default () => {
  const params = useParams<{ id: string }>()
  return <Text>hello from ssr {params.id}</Text>
}
