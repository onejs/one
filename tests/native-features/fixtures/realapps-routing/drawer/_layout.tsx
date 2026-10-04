import { Drawer } from 'one/drawer'
export default function Layout() {
  return (
    <Drawer
      backBehavior="history"
      screenOptions={{ headerShown: false, keepMounted: true } as any}
    >
      <Drawer.Screen name="index" options={{ title: 'Counter' }} />
      <Drawer.Screen name="other" options={{ title: 'Other' }} />
    </Drawer>
  )
}
