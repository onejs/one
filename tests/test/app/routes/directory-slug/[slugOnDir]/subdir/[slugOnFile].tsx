import { useParams } from 'one'
import { Text } from 'react-native'

export async function generateStaticParams() {
  return [
    {
      slugOnDir: 'foo',
      slugOnFile: 'bar',
    },
  ]
}

export default function DirectorySlugTest() {
  const params = useParams()

  return <Text testID="params-json">{JSON.stringify(params)}</Text>
}
