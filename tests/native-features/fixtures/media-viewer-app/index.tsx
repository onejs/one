import { Link, One } from 'one'
import { View } from 'react-native'

export default function Home() {
  return <View style={{ padding: 40 }}>
    <One.iOS.QuickLook isPresented={false} onIsPresentedChange={() => {}} />
    <Link href="/one-native-media-viewer" testID="nav-one-native-media-viewer">Media viewer</Link>
  </View>
}
