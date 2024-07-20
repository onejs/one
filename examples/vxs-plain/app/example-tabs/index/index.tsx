import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { Link, useNavigation } from 'vxs'

export default function HomePage() {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({ title: 'Home' })
  }, [])

  return (
    <>
      <View>
        <Text>Home Tab</Text>
      </View>

      <Link
        href={{
          pathname: './[page_id]',
          params: { page_id: 'some' },
        }}
      >
        <Text>Go to "some" page</Text>
      </Link>
    </>
  )
}
