import * as Linking from 'expo-linking'

export function openExternalURL(url: string): void {
  Linking.openURL(url)
}
