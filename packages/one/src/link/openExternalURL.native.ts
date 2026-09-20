import { Linking } from 'react-native'

export function openExternalURL(url: string): void {
  Linking.openURL(url)
}
