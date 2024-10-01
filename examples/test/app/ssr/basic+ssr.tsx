import { Text, View } from 'tamagui'
import { useLoader } from 'one'

let loadCount = 0

export const loader = async () => {
  loadCount++

  return {
    date: Date.now(),
    loadCount,
  }
}

export default function BasicSSR() {
  const data = useLoader(loader)

  return (
    <View>
      <Text>
        {data.loadCount} - {data.date}
      </Text>
    </View>
  )
}
