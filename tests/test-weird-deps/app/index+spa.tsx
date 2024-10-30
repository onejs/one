import MaskedView from '@react-native-masked-view/masked-view'
import WebView from 'react-native-webview'
import * as Sentry from '@sentry/react-native'
import { View } from 'react-native'
import { Path } from 'react-native-svg'

ensureExists('react-native-svg', Path)
ensureExists('@react-native-masked-view/masked-view', MaskedView)
ensureExists('react-native-webview', WebView)
ensureExists('@sentry/react-native', Sentry)

function ensureExists(name: string, x: any) {
  if (!x) {
    throw new Error(`Doesn't exist! ${name}`)
  }
}

export default function HomePage() {
  return (
    <>
      <View style={{ width: 200, height: 200, backgroundColor: 'red' }} />
    </>
  )
}
