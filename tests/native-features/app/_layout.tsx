import { Stack } from 'one'
import { StackToolbarProvider } from '@vxrn/native'
import { QuickNavigatePixel } from '../components/QuickNavigatePixel'

export default function Layout() {
  return (
    <StackToolbarProvider>
      <Stack screenOptions={{ headerShown: true }} />
      <QuickNavigatePixel />
    </StackToolbarProvider>
  )
}
