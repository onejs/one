import { Stack } from 'one'
import { ShellProvider } from '../probe/shell'

export default function Layout() {
  return <ShellProvider><Stack>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="controls" options={{ title: 'Controls' }} />
    <Stack.Screen name="tabs" options={{ headerShown: false }} />
    <Stack.Screen name="sidebar" options={{ headerShown: false }} />
    <Stack.Screen name="detail" options={{ title: 'Detail' }} />
  </Stack></ShellProvider>
}
