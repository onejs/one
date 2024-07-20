import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { useNavigation } from 'vxs'

export default function HomePage() {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({ title: 'Settings' })
  }, [])

  return (
    <>
      <View>
        <Text>Hi from settings</Text>
      </View>
    </>
  )
}
