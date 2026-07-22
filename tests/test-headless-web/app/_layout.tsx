import { Stack } from 'one'

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="(tabs)" options={{ title: 'Tabs' }} />
    </Stack>
  )
}
