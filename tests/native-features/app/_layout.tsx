import { Stack } from 'one'
import { QuickNavigatePixel } from '../components/QuickNavigatePixel'

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: true }} />
      <QuickNavigatePixel />
    </>
  )
}
