import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { Link, useLocalSearchParams, useNavigation } from 'vxs'

export default function Page() {
  const navigation = useNavigation()
  const params = useLocalSearchParams()

  useEffect(() => {
    navigation.setOptions({ title: `Page ${params?.page_id}` })
  }, [navigation, params?.page_id, params.user])

  return (
    <View>
      <Text>Page: {params?.page_id}</Text>

      <Link href="..">Go back</Link>

      <Link
        href={{
          pathname: './[page_id]',
          params: { page_id: 'other' },
        }}
      >
        Go to "other" page
      </Link>
    </View>
  )
}
