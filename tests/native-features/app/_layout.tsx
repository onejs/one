import { Stack } from 'one'
import { LogBox } from 'react-native'
import { QuickNavigatePixel } from '../components/QuickNavigatePixel'

// react native emits this debugger migration notice before the fixture mounts. expo filters the
// same notice in its development clients because it cannot open the correct javascript target.
if (__DEV__) LogBox.ignoreLogs([/Open debugger to view warnings/])

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: true }} />
      <QuickNavigatePixel />
    </>
  )
}
