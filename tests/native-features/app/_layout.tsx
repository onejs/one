import { Stack, usePathname } from 'one'
import { useEffect } from 'react'
import { LogBox, Platform, View } from 'react-native'
import { QuickNavigatePixel } from '../components/QuickNavigatePixel'
import { SplitViewFixture } from './split-view-test'

// react native emits this debugger migration notice before the fixture mounts. expo filters the
// same notice in its development clients because it cannot open the correct javascript target.
if (__DEV__) LogBox.ignoreLogs([/Open debugger to view warnings/])

export default function Layout() {
  const pathname = usePathname()
  // home rows log their own pushes; this logs every other route change
  // (pops, replaces, deep links) so a screen that moves without a tap
  // leaves a timestamped trace in logcat.
  useEffect(() => {
    console.log('[NAV-STATE]', pathname)
  }, [pathname])
  const isSplitView = Platform.OS === 'ios' && pathname === '/split-view-test'
  return (
    <>
      <View style={{ flex: 1, display: isSplitView ? 'none' : 'flex' }}>
        <Stack screenOptions={{ headerShown: true }} />
      </View>
      {isSplitView ? <SplitViewFixture /> : null}
      {isSplitView ? null : <QuickNavigatePixel />}
    </>
  )
}
