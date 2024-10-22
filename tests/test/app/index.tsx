import { Link } from 'one'
import { Text, View } from 'react-native'

export default () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Welcome to VXS</Text>
    <Link href="/sub-page/sub">Go to sub</Link>
  </View>
)
