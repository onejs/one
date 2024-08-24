import MaskedView from '@react-native-masked-view/masked-view'
import WebView from 'react-native-webview'
import * as Sentry from '@sentry/react-native'
import { View } from 'react-native'

export async function loader() {
  return {
    hello: 'world',
  }
}

export default function HomePage() {
  console.info('MaskedView', MaskedView)
  console.info('WebView', WebView)
  console.info('Sentry', Sentry)

  return (
    <>
      <View style={{ width: 200, height: 200, backgroundColor: 'red' }} />
    </>
  )
}
