import { One, Stack, usePathname } from 'one'
import { use } from 'react'
import { LogBox, Platform, View } from 'react-native'
import { QuickNavigatePixel } from '../components/QuickNavigatePixel'
import { updatesBoot } from '../fixtures/updates-boot'
import { SplitViewFixture } from './split-view-test'

// react native emits this debugger migration notice before the fixture mounts. expo filters the
// same notice in its development clients because it cannot open the correct javascript target.
if (__DEV__) LogBox.ignoreLogs([/Open debugger to view warnings/])

const rootThrowDelay = updatesBoot.rootThrows
  ? new Promise((resolve) => setTimeout(resolve, 300))
  : null

export default function Layout() {
  // the updates suite's root render failure: the module loads, the render
  // suspends once, as a layout awaiting boot data does, then throws.
  if (rootThrowDelay) {
    use(rootThrowDelay)
    throw new Error('updates-suite-root-boom')
  }
  const pathname = usePathname()
  const isSplitView = Platform.OS === 'ios' && pathname === '/split-view-test'
  return (
    <>
      <View style={{ flex: 1, display: isSplitView ? 'none' : 'flex' }}>
        <Stack screenOptions={{ headerShown: true }}>
          {/* the nested stack draws its own bar */}
          <Stack.Screen name="native-screens" options={{ headerShown: false }} />
        </Stack>
      </View>
      {isSplitView ? <SplitViewFixture /> : null}
      {isSplitView ? null : <QuickNavigatePixel />}
      {/* the launch-cover proof configures a splash; its cover sits over the app until hidden */}
      {One.LaunchScreen.artworkWidth === null ? null : <One.LaunchScreen.Cover />}
    </>
  )
}
