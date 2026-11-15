import { Text, View } from 'react-native'
import { useParams } from 'one'

export function generateStaticParams() {
  return [{ slug: 'intro' }, { slug: 'guide/setup' }]
}

export default function SearchParamsDocs() {
  const { slug } = useParams<{ slug: string[] }>()
  return (
    <View testID="docs-page">
      <Text testID="docs-slug">docs {JSON.stringify(slug)}</Text>
    </View>
  )
}
