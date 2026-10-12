import { Drawer } from 'one/drawer'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        backBehavior="history"
        screenOptions={{ headerShown: false, keepMounted: true } as any}
      >
        <Drawer.Screen name="index" options={{ title: 'Counter' }} />
        <Drawer.Screen name="other" options={{ title: 'Other' }} />
      </Drawer>
    </GestureHandlerRootView>
  )
}
