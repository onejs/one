import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidNavigationBar() {
  const [tab, setTab] = useState('home')
  const [taps, setTaps] = useState(0)

  const select = (next: string) => {
    setTab(next)
    setTaps((count) => count + 1)
  }

  return (
    <One.Android.Column
      testID="one-native-android-navigation-bar-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-navigation-bar-status"
        text={`Tab: ${tab} · Taps: ${taps}`}
      />
      <One.Android.Button
        testID="one-native-android-navigation-bar-decoy"
        label="Decoy"
        variant="text"
      />
      <One.Android.NavigationBar
        testID="one-native-android-navigation-bar"
        tonalElevation={3}
        composeStyle={{ fillMaxWidth: true }}
      >
        <One.Android.NavigationBarItem
          testID="one-native-android-navigation-bar-home"
          selected={tab === 'home'}
          onClick={() => select('home')}
          label="Home"
          icon="home"
        />
        <One.Android.NavigationBarItem
          testID="one-native-android-navigation-bar-search"
          selected={tab === 'search'}
          onClick={() => select('search')}
          label="Search"
          icon="search"
        />
        <One.Android.NavigationBarItem
          testID="one-native-android-navigation-bar-favorites"
          selected={tab === 'favorites'}
          onClick={() => select('favorites')}
          label="Favorites"
          icon="favorite"
          alwaysShowLabel={false}
        />
        <One.Android.NavigationBarItem
          testID="one-native-android-navigation-bar-settings"
          selected={false}
          onClick={() => select('settings')}
          label="Settings"
          icon="settings"
          enabled={false}
        />
      </One.Android.NavigationBar>
    </One.Android.Column>
  )
}
