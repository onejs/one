import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Drawer } from 'one/drawer'

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: true,
          drawerType: 'front',
        }}
      >
        <Drawer.Screen name="home" options={{ drawerLabel: 'Home', title: 'Home' }} />
        <Drawer.Screen
          name="settings"
          options={{ drawerLabel: 'Settings', title: 'Settings' }}
        />
      </Drawer>
    </GestureHandlerRootView>
  )
}
