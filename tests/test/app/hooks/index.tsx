import { Link } from 'one'
import { View, Text } from 'tamagui'

export default function HooksTestingIndexPage() {
  return (
    <View>
      <Link href="/hooks/contents/page-1">
        <Text>Go to page-1</Text>
      </Link>
      <Link href="/hooks/contents/page-2">
        <Text>Go to page-2</Text>
      </Link>
      <Link href="/hooks">
        <Text>Go to index</Text>
      </Link>
    </View>
  )
}
