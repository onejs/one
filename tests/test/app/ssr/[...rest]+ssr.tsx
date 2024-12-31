import { useParams } from 'one'
import { Text } from 'tamagui'

export default () => {
  const params = useParams<Record<string, string>>()
  return <Text id="test">{JSON.stringify(params)}</Text>
}
