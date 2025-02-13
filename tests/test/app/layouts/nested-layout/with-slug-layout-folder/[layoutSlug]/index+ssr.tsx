import { Link, useParams, usePathname } from 'one'
import { View, Text } from 'tamagui'

export default function HooksTestingPage() {
  const params = useParams()

  return (
    <View>
      <Text testID="page-params-json">{JSON.stringify(params)}</Text>
    </View>
  )
}
