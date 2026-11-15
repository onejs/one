import { Text } from 'react-native'
import { router } from 'one'
import { Page, text, Action } from '../../probe/shell'

export default function Places() {
  return <Page title="Places"><Text style={text}>Sidebar selection uses the same One Tabs router.</Text><Action title="Back" onPress={() => router.back()} /></Page>
}
