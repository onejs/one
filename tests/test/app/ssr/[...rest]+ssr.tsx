import { useParams } from 'one'
import { Text, View } from 'tamagui'

export default function ParamsSSR() {
  return (
    <View
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      gap={16}
    >
      <Text>Params SSR</Text>
      <Text id="params">{JSON.stringify(useParams())}</Text>
    </View>
  )
}
