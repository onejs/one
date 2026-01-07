import { Slot } from 'one'
import { Platform } from 'react-native'

export default function Layout() {
  if (Platform.OS === 'web') {
    return (
      <html lang="en-US">
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <link rel="icon" href="/favicon.svg" />

        <Slot />
      </html>
    )
  }

  return <Slot />
}
