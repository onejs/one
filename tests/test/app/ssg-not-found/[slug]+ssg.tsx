import { useParams } from 'one'
import { Text, View } from 'tamagui'

// only generate pages for these specific slugs
export async function generateStaticParams() {
  return [{ slug: 'valid-page' }, { slug: 'another-valid' }]
}

export default function SsgPage() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <View testID="ssg-page">
      <Text testID="ssg-slug">SSG Page: {slug}</Text>
    </View>
  )
}
