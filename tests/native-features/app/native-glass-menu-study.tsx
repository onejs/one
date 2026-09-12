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
          <View style={styles.status}>
            <Text style={styles.statusKicker}>STYLE</Text>
            <Text style={styles.statusValue} testID="native-glass-menu-selection">
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
                label="Customize"
                onPress={() => undefined}
                style={styles.glassButton}
                swiftStyle={{
                  fontWeight: 'semibold',
                  padding: 8,
                  tint: '#AAB8FF',
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
  status: {
    alignItems: 'center',
    marginBottom: 18,
    minHeight: 60,
  },
  statusKicker: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(7, 8, 30, 0.62)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  receipt: {
    color: 'transparent',
    fontSize: 1,
    height: 1,
  },
  menuTrigger: {
    alignItems: 'center',
    height: 62,
    justifyContent: 'center',
    width: 190,
  },
  glassButton: {
    width: 180,
  },
})
