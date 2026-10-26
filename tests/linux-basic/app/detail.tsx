import { router } from 'one'
import { Text } from 'react-native'
import { Action, Page, text } from '../probe/shell'

export default function Detail() {
  return <Page title="Pushed detail">
    <Text style={text}>The GTK header back button returns to the selected tab.</Text>
    <Action title="React Native back" onPress={() => router.back()} />
  </Page>
}
