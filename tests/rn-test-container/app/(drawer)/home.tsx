import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'

export default function HomePage() {
  const navigation = useNavigation<DrawerNavigationProp<any>>()

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
      <Text testID="home-title" style={{ fontSize: 24, fontWeight: 'bold' }}>
        Home Screen
      </Text>
      <Pressable
        testID="open-drawer-button"
        onPress={() => navigation.openDrawer()}
        style={{
          backgroundColor: '#007AFF',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>Open Drawer</Text>
      </Pressable>
    </View>
  )
}
