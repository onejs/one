import MaskedView from '@react-native-masked-view/masked-view'
import WebView from 'react-native-webview'
import { View } from 'react-native'

export async function loader() {
  return {
    hello: 'world',
  }
}

export default function HomePage() {
  console.info('MaskedView', MaskedView)
  console.info('WebView', WebView)

  return (
    <>
      <View />
    </>
  )
}
