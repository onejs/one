import { Image, Platform, PlatformColor, StyleSheet, View } from 'react-native'
import { readLaunchScreenConfig } from './config'
import type { LaunchScreenCoverProps } from './types'

const config = readLaunchScreenConfig()

// android's launch artwork lives on a 288dp canvas the system centers.
const ANDROID_CANVAS = 288
const android = Platform.OS === 'android'

// the launch screen drawn from the bundled native resources prebuild wrote:
// the ground is the named launch color and the artwork and background image
// are the launch images, so the system's own dark variants apply and nothing
// is configured twice. the layout mirrors the storyboard and the android
// launch drawable.
export function Cover({ artwork = true, children }: LaunchScreenCoverProps) {
  if (!config) return null
  const ground = android
    ? PlatformColor('@color/splash_background')
    : PlatformColor('SplashBackground')
  const side = android ? ANDROID_CANVAS : config.width
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: ground }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {config.backgroundImage && (
        <Image
          source={{ uri: android ? 'splash_background' : 'SplashBackgroundImage' }}
          style={StyleSheet.absoluteFill}
          resizeMode={android ? 'stretch' : 'cover'}
        />
      )}
      {artwork &&
        (config.cover && !android ? (
          <Image
            source={{ uri: 'Splash' }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Image
              source={{ uri: android ? 'splash' : 'Splash' }}
              style={{ width: side, height: side }}
              resizeMode="contain"
            />
          </View>
        ))}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
})
