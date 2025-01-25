import MaskedView from '@react-native-masked-view/masked-view'
import * as Sentry from '@sentry/react-native'
import { FlashList } from '@shopify/flash-list'
import { Path } from 'react-native-svg'
import WebView from 'react-native-webview'
import { Image } from 'expo-image'

ensureExists('react-native-svg', Path)
ensureExists('expo-image', Image)
ensureExists('@react-native-masked-view/masked-view', MaskedView)
ensureExists('react-native-webview', WebView)
ensureExists('@sentry/react-native', Sentry)
ensureExists('@shopify/flash-list', FlashList)

function ensureExists(name: string, x: any) {
  if (!x) {
    throw new Error(`Doesn't exist! ${name} got ${x}`)
  }
}
