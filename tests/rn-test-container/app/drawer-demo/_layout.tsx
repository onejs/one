import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Drawer } from 'one/drawer'

export default function DrawerDemoLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: true,
          drawerType: 'front',
          // improve gesture feel
          swipeEdgeWidth: 80, // wider edge for easier swipe (default 32)
          swipeMinDistance: 20, // lower threshold to start (default 60)
        }}
      >
        <Drawer.Screen name="index" options={{ drawerLabel: 'Home', title: 'Home' }} />
        <Drawer.Screen name="settings" options={{ drawerLabel: 'Settings', title: 'Settings' }} />
      </Drawer>
    </GestureHandlerRootView>
  )
}
