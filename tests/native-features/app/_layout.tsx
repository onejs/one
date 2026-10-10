import { Stack, usePathname } from 'one'
import { LogBox, Platform } from 'react-native'
import { QuickNavigatePixel } from '../components/QuickNavigatePixel'
import SplitViewTestScreen from './split-view-test'

// react native emits this debugger migration notice before the fixture mounts. expo filters the
// same notice in its development clients because it cannot open the correct javascript target.
if (__DEV__) LogBox.ignoreLogs([/Open debugger to view warnings/])

export default function Layout() {
  const pathname = usePathname()
  const isSplitViewTest = Platform.OS === 'ios' && pathname === '/split-view-test'

  return (
    <>
      {isSplitViewTest ? (
        <SplitViewTestScreen />
      ) : (
        <Stack screenOptions={{ headerShown: true }} />
      )}
      <QuickNavigatePixel />
    </>
  )
}
