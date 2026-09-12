import { useState } from 'react'
import { Stack } from 'one'
import { Swift, type MenuItem } from 'one-native'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'

const WALLPAPER_URL =
  'http://127.0.0.1:8127/att-03fde25274cf0f84103fe989168c0cef.jpg'

const menuItems: readonly MenuItem[] = [
  {
    type: 'action',
    id: 'favorite',
    title: 'Favorite',
    systemImage: 'heart.fill',
  },
  {
    type: 'submenu',
    id: 'appearance',
    title: 'Appearance',
    systemImage: 'paintpalette.fill',
    menuOrder: 'fixed',
    children: [
      {
        type: 'action',
        id: 'midnight',
        title: 'Midnight',
        systemImage: 'moon.stars.fill',
      },
      {
        type: 'action',
        id: 'lavender',
        title: 'Lavender',
        systemImage: 'sparkles',
      },
      {
        type: 'action',
        id: 'daylight',
        title: 'Daylight',
        systemImage: 'sun.max.fill',
      },
    ],
  },
  {
    type: 'action',
    id: 'share',
    title: 'Share Style',
    systemImage: 'square.and.arrow.up',
  },
]

const labels: Readonly<Record<string, string>> = {
  favorite: 'Favorite selected',
  midnight: 'Midnight selected',
  lavender: 'Lavender selected',
  daylight: 'Daylight selected',
  share: 'Share Style selected',
}

export default function NativeGlassMenuStudyScreen() {
  const [wallpaperLoaded, setWallpaperLoaded] = useState(false)
  const [selection, setSelection] = useState('Ready')
  const [selectionCount, setSelectionCount] = useState(0)

  return (
    <ImageBackground
      accessibilityLabel="Floral wallpaper loaded"
      onLoad={() => setWallpaperLoaded(true)}
      resizeMode="cover"
      source={{ uri: WALLPAPER_URL }}
      style={styles.wallpaper}
      testID="native-glass-menu-wallpaper"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.tint} />
      {wallpaperLoaded ? (
        <View style={styles.scene} testID="native-glass-menu-study-loaded">
          <View style={styles.receiptGroup}>
            <Text style={styles.receipt} testID="native-glass-menu-selection">
              {selection}
            </Text>
            <Text style={styles.receipt} testID="native-glass-menu-selection-count">
              Callback count: {selectionCount}
            </Text>
          </View>

          <Swift.Menu
            accessibilityLabel="Customize style"
            items={menuItems}
            menuOrder="fixed"
            onAction={(id) => {
              setSelection(labels[id])
              setSelectionCount((count) => count + 1)
            }}
          >
            <View style={styles.menuTrigger} testID="native-glass-menu-trigger">
              <Swift.Button
                accessibilityLabel="Customize style"
                buttonStyle="glassProminent"
                label={'\u200B'}
                onPress={() => undefined}
                style={styles.glassButton}
                swiftStyle={{
                  fontWeight: 'semibold',
                  height: 48,
                  padding: 8,
                  tint: '#AAB8FF',
                  width: 48,
                }}
                systemImage="wand.and.sparkles"
                testID="native-glass-menu-button"
              />
            </View>
          </Swift.Menu>
        </View>
      ) : null}
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  wallpaper: {
    flex: 1,
  },
  tint: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(9, 10, 28, 0.16)',
  },
  scene: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 184,
  },
  receiptGroup: {
    height: 2,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  receipt: {
    color: 'transparent',
    fontSize: 1,
    height: 1,
  },
  menuTrigger: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  glassButton: {
    height: 56,
    width: 56,
  },
})
