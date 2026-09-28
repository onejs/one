import { Linking } from 'react-native'
import { One } from 'one'

// this setup file runs before the first native render in the launch-screen
// proof variant. the conformance runner supplies a link to release the hold.
One.LaunchScreen.preventAutoHide()
Linking.addEventListener('url', ({ url }) => {
  if (url === 'nativefeatures:///one-native-launch-screen?launch-screen-proof=hide')
    One.LaunchScreen.hide()
})
