import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'

export default function SettingsPage() {
  const navigation = useNavigation<DrawerNavigationProp<any>>()

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
      <Text testID="settings-title" style={{ fontSize: 24, fontWeight: 'bold' }}>
        Settings Screen
      </Text>
      <Pressable
        testID="toggle-drawer-button"
        onPress={() => navigation.toggleDrawer()}
        style={{
          backgroundColor: '#34C759',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>Toggle Drawer</Text>
      </Pressable>
    </View>
  )
}
